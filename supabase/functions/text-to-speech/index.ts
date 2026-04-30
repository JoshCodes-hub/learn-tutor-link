// Text-to-speech via Noiz AI
// Accepts: { text, voice_id, output_format? }
// Returns: { audio: base64, mime: string }
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NOIZ_URL = "https://noiz.ai/v1/text-to-speech";

// Hard cap to keep cost predictable & avoid huge requests
const MAX_CHARS = 12000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("NOIZ_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "NOIZ_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? "").trim();
    const voice_id = String(body?.voice_id ?? "").trim();
    const output_format = String(body?.output_format ?? "mp3").trim();

    if (!text) {
      return new Response(JSON.stringify({ error: "Missing 'text'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!voice_id) {
      return new Response(JSON.stringify({ error: "Missing 'voice_id'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (text.length > MAX_CHARS) {
      return new Response(
        JSON.stringify({
          error: `Text too long (${text.length} chars). Max is ${MAX_CHARS}. Split your document into chunks.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const form = new FormData();
    form.append("text", text);
    form.append("voice_id", voice_id);
    form.append("output_format", output_format);

    const upstream = await fetch(NOIZ_URL, {
      method: "POST",
      headers: { Authorization: apiKey },
      body: form,
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("Noiz error:", upstream.status, errText);
      return new Response(
        JSON.stringify({ error: `Noiz API ${upstream.status}: ${errText.slice(0, 300)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const buf = new Uint8Array(await upstream.arrayBuffer());
    // base64 encode
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      binary += String.fromCharCode(...buf.subarray(i, i + chunk));
    }
    const base64 = btoa(binary);
    const mime = output_format === "wav" ? "audio/wav" : "audio/mpeg";

    return new Response(JSON.stringify({ audio: base64, mime }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("text-to-speech error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
