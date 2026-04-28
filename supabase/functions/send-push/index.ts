// Send push notification(s) via Firebase Cloud Messaging (HTTP v1 API).
// Reads device tokens from profiles.academic_metadata.push_token.
//
// Required secrets:
//   FCM_SERVER_KEY   — Legacy server key from Firebase console > Cloud Messaging
//                      (simplest setup; works for both Android & iOS via APNs bridge).
//
// Body shape:
//   { user_ids: string[], title: string, body: string, link?: string, data?: Record<string,string> }
//
// Behavior: also writes a row to public.notifications for each recipient
// so users see the message in the in-app notification center even when offline.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PushBody {
  user_ids: string[];
  title: string;
  body: string;
  link?: string;
  data?: Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // --- AUTH GUARD: admin only ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await authedClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", claimsData.claims.sub);
    if (!roles?.some((r: any) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // --- END AUTH GUARD ---

    const payload = (await req.json()) as PushBody;
    if (!payload?.user_ids?.length || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: "user_ids, title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = adminClient;

    // 1. Always write in-app notification rows
    const notifRows = payload.user_ids.map((uid) => ({
      user_id: uid,
      title: payload.title,
      message: payload.body,
      type: "info",
      link: payload.link ?? null,
    }));
    await supabase.from("notifications").insert(notifRows);

    // 2. Look up FCM tokens
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, academic_metadata")
      .in("id", payload.user_ids);

    const tokens = (profiles ?? [])
      .map((p: any) => p.academic_metadata?.push_token)
      .filter((t: string) => !!t);

    if (!tokens.length) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, note: "No device tokens registered" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!FCM_SERVER_KEY) {
      return new Response(
        JSON.stringify({
          ok: true,
          sent: 0,
          note: "FCM_SERVER_KEY not configured — in-app notifications saved only.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Send via FCM legacy HTTP API (one request, multi-recipient)
    const fcmRes = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: `key=${FCM_SERVER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        registration_ids: tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          sound: "default",
        },
        data: {
          link: payload.link ?? "",
          ...(payload.data ?? {}),
        },
        priority: "high",
      }),
    });

    const fcmJson = await fcmRes.json();

    return new Response(
      JSON.stringify({ ok: true, sent: tokens.length, fcm: fcmJson }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-push error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
