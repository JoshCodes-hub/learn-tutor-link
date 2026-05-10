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
async function adminJWT(room: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: LIVEKIT_API_KEY, sub: 'admin', iat: now, nbf: now, exp: now + 600,
    video: { room, roomAdmin: true, roomJoin: false },
  };
  const enc = new TextEncoder();
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey('raw', enc.encode(LIVEKIT_API_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return `${data}.${b64url(sig)}`;
}

function httpBase() {
  return LIVEKIT_URL.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { slot_id, action, target_identity, track_sid, muted } = await req.json();
    if (!slot_id || !action || !target_identity) {
      return new Response(JSON.stringify({ error: 'missing fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Only the slot host can moderate
    const { data: slot } = await supabase
      .from('tutor_session_slots').select('id, tutor_id').eq('id', slot_id).maybeSingle();
    if (!slot || slot.tutor_id !== user.id) {
      return new Response(JSON.stringify({ error: 'not host' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const room = `session-${slot_id}`;
    const token = await adminJWT(room);
    const base = httpBase();

    let endpoint = ''; let body: Record<string, unknown> = {};
    if (action === 'mute') {
      if (!track_sid) return new Response(JSON.stringify({ error: 'track_sid required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      endpoint = '/twirp/livekit.RoomService/MutePublishedTrack';
      body = { room, identity: target_identity, track_sid, muted: muted ?? true };
    } else if (action === 'remove') {
      endpoint = '/twirp/livekit.RoomService/RemoveParticipant';
      body = { room, identity: target_identity };
    } else {
      return new Response(JSON.stringify({ error: 'invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const resp = await fetch(`${base}${endpoint}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: text || 'livekit error' }), { status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(text || '{}', { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
