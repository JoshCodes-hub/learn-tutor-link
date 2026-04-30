import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Material {
  title: string;
  description?: string | null;
  file_type?: string | null;
  tutor_name?: string | null;
  tutor_id?: string | null;
}
interface Msg { role: "user" | "assistant"; content: string }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, course, materials, mode, action, verifiedOnly } = await req.json() as {
      messages: Msg[];
      course?: { code?: string; name?: string };
      materials?: Material[];
      mode?: "study_hub" | "theory";
      action?: "chat" | "flashcards";
      verifiedOnly?: boolean;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Missing messages" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const matList = (materials ?? [])
      .slice(0, 30)
      .map((m, i) => `${i + 1}. ${m.title}${m.description ? ` — ${m.description}` : ""}${m.file_type ? ` [${m.file_type}]` : ""}${m.tutor_name ? ` (by Tutor: ${m.tutor_name})` : ""}`)
      .join("\n");

    const courseLine = course?.code || course?.name
      ? `Course: ${course?.code ?? ""} ${course?.name ?? ""}`.trim()
      : "Course: (unspecified)";

    // Flashcard generation path — non-streaming structured output
    if (action === "flashcards") {
      const sessionText = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n").slice(0, 12000);
      const flashResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: `You convert a study coaching session into clear, exam-ready flashcards. Each card has a concise question (front) and a complete but compact answer (back). Generate 6-12 cards covering the most important ideas raised in the session. ${courseLine}` },
            { role: "user", content: `SESSION TRANSCRIPT:\n\n${sessionText}\n\nReturn flashcards now.` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "submit_flashcards",
              description: "Submit the generated flashcards",
              parameters: {
                type: "object",
                properties: {
                  cards: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        front: { type: "string", description: "Question or prompt (1 sentence)" },
                        back: { type: "string", description: "Answer (1-3 sentences)" },
                        topic: { type: "string", description: "Short topic label" },
                      },
                      required: ["front", "back", "topic"],
                    },
                  },
                },
                required: ["cards"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "submit_flashcards" } },
        }),
      });
      if (!flashResp.ok) {
        if (flashResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (flashResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI gateway error: ${flashResp.status}`);
      }
      const fdata = await flashResp.json();
      const tc = fdata.choices?.[0]?.message?.tool_calls?.[0];
      const parsed = tc ? JSON.parse(tc.function.arguments) : { cards: [] };
      return new Response(JSON.stringify({ cards: parsed.cards ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const modeLine = mode === "theory"
      ? "You are coaching a student preparing for written/theory exams. Emphasize structure (intro, body, conclusion), key terms, and how to score full marks."
      : "You are coaching a student using the Smart Study Hub. Help them understand uploaded materials and prepare effectively for exams.";

    const systemPrompt = `You are OverraPrep AI Study Coach — an expert Nigerian university tutor for FUTA students. ${modeLine}

${courseLine}
Available study materials uploaded for this course (numbered):
${matList || "(no materials uploaded yet — encourage the student to upload notes/slides for richer guidance)"}

Rules:
- Be concise, friendly, and exam-focused. Use markdown (headings, bullets, **bold**) for clarity.
- For "explain X", give a 3-part structure: definition → core idea → exam-style example.
- For "quiz me" or "test me", create 3 short questions with answers hidden behind "<details>" markdown.
- Never invent file contents — only reference titles you were given.
- Keep replies under ~250 words unless the student explicitly asks for more depth.
${verifiedOnly ? "- VERIFIED MODE: The student wants tutor-verified explanations. STRONGLY prefer materials authored by a Tutor (marked '(by Tutor: …)' above). When you cite a tutor-authored material, lead with phrasing like 'According to your tutor's notes …'. If no tutor material applies, answer normally and clearly say 'No tutor-verified source for this — AI-generated.'" : ""}

CITATIONS (mandatory):
At the very END of every reply, on its own line, append a JSON block in this exact format:
<<SOURCES>>{"used":[1,3]}<<END>>
Where the array contains the NUMBERS of materials you actually drew from. If you did not use any specific material, use an empty array: <<SOURCES>>{"used":[]}<<END>>. Never reference numbers that do not exist in the list above.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("study-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
