import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, academic_path = "university" } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const persona =
      academic_path === "secondary"
        ? "You are OverraPrep AI Tutor for a Secondary School student (JSS/SSS). Explain like the student is 12. Use short sentences, real-life Nigerian examples, and analogies."
        : academic_path === "jamb"
        ? "You are OverraPrep AI Tutor for a JAMB/UTME candidate. Be sharp, fast, exam-focused. Cite shortcuts, eliminate options, and emphasise CBT timing."
        : "You are OverraPrep AI Tutor for a Nigerian University student. Use rigorous academic depth, proper terminology, definitions and theory frameworks.";

    const system = `${persona}\nAlways stay encouraging. Use markdown. Keep responses focused and end with a quick check-for-understanding question.`;

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    if (upstream.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (upstream.status === 402) return new Response(JSON.stringify({ error: "Payment required - add credits" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!upstream.ok || !upstream.body) throw new Error(`AI gateway error ${upstream.status}`);

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
