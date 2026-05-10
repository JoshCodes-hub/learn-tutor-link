import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { slot_id, transcript } = await req.json();
    if (!slot_id || !transcript) return json({ error: 'slot_id and transcript required' }, 400);

    const { data: slot } = await supabase
      .from('tutor_session_slots').select('id, tutor_id, title').eq('id', slot_id).maybeSingle();
    if (!slot || slot.tutor_id !== user.id) return json({ error: 'not host' }, 403);

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Lovable-API-Key': LOVABLE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'You produce concise study-class recaps. Output strict JSON: {"summary": string (<=120 words), "key_points": string[] (3-7 bullet items), "action_items": string[] (2-5 next steps for students)}.' },
          { role: 'user', content: `Class title: ${slot.title}\n\nNotes/transcript:\n${String(transcript).slice(0, 12000)}` },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return json({ error: `ai: ${aiRes.status} ${t}` }, aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500);
    }
    const aiJson = await aiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(aiJson.choices?.[0]?.message?.content ?? '{}'); } catch { parsed = {}; }

    const row = {
      slot_id,
      tutor_id: user.id,
      summary: String(parsed.summary ?? '').slice(0, 4000),
      key_points: Array.isArray(parsed.key_points) ? parsed.key_points.slice(0, 12) : [],
      action_items: Array.isArray(parsed.action_items) ? parsed.action_items.slice(0, 10) : [],
    };
    const { data: saved, error } = await supabase
      .from('live_recaps').upsert(row, { onConflict: 'slot_id' }).select().single();
    if (error) return json({ error: error.message }, 500);

    return json({ recap: saved });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
