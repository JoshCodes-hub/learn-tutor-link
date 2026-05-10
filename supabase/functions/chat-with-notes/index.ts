// chat-with-notes — Phase 2
// Streaming chat grounded in a study material's text (Summary or extracted content).
// Uses Lovable AI Gateway (google/gemini-3-flash-preview).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const messages = (body?.messages ?? []) as ChatMessage[];
    const materialText = String(body?.material_text ?? "").trim();
    const materialTitle = String(body?.material_title ?? "Study Material").trim();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Missing messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!materialText) {
      return new Response(JSON.stringify({ error: "Missing material_text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const grounded = materialText.slice(0, 24000);

    const system =
      `You are an academic AI tutor helping a Nigerian university student study the material titled "${materialTitle}".\n` +
      `ALWAYS ground every answer in the material below. If the answer is not in the material, say so honestly and offer related context.\n` +
      `Use simple, friendly language. Use bullet points or short paragraphs. Cite phrases from the material in quotes when useful.\n\n` +
      `=== MATERIAL ===\n${grounded}\n=== END MATERIAL ===`;

    const upstream = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [
          { role: "system", content: system },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!upstream.ok) {
      const txt = await upstream.text();
      const status = upstream.status;
      const friendly =
        status === 429
          ? "Rate limit reached. Please try again in a moment."
          : status === 402
            ? "AI credits exhausted. Add credits in workspace settings."
            : `AI gateway error (${status})`;
      return new Response(JSON.stringify({ error: friendly, detail: txt.slice(0, 500) }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
