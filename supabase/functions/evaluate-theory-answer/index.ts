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
    const { question, model_answer, key_points, student_answer, marks } = await req.json();

    if (!question || !student_answer) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an experienced university lecturer grading written exam answers for Nigerian university students. Be fair, encouraging, and precise. Score on a 0-100 scale based on coverage of key points, clarity, structure, and depth.`;

    const userPrompt = `QUESTION (${marks ?? 10} marks):
${question}

${model_answer ? `MODEL ANSWER:\n${model_answer}\n` : ""}
${Array.isArray(key_points) && key_points.length ? `KEY POINTS EXPECTED:\n${key_points.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}\n` : ""}

STUDENT ANSWER:
${student_answer}

Evaluate the student's answer thoroughly.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_evaluation",
              description: "Submit grading evaluation for the student's answer",
              parameters: {
                type: "object",
                properties: {
                  score: { type: "number", description: "Overall score 0-100" },
                  coverage: {
                    type: "object",
                    properties: {
                      points_hit: { type: "array", items: { type: "string" } },
                      points_missed: { type: "array", items: { type: "string" } },
                    },
                    required: ["points_hit", "points_missed"],
                  },
                  strengths: { type: "array", items: { type: "string" }, description: "What the student did well" },
                  improvements: { type: "array", items: { type: "string" }, description: "What needs improvement" },
                  better_answer_outline: { type: "string", description: "Brief outline of how to structure a top-tier answer" },
                  overall_feedback: { type: "string", description: "1-2 sentence summary feedback" },
                },
                required: ["score", "coverage", "strengths", "improvements", "better_answer_outline", "overall_feedback"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_evaluation" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No evaluation returned from AI");

    const evaluation = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ evaluation }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("evaluate-theory-answer error:", error);
    const msg = error instanceof Error ? error.message : "Failed to evaluate answer";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
