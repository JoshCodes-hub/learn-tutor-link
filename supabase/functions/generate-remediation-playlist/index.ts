// AI-generated personalized study plan from mock exam results.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { attempt_id } = await req.json();
    if (!attempt_id) {
      return new Response(JSON.stringify({ error: "missing attempt_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: attempt } = await admin
      .from("mock_exam_attempts")
      .select("*, exam:mock_exams(title)")
      .eq("id", attempt_id).eq("user_id", user.id).maybeSingle();
    if (!attempt) return new Response(JSON.stringify({ error: "not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const breakdown = (attempt.topic_breakdown ?? []) as { topic_id: string; correct: number; total: number }[];
    const topicIds = breakdown.map(b => b.topic_id);
    const { data: topics } = topicIds.length
      ? await admin.from("topics").select("id, name").in("id", topicIds)
      : { data: [] as any[] };
    const nameOf = new Map((topics ?? []).map((t: any) => [t.id, t.name]));

    const lines = breakdown
      .map(b => `- ${nameOf.get(b.topic_id) ?? "Topic"}: ${b.correct}/${b.total} (${Math.round((b.correct / b.total) * 100)}%)`)
      .join("\n");

    const prompt = `A student just took the mock exam "${attempt.exam?.title}" and scored ${attempt.score}/${attempt.total} (${Math.round((attempt.score/attempt.total)*100)}%).

Per-topic results:
${lines}

Write a concise, motivating 1-week study playlist in Markdown (300-450 words).
Sections:
## Priority weak areas
List the 2-3 lowest-scoring topics with one specific action each (drill X questions, review summary, etc).

## Daily plan
Day 1 through Day 7 — what to focus on each day. Mix weak topics + light review of strong ones to retain.

## Quick wins
2-3 study techniques that match these results (e.g. spaced repetition for topics under 50%, active recall for borderline ones).

Be specific. No filler. End with a one-line pep talk.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
      return new Response(JSON.stringify({
        error: aiRes.status === 429 ? "rate_limited" : aiRes.status === 402 ? "credits_exhausted" : "ai_error",
        detail: t,
      }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const json = await aiRes.json();
    const playlist = json?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ playlist }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("remediation error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
