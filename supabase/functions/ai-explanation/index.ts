import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const buckets = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 60;
const WINDOW_MS = 60_000;
function checkLimit(key: string): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) { buckets.set(key, { count: 1, resetAt: now + WINDOW_MS }); return true; }
  if (b.count >= LIMIT) return false;
  b.count++; return true;
}

const BodySchema = z.object({
  question: z.string().min(1).max(4000),
  options: z.object({
    A: z.string().max(1000),
    B: z.string().max(1000),
    C: z.string().max(1000),
    D: z.string().max(1000),
  }),
  correctOption: z.enum(["A", "B", "C", "D"]),
  userAnswer: z.enum(["A", "B", "C", "D"]).nullable().optional(),
  topic: z.string().max(200).nullable().optional(),
  tone: z.enum(["simple", "deep", "default"]).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let callerKey = req.headers.get("x-forwarded-for") || "anon";
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data } = await supabase.auth.getUser();
        if (data.user) callerKey = `u:${data.user.id}`;
      } catch (_) { /* ignore */ }
    }
    if (!checkLimit(callerKey)) {
      return new Response(
        JSON.stringify({ error: "Too many explanation requests. Please wait a minute." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { question, options, correctOption, userAnswer, topic, tone } = parsed.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const toneInstructions: Record<string, string> = {
      simple: "You are explaining to a 12-year-old. Use very simple words, short sentences, fun analogies (food, football, everyday Nigerian life). Avoid jargon completely. Keep it under 150 words and make it feel friendly.",
      deep: "You are a university lecturer. Provide a rigorous, structured explanation with proper terminology, derivations or proofs where applicable, and references to broader concepts. Aim for depth (250-300 words).",
      default: "Explanations should be clear and easy to understand, step-by-step when needed, include relevant formulas or concepts, and be encouraging. Concise but thorough (max 200 words).",
    };
    const toneRule = toneInstructions[tone as string] ?? toneInstructions.default;
    const systemPrompt = `You are an expert tutor helping Nigerian students understand exam questions. ${toneRule}`;

    const userPrompt = `Question: ${question}

Options:
A. ${options.A}
B. ${options.B}
C. ${options.C}
D. ${options.D}

Correct Answer: ${correctOption}
${userAnswer ? `Student's Answer: ${userAnswer}` : ""}
${topic ? `Topic: ${topic}` : ""}

Please explain why option ${correctOption} is correct${userAnswer && userAnswer !== correctOption ? ` and why option ${userAnswer} is incorrect` : ""}. Include any relevant concepts, formulas, or reasoning steps.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const explanation = data.choices?.[0]?.message?.content || "Unable to generate explanation.";

    return new Response(JSON.stringify({ explanation }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("Error in ai-explanation function:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate explanation";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
