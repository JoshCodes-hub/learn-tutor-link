// Notify students in the same department/school when a new tutor is approved.
// Invoked by the admin client right after approving a tutor application.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  tutor_user_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is an authenticated admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = (await req.json()) as Payload;
    if (!body?.tutor_user_id || typeof body.tutor_user_id !== "string") {
      return json({ error: "tutor_user_id required" }, 400);
    }

    // Look up tutor's profile (name + department)
    const { data: tutorProfile, error: profileErr } = await admin
      .from("profiles")
      .select("full_name, department, tutor_code")
      .eq("id", body.tutor_user_id)
      .maybeSingle();
    if (profileErr) throw profileErr;

    const tutorName = tutorProfile?.full_name || "A new tutor";
    const department = tutorProfile?.department || null;

    // Find target student audience: same department if known,
    // otherwise fall back to ALL students.
    let studentIds: string[] = [];

    if (department) {
      const { data: sameDept } = await admin
        .from("profiles")
        .select("id")
        .eq("department", department)
        .neq("id", body.tutor_user_id);
      const candidateIds = (sameDept ?? []).map((r) => r.id);
      if (candidateIds.length > 0) {
        const { data: studentRoles } = await admin
          .from("user_roles")
          .select("user_id")
          .eq("role", "student")
          .in("user_id", candidateIds);
        studentIds = (studentRoles ?? []).map((r) => r.user_id);
      }
    } else {
      const { data: allStudents } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");
      studentIds = (allStudents ?? []).map((r) => r.user_id);
    }

    if (studentIds.length === 0) {
      return json({ ok: true, notified: 0 });
    }

    // Cap fanout to avoid massive insert in a single request
    const MAX = 500;
    const targets = studentIds.slice(0, MAX);

    const title = "New tutor available!";
    const message = department
      ? `${tutorName} just joined and teaches ${department}. Check out their quizzes.`
      : `${tutorName} just joined OverraPrep. Explore their content!`;

    const rows = targets.map((uid) => ({
      user_id: uid,
      title,
      message,
      type: "info",
      link: `/tutor/${body.tutor_user_id}`,
    }));

    const { error: insertErr } = await admin.from("notifications").insert(rows);
    if (insertErr) throw insertErr;

    return json({ ok: true, notified: targets.length });
  } catch (err) {
    console.error("notify-new-tutor error", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
