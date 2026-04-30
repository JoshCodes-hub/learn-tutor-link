// One-shot bootstrap to create the primary admin account.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "oveeraprep@gmail.com";
const ADMIN_PASSWORD = "Drdeji24$.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Try to find existing user
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let user = list?.users?.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "OverraPrep Admin" },
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    user = data.user!;
  } else {
    // Reset password + ensure confirmed
    await admin.auth.admin.updateUserById(user.id, { password: ADMIN_PASSWORD, email_confirm: true });
  }

  // Ensure admin role
  await admin.from("user_roles").upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });

  return new Response(JSON.stringify({ ok: true, user_id: user.id, email: user.email }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
