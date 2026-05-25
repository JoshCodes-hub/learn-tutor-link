// Library AI: generate flashcards / summary / quiz from extracted text.
// Uses Lovable AI Gateway with strict tool-calling for JSON output.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const MAX_INPUT_CHARS = 30000;
import { requireUser } from "../_shared/auth.ts";

type Action = "flashcards" | "summary" | "quiz";

function bad(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildToolForAction(action: Action, count: number) {
  if (action === "flashcards") {
    return {
      name: "emit_flashcards",
      description: "Return high-quality study flashcards for the provided material.",
      parameters: {
        type: "object",
        properties: {
          cards: {
            type: "array",
            minItems: 1,
            maxItems: 50,
            items: {
              type: "object",
              properties: {
                front: { type: "string", description: "Concise question, term, or prompt" },
                back: { type: "string", description: "Clear answer or definition" },
                hint: { type: "string", description: "Optional one-line hint" },
              },
              required: ["front", "back"],
              additionalProperties: false,
            },
          },
        },
        required: ["cards"],
        additionalProperties: false,
      },
    };
  }
  if (action === "summary") {
    return {
      name: "emit_summary",
      description: "Return a concise study brief.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          overview: { type: "string", description: "2-3 sentence overview written in clear plain English" },
          sections: {
            type: "array",
            minItems: 2,
            maxItems: 6,
            description: "Topic-grouped breakdown of the material",
            items: {
              type: "object",
              properties: {
                heading: { type: "string" },
                bullets: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 8 },
              },
              required: ["heading", "bullets"],
              additionalProperties: false,
            },
          },
          key_points: { type: "array", items: { type: "string" }, minItems: 5, maxItems: 12 },
          formulas_or_definitions: { type: "array", items: { type: "string" }, maxItems: 10 },
          must_know: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 10 },
          exam_tips: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
        },
        required: ["title", "overview", "sections", "key_points", "must_know", "exam_tips"],
        additionalProperties: false,
      },
    };
  }
  // quiz
  return {
    name: "emit_quiz",
    description: `Return ${count} multiple-choice questions.`,
    parameters: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          minItems: 1,
          maxItems: 30,
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
              correct_index: { type: "integer", minimum: 0, maximum: 3 },
              explanation: { type: "string" },
            },
            required: ["question", "options", "correct_index", "explanation"],
            additionalProperties: false,
          },
        },
      },
      required: ["questions"],
      additionalProperties: false,
    },
  };
}

function systemPromptFor(action: Action, difficulty: string, count: number) {
  if (action === "flashcards") {
    return `You are an expert study coach. Create ${count} high-quality ${difficulty} flashcards from the user's course material. Cover the most important concepts evenly. Keep front under 120 chars, back under 240 chars. Use plain text, no markdown.`;
  }
  if (action === "summary") {
    return "You are an elite university study coach. Produce a tight, exam-ready brief that is STRUCTURED, not a wall of text. Group the material into 2–6 topic sections with concise bullet points (max 18 words each). Pull out key definitions and any formulas verbatim. End with a short list of practical exam tips. Use clean plain English — no markdown symbols, no asterisks, no emojis.";
  }
  return `You are an exam writer. Create ${count} ${difficulty} multiple-choice questions from the course material. Each question must have exactly 4 options with one correct answer. Provide a brief explanation. Plain text only.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const guard = await requireUser(req, corsHeaders);
    if (guard instanceof Response) return guard;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return bad(500, "LOVABLE_API_KEY is not configured");

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return bad(400, "Invalid JSON body");

    const action = body.action as Action;
    const text = typeof body.text === "string" ? body.text : "";
    const title = typeof body.title === "string" ? body.title : "Course Material";
    const difficulty = ["easy", "medium", "hard"].includes(body.difficulty) ? body.difficulty : "medium";
    const count = Math.min(Math.max(parseInt(body.count, 10) || 15, 1), 30);

    if (!["flashcards", "summary", "quiz"].includes(action)) return bad(400, "Invalid action");
    if (!text || text.length < 50) return bad(400, "Not enough text to work with (need at least 50 chars).");

    const trimmed = text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text;
    const tool = buildToolForAction(action, count);

    const aiResp = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPromptFor(action, difficulty, count) },
          { role: "user", content: `Title: ${title}\n\nMaterial:\n${trimmed}` },
        ],
        tools: [{ type: "function", function: tool }],
        tool_choice: { type: "function", function: { name: tool.name } },
      }),
    });

    if (aiResp.status === 429) return bad(429, "Too many requests. Please wait a moment and try again.");
    if (aiResp.status === 402) return bad(402, "AI credits exhausted. Add credits in Settings → Workspace → Usage.");
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return bad(500, "AI gateway error");
    }

    const json = await aiResp.json();
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) return bad(500, "AI returned no structured output");
    let parsed: any;
    try { parsed = JSON.parse(call.function.arguments); } catch {
      return bad(500, "AI returned malformed JSON");
    }

    return new Response(JSON.stringify({ action, result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("library-ai error", e);
    return bad(500, e instanceof Error ? e.message : "Unknown error");
  }
});