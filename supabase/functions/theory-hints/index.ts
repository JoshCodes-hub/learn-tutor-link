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
    const { question, model_answer, key_points, marks } = await req.json();
    if (!question) {
      return new Response(JSON.stringify({ error: "Missing question" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a supportive Nigerian university tutor. Generate exactly 3 PROGRESSIVE hints that scaffold a student toward the answer WITHOUT giving it away. Hint 1 = nudge (point to the right framework/topic). Hint 2 = structure (suggest paragraph layout & key terms). Hint 3 = direction (list 2-3 specific points to discuss, but NOT the full answer). Keep each hint 1-2 sentences. Be encouraging.`;

    const userPrompt = `QUESTION (${marks ?? 10} marks):\n${question}\n\n${model_answer ? `MODEL ANSWER (for your reference, do NOT reveal):\n${model_answer}\n` : ""}${Array.isArray(key_points) && key_points.length ? `KEY POINTS (for your reference, do NOT reveal):\n${key_points.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}` : ""}`;

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
            name: "submit_hints",
            description: "Submit 3 progressive hints",
            parameters: {
              type: "object",
              properties: {
                hints: {
                  type: "array",
                  description: "Exactly 3 progressive hints, ordered from gentle nudge to specific direction",
                  items: {
                    type: "object",
                    properties: {
                      level: { type: "string", enum: ["nudge", "structure", "direction"] },
                      title: { type: "string", description: "Short label, e.g. 'Think about...'" },
                      content: { type: "string", description: "The hint itself (1-2 sentences)" },
                    },
                    required: ["level", "title", "content"],
                  },
                },
              },
              required: ["hints"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_hints" } },
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
    if (!toolCall) throw new Error("No hints returned");
    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ hints: parsed.hints }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("theory-hints error:", error);
    const msg = error instanceof Error ? error.message : "Failed to generate hints";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
