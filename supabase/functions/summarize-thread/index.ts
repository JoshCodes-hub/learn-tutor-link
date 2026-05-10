// Summarizes a chat/brainstorm thread into study notes or flashcards.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { thread_id, mode = "notes" } = await req.json() as {
      thread_id: string;
      mode?: "notes" | "flashcards";
    };
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
      .select("is_ai, content, created_at, author_id")
      .eq("thread_id", thread_id)
      .order("created_at", { ascending: true })
      .limit(300);

    const transcript = (msgs ?? []).map(m =>
      `${m.is_ai ? "AI" : "Member"}: ${m.content}`
    ).join("\n").slice(0, 24000);

    if (transcript.length < 50) {
      return new Response(JSON.stringify({ error: "thread too short to summarize" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isCards = mode === "flashcards";
    const prompt = isCards
      ? `From the brainstorm transcript below, generate 8-15 high-quality flashcards. Return STRICT JSON array only: [{"question":"...","answer":"..."}]. No prose, no markdown fences.\n\nTRANSCRIPT:\n${transcript}`
      : `From the brainstorm transcript below, write concise study notes in markdown for "${thread?.title ?? "this discussion"}". Use H2 sections, bullet points, and a short "Key takeaways" list at the end. Be exam-focused and under 600 words.\n\nTRANSCRIPT:\n${transcript}`;

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

    if (isCards) {
      const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      let cards: Array<{ question: string; answer: string }> = [];
      try { cards = JSON.parse(cleaned); } catch {
        const m = cleaned.match(/\[[\s\S]*\]/);
        if (m) cards = JSON.parse(m[0]);
      }
      cards = (Array.isArray(cards) ? cards : [])
        .filter(c => c?.question && c?.answer);
      return new Response(JSON.stringify({ mode: "flashcards", flashcards: cards }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ mode: "notes", notes: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize-thread error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
