import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Pull last 30 attempts to find weak topics
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('score, total_questions, completed_at, quiz_id')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(30);

    const { data: mastery } = await supabase
      .from('topic_mastery')
      .select('topic, mastery_score, attempts')
      .eq('user_id', user.id)
      .order('mastery_score', { ascending: true })
      .limit(10);

    const weakTopics = (mastery ?? []).filter((m: any) => m.mastery_score < 60).map((m: any) => m.topic);
    const avgScore = attempts?.length
      ? Math.round((attempts.reduce((a: number, b: any) => a + (b.score / Math.max(b.total_questions, 1)) * 100, 0) / attempts.length))
      : 0;

    const prompt = `You are an empathetic study coach for a Nigerian university student.
Recent average quiz score: ${avgScore}%
Weak topics (mastery <60%): ${weakTopics.join(', ') || 'none recorded yet'}
Total attempts logged: ${attempts?.length ?? 0}

Generate today's smart study plan as JSON with this exact shape:
{
  "headline": "one-sentence motivational headline",
  "focus_topic": "single topic to prioritize",
  "tasks": [
    {"title":"...", "minutes": 15, "type":"review|practice|read|flashcards"}
  ],
  "tip": "one practical study tip in 1-2 sentences"
}
Return ONLY the JSON. 3-5 tasks, total ~45-60 min.`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });
    if (!aiResp.ok) {
      const t = await aiResp.text();
      return new Response(JSON.stringify({ error: 'ai_error', detail: t }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const ai = await aiResp.json();
    let plan: any;
    try { plan = JSON.parse(ai.choices[0].message.content); } catch { plan = { headline: 'Today\'s plan', tasks: [] }; }

    // Upsert into coach_plans
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from('coach_plans').upsert({
      user_id: user.id,
      plan_date: today,
      plan_json: plan,
      weak_topics: weakTopics,
      generated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,plan_date' });

    return new Response(JSON.stringify({ plan, weak_topics: weakTopics, avg_score: avgScore }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
