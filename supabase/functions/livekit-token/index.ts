import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LIVEKIT_URL = Deno.env.get('LIVEKIT_URL')!;
const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY')!;
const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET')!;

function b64url(input: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input)
    : input instanceof ArrayBuffer ? new Uint8Array(input) : input;
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function signJWT(payload: Record<string, unknown>): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const enc = new TextEncoder();
  const head = b64url(JSON.stringify(header));
  const body = b64url(JSON.stringify(payload));
  const data = `${head}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(LIVEKIT_API_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return `${data}.${b64url(sig)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { slot_id } = await req.json();
    if (!slot_id) return new Response(JSON.stringify({ error: 'slot_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: slot, error: se } = await supabase
      .from('tutor_session_slots').select('id, tutor_id, title, starts_at, duration_min').eq('id', slot_id).maybeSingle();
    if (se || !slot) return new Response(JSON.stringify({ error: 'slot not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const isHost = slot.tutor_id === user.id;

    // Verify booked or host
    if (!isHost) {
      const { data: booking } = await supabase
        .from('session_bookings').select('id, status').eq('slot_id', slot_id).eq('student_id', user.id)
        .eq('status', 'confirmed').maybeSingle();
      if (!booking) {
        return new Response(JSON.stringify({ error: 'not booked' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Time gate: open 10 min before through end + 30 min
    const startMs = new Date(slot.starts_at).getTime();
    const endMs = startMs + (slot.duration_min ?? 60) * 60 * 1000;
    const now = Date.now();
    if (now < startMs - 10 * 60 * 1000) {
      return new Response(JSON.stringify({ error: 'session not open yet' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (now > endMs + 30 * 60 * 1000) {
      return new Response(JSON.stringify({ error: 'session ended' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle();

    const room = `session-${slot_id}`;
    const nowS = Math.floor(now / 1000);
    const exp = Math.floor(endMs / 1000) + 30 * 60;

    const token = await signJWT({
      iss: LIVEKIT_API_KEY,
      sub: user.id,
      nbf: nowS,
      iat: nowS,
      exp,
      name: profile?.full_name ?? 'Guest',
      metadata: JSON.stringify({ avatar_url: profile?.avatar_url ?? null, role: isHost ? 'host' : 'student' }),
      video: {
        room,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        canUpdateOwnMetadata: true,
      },
    });

    return new Response(JSON.stringify({
      token, url: LIVEKIT_URL, room, identity: user.id, isHost, title: slot.title,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
