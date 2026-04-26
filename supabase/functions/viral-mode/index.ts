import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODE_PROMPTS: Record<string, string> = {
  "exam-tomorrow": `You are CRAM MODE. The student's exam is TOMORROW. Output STRICT JSON:
{ "title": "Cram Mode", "top_questions": [ { "q": string, "answer": string } ] (exactly 20), "cheat_sheet": string[] (one-page bullet points, max 15) }`,
  "can-i-pass": `You are READINESS PREDICTOR. Use the user's recent metrics to score 0-100 likelihood of passing. Output STRICT JSON:
{ "score": number, "verdict": "Pass"|"Borderline"|"At Risk", "headline": string, "reasons": string[], "next_steps": string[] }`,
  "two-hours-left": `You are LAST 2 HOURS coach. Output STRICT JSON with bite-sized tips:
{ "title": "2 Hours Left", "tips": [ { "subject": string, "tip": string, "minutes": number } ] (6-10 items) }`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, academic_path = "university", subjects = [], target = "", recent_score = null, weak_topics = [] } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
    const prompt = MODE_PROMPTS[mode];
    if (!prompt) throw new Error("Invalid mode");

    const userMsg = `Academic path: ${academic_path}
Target: ${target}
Subjects: ${subjects.join(", ")}
Recent average score: ${recent_score ?? "unknown"}
Weak topics: ${weak_topics.join(", ") || "none"}
Generate now as JSON only.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (res.status === 402) return new Response(JSON.stringify({ error: "Payment required - add credits" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!res.ok) throw new Error(`AI gateway error ${res.status}`);

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let result;
    try { result = JSON.parse(content); } catch { result = { raw: content }; }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
