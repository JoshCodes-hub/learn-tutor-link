import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const guard = await requireUser(req, corsHeaders);
    if (guard instanceof Response) return guard;
    const { question, student_answer, evaluation, model_answer, marks } = await req.json();
    if (!question || !student_answer || !evaluation) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a Nigerian university lecturer giving a step-by-step grading walkthrough to a 300L-500L student. Walk them through their answer paragraph by paragraph, explaining what worked, what was missing, and how each rubric criterion (Content, Structure, Examples, Conclusion) was scored. Be precise, kind, and instructive. Output 4-7 numbered steps.`;

    const userPrompt = `QUESTION (${marks ?? 10} marks):\n${question}\n\nSTUDENT ANSWER:\n${student_answer}\n\nGRADING RESULT:\n- Overall: ${evaluation.score}/100\n${evaluation.rubric ? `- Content: ${evaluation.rubric.content?.score}/25 — ${evaluation.rubric.content?.comment}\n- Structure: ${evaluation.rubric.structure?.score}/25 — ${evaluation.rubric.structure?.comment}\n- Examples: ${evaluation.rubric.examples?.score}/25 — ${evaluation.rubric.examples?.comment}\n- Conclusion: ${evaluation.rubric.conclusion?.score}/25 — ${evaluation.rubric.conclusion?.comment}` : ""}\n\n${model_answer ? `MODEL ANSWER:\n${model_answer}` : ""}\n\nGive a step-by-step walkthrough.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_walkthrough",
            description: "Submit step-by-step grading walkthrough",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "1-sentence overall summary" },
                steps: {
                  type: "array",
                  description: "4-7 ordered walkthrough steps",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Short step heading" },
                      explanation: { type: "string", description: "2-4 sentence explanation tying back to the student's answer" },
                      tag: { type: "string", enum: ["strength", "gap", "tip", "info"], description: "Visual category" },
                    },
                    required: ["title", "explanation", "tag"],
                  },
                },
                next_focus: { type: "string", description: "1-2 sentence suggestion of what to focus on next time" },
              },
              required: ["summary", "steps", "next_focus"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_walkthrough" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No walkthrough returned");
    const walkthrough = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ walkthrough }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("explain-theory-evaluation error:", error);
    const msg = error instanceof Error ? error.message : "Failed to generate walkthrough";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
