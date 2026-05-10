// Summarizes a chat/brainstorm thread into study notes or flashcards, with citations.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Length = "short" | "medium" | "long";

const lengthSpec: Record<Length, { words: number; bullets: number; cards: number; label: string }> = {
  short:  { words: 200, bullets: 4,  cards: 6,  label: "short (~200 words / 4 key points / 6 cards)" },
  medium: { words: 450, bullets: 7,  cards: 10, label: "medium (~450 words / 7 key points / 10 cards)" },
  long:   { words: 800, bullets: 12, cards: 15, label: "long (~800 words / 12 key points / 15 cards)" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as {
      thread_id: string;
      mode?: "notes" | "flashcards";
      length?: Length;
    };
    const thread_id = body.thread_id;
    const mode = body.mode ?? "notes";
    const length: Length = (["short", "medium", "long"] as const).includes(body.length as Length)
      ? body.length as Length
      : "medium";

    if (!thread_id) {
      return new Response(JSON.stringify({ error: "missing thread_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: mem } = await admin
      .from("chat_thread_members")
      .select("user_id")
      .eq("thread_id", thread_id).eq("user_id", user.id).maybeSingle();
    if (!mem) {
      return new Response(JSON.stringify({ error: "not a member" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: thread } = await admin
      .from("chat_threads").select("title").eq("id", thread_id).maybeSingle();

    const { data: msgs } = await admin
      .from("chat_messages")
      .select("id, is_ai, content, created_at, author_id")
      .eq("thread_id", thread_id)
      .order("created_at", { ascending: true })
      .limit(300);

    const rows = msgs ?? [];

    // Profile lookup for author names
    const authorIds = Array.from(new Set(rows.map(r => r.author_id).filter(Boolean) as string[]));
    const { data: profs } = authorIds.length
      ? await admin.from("profiles").select("user_id, full_name").in("user_id", authorIds)
      : { data: [] as any[] };
    const nameOf = new Map((profs ?? []).map((p: any) => [p.user_id, p.full_name as string]));

    // Build numbered, indexed transcript; cap at 24k chars
    const refs: { n: number; id: string; author: string; excerpt: string }[] = [];
    let transcript = "";
    rows.forEach((m, i) => {
      const n = i + 1;
      const author = m.is_ai ? "AI" : (nameOf.get(m.author_id ?? "") || "Member");
      const line = `[${n}] ${author}: ${m.content}\n`;
      if (transcript.length + line.length > 24000) return;
      transcript += line;
      refs.push({
        n, id: m.id, author,
        excerpt: (m.content ?? "").slice(0, 220),
      });
    });

    if (transcript.length < 50) {
      return new Response(JSON.stringify({ error: "thread too short to summarize" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const spec = lengthSpec[length];
    const isCards = mode === "flashcards";

    const prompt = isCards
      ? `From the brainstorm transcript below, generate exactly ${spec.cards} high-quality flashcards. Each card MUST cite the message numbers it draws from.
Return STRICT JSON only, no prose, no markdown fences:
{"flashcards":[{"question":"...","answer":"...","citations":[<message numbers>]}]}

Rules:
- Use only facts present in the transcript.
- "citations" must be an array of integers referencing the [N] tags.
- Each card cites at least 1 message, max 4.

TRANSCRIPT (each line is "[N] Author: text"):
${transcript}`
      : `From the brainstorm transcript below, write ${spec.label} study notes for "${thread?.title ?? "this discussion"}".
Return STRICT JSON only, no prose, no markdown fences:
{
  "notes_md": "<markdown body, H2 sections, ~${spec.words} words, exam-focused>",
  "key_points": [{"text":"...", "citations":[<message numbers>]}]
}

Rules:
- Provide exactly ${spec.bullets} key_points.
- Inside notes_md, append inline citations like [^1] [^3] after sentences they support.
- "citations" arrays must reference [N] tags from the transcript.
- Each key point cites at least 1 message, max 4.
- Use only facts present in the transcript.

TRANSCRIPT (each line is "[N] Author: text"):
${transcript}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
      return new Response(JSON.stringify({
        error: aiRes.status === 429 ? "rate_limited" : aiRes.status === 402 ? "credits_exhausted" : "ai_error",
        detail: txt,
      }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = await aiRes.json();
    const text: string = json?.choices?.[0]?.message?.content ?? "";
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

    let parsed: any = {};
    try { parsed = JSON.parse(cleaned); } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch { /* ignore */ } }
    }

    // Trim references to only those actually cited (keeps payload small)
    const usedNums = new Set<number>();
    const collect = (arr?: any[]) => (arr ?? []).forEach((c: any) => (c?.citations ?? []).forEach((n: number) => {
      if (Number.isInteger(n)) usedNums.add(n);
    }));
    if (isCards) collect(parsed?.flashcards);
    else collect(parsed?.key_points);
    const usedRefs = refs.filter(r => usedNums.has(r.n));

    if (isCards) {
      const cards = (Array.isArray(parsed?.flashcards) ? parsed.flashcards : [])
        .filter((c: any) => c?.question && c?.answer)
        .map((c: any) => ({
          question: String(c.question),
          answer: String(c.answer),
          citations: Array.isArray(c.citations) ? c.citations.filter(Number.isInteger) : [],
        }));
      return new Response(JSON.stringify({
        mode: "flashcards", length, flashcards: cards, references: usedRefs,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const notes_md: string = typeof parsed?.notes_md === "string" ? parsed.notes_md : "";
    const key_points = (Array.isArray(parsed?.key_points) ? parsed.key_points : [])
      .filter((k: any) => k?.text)
      .map((k: any) => ({
        text: String(k.text),
        citations: Array.isArray(k.citations) ? k.citations.filter(Number.isInteger) : [],
      }));

    return new Response(JSON.stringify({
      mode: "notes", length, notes: notes_md, key_points, references: usedRefs,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("summarize-thread error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
