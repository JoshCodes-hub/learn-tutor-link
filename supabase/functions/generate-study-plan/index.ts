import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { academic_path, target, weak_topics = [], strong_topics = [], days = 7, subjects = [] } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const tone =
      academic_path === "secondary"
        ? "Friendly coach, simple language for a teen student. Use emojis sparingly."
        : academic_path === "jamb"
        ? "Sharp, exam-focused, fast-paced. JAMB CBT urgency."
        : "Senior academic strategist. University-level rigor.";

    const system = `You are an exam strategy engine. Build a ${days}-day study plan as STRICT JSON only.
Tone: ${tone}
Schema: { "summary": string, "what_to_read": string[], "what_to_skip": string[], "days": [ { "day": number, "focus": string, "tasks": string[], "estimated_minutes": number } ] }`;

    const user = `Academic path: ${academic_path}
Target: ${target || "general improvement"}
Subjects: ${subjects.join(", ") || "n/a"}
Weak topics: ${weak_topics.join(", ") || "none reported"}
Strong topics: ${strong_topics.join(", ") || "none reported"}
Generate the plan now.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (res.status === 402) return new Response(JSON.stringify({ error: "Payment required - add credits" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!res.ok) throw new Error(`AI gateway error ${res.status}`);

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let plan;
    try {
      plan = JSON.parse(content);
    } catch {
      plan = { summary: content, what_to_read: [], what_to_skip: [], days: [] };
    }

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
