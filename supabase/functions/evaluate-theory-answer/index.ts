import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const guard = await requireUser(req, corsHeaders);
    if (guard instanceof Response) return guard;
    const { question, model_answer, key_points, student_answer, marks } = await req.json();

    if (!question || !student_answer) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an experienced Nigerian university lecturer grading written exam answers for 300L–500L students. Be fair, encouraging, and precise. Grade across four rubric criteria — Content (knowledge accuracy & depth), Structure (logical flow, intro/body/conclusion), Examples (relevant illustrations, citations, real-world cases), and Conclusion (synthesis & closing). Each criterion is scored 0–25; the overall score is their sum (0–100).`;

    const userPrompt = `QUESTION (${marks ?? 10} marks):
${question}

${model_answer ? `MODEL ANSWER:\n${model_answer}\n` : ""}
${Array.isArray(key_points) && key_points.length ? `KEY POINTS EXPECTED:\n${key_points.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}\n` : ""}

STUDENT ANSWER:
${student_answer}

Evaluate the student's answer thoroughly using the 4-criterion rubric.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
                  score: { type: "number", description: "Overall score 0-100 (sum of 4 rubric criteria)" },
                  rubric: {
                    type: "object",
                    description: "Per-criterion scores out of 25 with brief justification",
                    properties: {
                      content: {
                        type: "object",
                        properties: {
                          score: { type: "number", description: "0-25" },
                          comment: { type: "string", description: "1 sentence on knowledge accuracy & depth" },
                        },
                        required: ["score", "comment"],
                      },
                      structure: {
                        type: "object",
                        properties: {
                          score: { type: "number", description: "0-25" },
                          comment: { type: "string", description: "1 sentence on logical flow / intro-body-conclusion" },
                        },
                        required: ["score", "comment"],
                      },
                      examples: {
                        type: "object",
                        properties: {
                          score: { type: "number", description: "0-25" },
                          comment: { type: "string", description: "1 sentence on use of examples / citations" },
                        },
                        required: ["score", "comment"],
                      },
                      conclusion: {
                        type: "object",
                        properties: {
                          score: { type: "number", description: "0-25" },
                          comment: { type: "string", description: "1 sentence on synthesis / closing" },
                        },
                        required: ["score", "comment"],
                      },
                    },
                    required: ["content", "structure", "examples", "conclusion"],
                  },
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
                required: ["score", "rubric", "coverage", "strengths", "improvements", "better_answer_outline", "overall_feedback"],
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
