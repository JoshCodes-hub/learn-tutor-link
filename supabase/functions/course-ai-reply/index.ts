// Posts an AI reply into a course discussion when a user mentions @AI.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as {
      course_id: string;
      prompt: string;
      parent_id?: string | null;
      course_code?: string | null;
    };
    const { course_id, prompt, parent_id, course_code } = body;
    if (!course_id || !prompt) {
      return new Response(JSON.stringify({ error: "missing course_id or prompt" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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

    // Verify participant via existing RPC
    const { data: isPart } = await admin.rpc("is_course_participant", {
      _course_id: course_id, _user_id: user.id,
    });
    if (!isPart) {
      return new Response(JSON.stringify({ error: "not a course participant" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Recent context
    const { data: msgs } = await admin
      .from("course_chat_messages")
      .select("is_ai, content")
      .eq("course_id", course_id)
      .order("created_at", { ascending: false })
      .limit(12);
    const recent = (msgs ?? []).reverse();
    const history = recent.map((m: any) => ({
      role: m.is_ai ? "assistant" : "user",
      content: m.content,
    }));

    // Insert placeholder AI message immediately
    const { data: placeholder, error: insErr } = await admin
      .from("course_chat_messages")
      .insert({
        course_id,
        user_id: user.id, // RLS requires author = auth.uid(); marker is is_ai
        parent_id: parent_id ?? null,
        content: "_thinking…_",
        is_ai: true,
        ai_status: "pending",
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    const systemPrompt = `You are OverraPrep AI helping students inside ${course_code ? `the ${course_code} course discussion` : "a university course discussion"}. Answer the student's question clearly and concisely (max 200 words). Use markdown for structure (headings, lists, code) when useful. Stay academic and respectful.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
      }),
    });

    if (!aiRes.ok) {
      const fallback = aiRes.status === 429
        ? "_AI is busy right now — please try again in a moment._"
        : aiRes.status === 402
          ? "_AI credits exhausted. Please contact an admin._"
          : "_AI couldn't reply. Try again._";
      await admin.from("course_chat_messages")
        .update({ content: fallback, ai_status: "failed" })
        .eq("id", placeholder!.id);
      return new Response(JSON.stringify({ error: "ai_error", status: aiRes.status }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const text = data?.choices?.[0]?.message?.content ?? "_No response._";

    await admin.from("course_chat_messages")
      .update({ content: text.slice(0, 2000), ai_status: "ready" })
      .eq("id", placeholder!.id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("course-ai-reply error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});