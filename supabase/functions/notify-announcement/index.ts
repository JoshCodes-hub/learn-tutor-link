import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  announcementId: string;
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { announcementId } = (await req.json()) as Body;
    if (!announcementId) {
      return new Response(JSON.stringify({ error: "announcementId required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth: caller must be admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userRes } = await admin.auth.getUser(jwt);
    const callerId = userRes?.user?.id;
    if (!callerId) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Fetch announcement
    const { data: ann, error: annErr } = await admin
      .from("platform_announcements")
      .select("id,title,body,image_url,link_url,link_label,audience,is_published,category")
      .eq("id", announcementId)
      .maybeSingle();
    if (annErr || !ann) {
      return new Response(JSON.stringify({ error: "announcement not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!ann.is_published) {
      return new Response(JSON.stringify({ error: "announcement is not published" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Fetch recipients: students whose announcement_email pref is on (default true)
    let q = admin.from("profiles").select("id,email,full_name,notification_preferences");
    const { data: profiles, error: pErr } = await q;
    if (pErr) throw pErr;

    const recipients = (profiles ?? []).filter((p: any) => {
      if (!p.email) return false;
      const prefs = p.notification_preferences || {};
      // Default to opted-in unless explicitly disabled
      return prefs.announcement_email !== false;
    });

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const subject = `📢 ${ann.title}`;
    const cta = ann.link_url
      ? `<p style="margin:24px 0;text-align:center"><a href="${escape(ann.link_url)}" style="background:#f5b400;color:#1a1300;padding:12px 22px;border-radius:10px;font-weight:700;text-decoration:none;display:inline-block">${escape(ann.link_label || "Open OverraPrep")}</a></p>`
      : "";
    const img = ann.image_url
      ? `<img src="${escape(ann.image_url)}" alt="" style="width:100%;max-width:560px;border-radius:14px;margin:0 0 18px" />`
      : "";
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;color:#1a1300">
        <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#a37500;font-weight:700;margin-bottom:8px">Announcement</div>
        <h1 style="font-size:22px;line-height:1.25;margin:0 0 12px">${escape(ann.title)}</h1>
        ${img}
        <p style="font-size:15px;line-height:1.6;color:#3a3000;white-space:pre-line">${escape(ann.body)}</p>
        ${cta}
        <hr style="border:none;border-top:1px solid #f1e6c4;margin:28px 0" />
        <p style="font-size:12px;color:#8a7a3a;text-align:center;margin:0">You're receiving this because you have OverraPrep notifications on. Manage preferences in your Settings.</p>
      </div>`;

    // Send via Resend in batches of 50 (BCC pattern keeps recipients private)
    const BATCH = 50;
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < recipients.length; i += BATCH) {
      const slice = recipients.slice(i, i + BATCH);
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "OverraPrep <onboarding@resend.dev>",
            to: ["announcements@overraprep.com"],
            bcc: slice.map((r: any) => r.email),
            subject,
            html,
          }),
        });
        if (res.ok) sent += slice.length;
        else failed += slice.length;
      } catch {
        failed += slice.length;
      }
    }

    // Mark notified
    await admin
      .from("platform_announcements")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", announcementId);

    return new Response(
      JSON.stringify({ ok: true, sent, failed, total: recipients.length }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "unknown error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
