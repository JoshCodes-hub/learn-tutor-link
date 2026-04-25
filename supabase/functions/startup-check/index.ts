// Verifies presence of required environment secrets/keys.
// Never returns secret values — only booleans and friendly status info.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckItem {
  key: string;
  label: string;
  category: "ai" | "email" | "infrastructure" | "payments";
  required: boolean;
  configured: boolean;
  description: string;
  setupHint: string;
}

const CHECKS: Omit<CheckItem, "configured">[] = [
  {
    key: "LOVABLE_API_KEY",
    label: "Lovable AI Gateway",
    category: "ai",
    required: true,
    description: "Powers AI explanations, summaries, theory grading and quiz recommendations.",
    setupHint: "Auto-provisioned by Lovable Cloud. If missing, re-enable Cloud or rotate the key.",
  },
  {
    key: "RESEND_API_KEY",
    label: "Resend Email API",
    category: "email",
    required: false,
    description: "Sends transactional emails (welcome, purchase, withdrawals, reports).",
    setupHint: "Add via Cloud → Secrets. Without it, in-app notifications still work.",
  },
  {
    key: "SUPABASE_URL",
    label: "Backend URL",
    category: "infrastructure",
    required: true,
    description: "Internal endpoint used by edge functions to reach the database.",
    setupHint: "Auto-provisioned by Lovable Cloud.",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    label: "Service Role Key",
    category: "infrastructure",
    required: true,
    description: "Allows edge functions to write notifications and bypass RLS where needed.",
    setupHint: "Auto-provisioned by Lovable Cloud.",
  },
  {
    key: "SUPABASE_ANON_KEY",
    label: "Public Anon Key",
    category: "infrastructure",
    required: true,
    description: "Used by the client app to talk to the backend.",
    setupHint: "Auto-provisioned by Lovable Cloud.",
  },
  {
    key: "STRIPE_SECRET_KEY",
    label: "Stripe (optional)",
    category: "payments",
    required: false,
    description: "Only needed if you re-enable paid token purchases.",
    setupHint: "Currently unused — platform runs in free-access mode.",
  },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const results: CheckItem[] = CHECKS.map((c) => {
    const value = Deno.env.get(c.key);
    return { ...c, configured: !!value && value.length > 0 };
  });

  const missingRequired = results.filter((r) => r.required && !r.configured);
  const missingOptional = results.filter((r) => !r.required && !r.configured);

  return new Response(
    JSON.stringify({
      success: true,
      healthy: missingRequired.length === 0,
      checks: results,
      summary: {
        total: results.length,
        configured: results.filter((r) => r.configured).length,
        missingRequired: missingRequired.length,
        missingOptional: missingOptional.length,
      },
      checkedAt: new Date().toISOString(),
    }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
});
