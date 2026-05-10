// Tutor flashcard generator. Takes raw text or content, returns JSON flashcards.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, count = 12, topic_title } = await req.json() as {
      content: string;
      count?: number;
      topic_title?: string;
    };

    if (!content || content.trim().length < 30) {
      return new Response(JSON.stringify({ error: "content too short (min 30 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const trimmed = content.slice(0, 24000);
    const n = Math.max(4, Math.min(30, count));

    const prompt = `You are an exam-prep tutor. Generate ${n} high-quality flashcards from the material below${topic_title ? ` for topic "${topic_title}"` : ""}.
Return STRICT JSON only — an array of objects: [{ "question": string, "answer": string }]. No prose, no markdown fences.

MATERIAL:
${trimmed}`;

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
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "credits_exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error ${aiRes.status}: ${txt}`);
    }

    const json = await aiRes.json();
    const text: string = json?.choices?.[0]?.message?.content ?? "";
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

    let cards: Array<{ question: string; answer: string }> = [];
    try { cards = JSON.parse(cleaned); } catch {
      const m = cleaned.match(/\[[\s\S]*\]/);
      if (m) cards = JSON.parse(m[0]);
    }
    if (!Array.isArray(cards)) cards = [];
    cards = cards
      .filter(c => c && typeof c.question === "string" && typeof c.answer === "string")
      .slice(0, n);

    return new Response(JSON.stringify({ flashcards: cards }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-tutor-flashcards error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
