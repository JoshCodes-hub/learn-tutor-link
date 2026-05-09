// Proxy to the user's custom Overra HF Space TTS engine.
// Forwards { text } as JSON body, voice & beat_type as query params,
// authenticates with HUGGINGFACE_API_KEY, and returns audio bytes.
// Surfaces a structured "warming_up" response so the client can retry.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ENGINE_URL = "https://overra-2-overra-ai-engine.hf.space/generate";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("HUGGINGFACE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "HUGGINGFACE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? "").trim();
    const voice = String(body?.voice ?? "nigerian").trim();
    const beat_type = String(body?.beat_type ?? "afro_lofi").trim();

    if (!text) {
      return new Response(JSON.stringify({ error: "Missing 'text'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(ENGINE_URL);
    url.searchParams.set("voice", voice);
    url.searchParams.set("beat_type", beat_type);

    const upstream = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const contentType = upstream.headers.get("content-type") || "";

    // Warming up / non-audio responses → return JSON for client to handle
    if (!contentType.startsWith("audio/")) {
      const txt = await upstream.text();
      const lower = txt.toLowerCase();
      const warming =
        upstream.status === 503 ||
        upstream.status === 429 ||
        lower.includes("warming") ||
        lower.includes("loading") ||
        lower.includes("starting");

      return new Response(
        JSON.stringify({
          warming_up: warming,
          status: upstream.status,
          message: txt.slice(0, 500),
        }),
        {
          status: warming ? 503 : (upstream.ok ? 502 : upstream.status),
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const audio = await upstream.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "no-store",
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
