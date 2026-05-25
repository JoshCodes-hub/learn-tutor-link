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

    const systemPrompt = `You are a senior Nigerian university lecturer coaching a 300L–500L student to upgrade their written exam answer. Your job is NOT to rewrite the entire answer — give the student a sharper, exam-ready improved version PLUS a short list of specific edits they should make. Preserve the student's voice and structure where possible. Be concrete: quote phrases to add/replace.`;

    const userPrompt = `QUESTION (${marks ?? 10} marks):
${question}

${model_answer ? `MODEL ANSWER (reference, do not copy):\n${model_answer}\n` : ""}
${Array.isArray(key_points) && key_points.length ? `KEY POINTS EXPECTED:\n${key_points.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}\n` : ""}

STUDENT'S CURRENT ANSWER:
${student_answer}

Produce the improved answer + edit suggestions.`;

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
              name: "submit_improvement",
              description: "Submit improved version of the student's answer with edit suggestions",
              parameters: {
                type: "object",
                properties: {
                  improved_answer: { type: "string", description: "The upgraded version of the student's answer (full text)" },
                  edits: {
                    type: "array",
                    description: "Specific edit suggestions",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["add", "replace", "remove", "restructure"] },
                        location: { type: "string", description: "Where in the answer (e.g. 'introduction', 'second paragraph')" },
                        suggestion: { type: "string", description: "The concrete change to make" },
                      },
                      required: ["type", "location", "suggestion"],
                    },
                  },
                  rationale: { type: "string", description: "1-2 sentence explanation of why these changes raise the grade" },
                },
                required: ["improved_answer", "edits", "rationale"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_improvement" } },
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
    if (!toolCall) throw new Error("No improvement returned from AI");

    const improvement = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ improvement }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("improve-theory-answer error:", error);
    const msg = error instanceof Error ? error.message : "Failed to improve answer";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
