import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Cluster {
  topic: string;
  count: number;
  years: number[];
  probability: "high" | "medium" | "low";
  sample_questions: { id: string; text: string; type: "cbt" | "theory"; year?: number | null }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const guard = await requireUser(req, corsHeaders);
    if (guard instanceof Response) return guard;
    const { course_id } = (await req.json()) as { course_id: string };
    if (!course_id) {
      return new Response(JSON.stringify({ error: "Missing course_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    const client = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });

    // Pull CBT + theory questions for this course
    const [cbtRes, theoryRes, topicsRes] = await Promise.all([
      client
        .from("questions")
        .select("id, question_text, topic_id, created_at")
        .eq("course_id", course_id)
        .eq("is_approved", true)
        .limit(500),
      client
        .from("theory_questions")
        .select("id, question_text, topic_id, year, marks")
        .eq("course_id", course_id)
        .eq("is_approved", true)
        .limit(500),
      client.from("topics").select("id, name").eq("course_id", course_id),
    ]);

    if (cbtRes.error) throw cbtRes.error;
    if (theoryRes.error) throw theoryRes.error;
    if (topicsRes.error) throw topicsRes.error;

    const topicMap = new Map<string, string>();
    (topicsRes.data ?? []).forEach((t) => topicMap.set(t.id, t.name));

    const cbt = cbtRes.data ?? [];
    const theory = theoryRes.data ?? [];

    if (cbt.length === 0 && theory.length === 0) {
      return new Response(
        JSON.stringify({
          clusters: [],
          totals: { cbt: 0, theory: 0 },
          message: "No questions found for this course yet.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build sample for AI clustering
    const sample = [
      ...cbt.slice(0, 100).map((q) => ({
        id: q.id,
        text: q.question_text,
        type: "cbt" as const,
        topic: q.topic_id ? topicMap.get(q.topic_id) ?? null : null,
        year: null as number | null,
      })),
      ...theory.slice(0, 100).map((q) => ({
        id: q.id,
        text: q.question_text,
        type: "theory" as const,
        topic: q.topic_id ? topicMap.get(q.topic_id) ?? null : null,
        year: q.year ?? null,
      })),
    ];

    const systemPrompt = `You are an exam analyst. Group similar questions into topic clusters and assess how likely each topic is to appear on the next exam, based on frequency and recency. Return strict JSON.`;

    const userPrompt = `Analyze these ${sample.length} past questions and group them into topic clusters.

For each cluster, return:
- topic: short topic name (3-6 words)
- question_ids: array of ids in the cluster
- probability: "high" | "medium" | "low" — based on frequency, repetition across years, and breadth of coverage

Return JSON: { "clusters": [ { "topic": string, "question_ids": string[], "probability": "high"|"medium"|"low" } ] }

QUESTIONS:
${JSON.stringify(sample)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      if (aiRes.status === 429)
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (aiRes.status === 402)
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      throw new Error(`AI gateway error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    let parsed: { clusters?: Array<{ topic: string; question_ids: string[]; probability: string }> } = {};
    try {
      parsed = JSON.parse(aiData.choices?.[0]?.message?.content ?? "{}");
    } catch {
      parsed = {};
    }

    const idIndex = new Map<string, (typeof sample)[number]>();
    sample.forEach((s) => idIndex.set(s.id, s));

    const clusters: Cluster[] = (parsed.clusters ?? []).map((c) => {
      const items = c.question_ids.map((id) => idIndex.get(id)).filter(Boolean) as typeof sample;
      const years = Array.from(new Set(items.map((i) => i.year).filter((y): y is number => !!y))).sort();
      const prob = (c.probability as Cluster["probability"]) ?? "medium";
      return {
        topic: c.topic,
        count: items.length,
        years,
        probability: ["high", "medium", "low"].includes(prob) ? prob : "medium",
        sample_questions: items.slice(0, 5).map((i) => ({
          id: i.id,
          text: i.text.slice(0, 220),
          type: i.type,
          year: i.year,
        })),
      };
    });

    clusters.sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 } as const;
      if (pOrder[a.probability] !== pOrder[b.probability])
        return pOrder[a.probability] - pOrder[b.probability];
      return b.count - a.count;
    });

    return new Response(
      JSON.stringify({
        clusters,
        totals: { cbt: cbt.length, theory: theory.length },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("analyze-past-questions error:", error);
    const msg = error instanceof Error ? error.message : "Failed to analyze";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
