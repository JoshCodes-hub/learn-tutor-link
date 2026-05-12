import { supabase } from "@/integrations/supabase/client";

export type SecurityAction =
  | "role_switch"
  | "session_expired"
  | "role_blocked"
  | "role_selected";

/**
 * Insert a security-related event into the audit_logs table.
 * RLS allows any authenticated user to insert; admins can read.
 * Failures are swallowed — logging must never break the UX.
 */
export async function logSecurityEvent(
  userId: string | null | undefined,
  action: SecurityAction,
  meta: Record<string, unknown> = {},
) {
  if (!userId) return;
  try {
    await supabase.from("audit_logs").insert({
      admin_id: userId,
      action,
      table_name: "auth_events",
      record_id: userId,
      new_data: {
        ...meta,
        timestamp: new Date().toISOString(),
        path: typeof window !== "undefined" ? window.location.pathname : null,
      },
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch (err) {
    console.error("logSecurityEvent failed:", err);
  }
}

export const SECURITY_AUDIT_KEYS = {
  intendedRole: "overra_intended_role",
  lastUserId: "overra_last_user_id",
} as const;