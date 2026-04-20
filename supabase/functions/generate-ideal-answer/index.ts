import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, mode, marks, context } = await req.json();
    if (!question) {
      return new Response(JSON.stringify({ error: "Missing question" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const styleInstructions: Record<string, string> = {
      ideal: "Write a complete academic answer with clear Introduction, Body (with subheadings if useful), and Conclusion. Use precise terminology a lecturer expects. Aim for depth.",
      simplified: "Write a clear, simplified answer in plain English that any student can understand. Keep it concise.",
      bullets: "Provide an exam-ready bullet-point answer. Group points under short headers (Definition, Key Points, Example, Conclusion).",
    };

    const style = styleInstructions[mode] ?? styleInstructions.ideal;

    const systemPrompt = `You are an expert university lecturer writing model exam answers for Nigerian university students. Your answers should be accurate, well-structured, and worthy of full marks. ${style}`;

    const userPrompt = `QUESTION (${marks ?? 10} marks):
${question}
${context ? `\nCONTEXT: ${context}` : ""}

Write the ${mode === "bullets" ? "bullet-point" : mode === "simplified" ? "simplified" : "ideal"} answer now.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "Unable to generate answer.";

    return new Response(JSON.stringify({ answer }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("generate-ideal-answer error:", error);
    const msg = error instanceof Error ? error.message : "Failed to generate answer";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
