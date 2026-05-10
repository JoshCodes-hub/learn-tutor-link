// Posts an AI reply into a chat thread. Triggered when a user message contains @AI.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { thread_id, prompt } = await req.json() as { thread_id: string; prompt: string };
    if (!thread_id || !prompt) {
      return new Response(JSON.stringify({ error: "missing thread_id or prompt" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Authenticate caller
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify membership
    const { data: mem } = await admin
      .from("chat_thread_members")
      .select("user_id")
      .eq("thread_id", thread_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!mem) {
      return new Response(JSON.stringify({ error: "not a member" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load last 20 messages for context
    const { data: msgs } = await admin
      .from("chat_messages")
      .select("is_ai, content, author_id")
      .eq("thread_id", thread_id)
      .order("created_at", { ascending: false })
      .limit(20);
    const recent = (msgs ?? []).reverse();

    const history = recent.map(m => ({
      role: m.is_ai ? "assistant" : "user",
      content: m.content,
    }));

    const systemPrompt = `You are OverraPrep AI — a helpful study companion in a group chat. Reply in a friendly, concise tone (max 180 words). Use markdown when helpful. The student tagged you with @AI. Focus on their latest question.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
      const errKey = aiRes.status === 429 ? "rate_limited" : aiRes.status === 402 ? "credits_exhausted" : "ai_error";
      // Post a friendly fallback message so chat isn't broken
      await admin.from("chat_messages").insert({
        thread_id, author_id: null, is_ai: true,
        content: aiRes.status === 429
          ? "_AI is busy right now — please try again in a moment._"
          : aiRes.status === 402
            ? "_AI credits exhausted. Ask the workspace owner to top up._"
            : "_AI couldn't reply. Try again._",
      });
      return new Response(JSON.stringify({ error: errKey, detail: txt }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await aiRes.json();
    const text: string = json?.choices?.[0]?.message?.content ?? "(no reply)";

    const { data: inserted, error: insErr } = await admin
      .from("chat_messages")
      .insert({ thread_id, author_id: null, is_ai: true, content: text })
      .select()
      .single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ message: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat-ai-reply error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
