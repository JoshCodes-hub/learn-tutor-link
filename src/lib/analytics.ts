/**
 * Lightweight client analytics — fires events into the
 * `analytics_events` Supabase table without blocking the UI.
 *
 * Use:
 *   import { track } from "@/lib/analytics";
 *   track("quiz_started", { quizId, mode });
 */
import { supabase } from "@/integrations/supabase/client";

type EventProps = Record<string, unknown>;

// In-memory de-dupe for page_view spam (e.g., StrictMode double-mount)
let lastPageView: { path: string; t: number } | null = null;

async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function track(event: string, properties: EventProps = {}) {
  try {
    const user_id = await getCurrentUserId();
    // Fire-and-forget; never throw from analytics.
    void supabase.from("analytics_events").insert({
      user_id,
      event_name: event,
      properties: properties as never,
      path: typeof window !== "undefined" ? window.location.pathname : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch (err) {
    // swallow — analytics must never break the app
    if (import.meta.env.DEV) console.warn("[analytics] track failed", err);
  }
}

export function trackPageView(path?: string) {
  const p = path ?? (typeof window !== "undefined" ? window.location.pathname : "");
  const now = Date.now();
  if (lastPageView && lastPageView.path === p && now - lastPageView.t < 1500) return;
  lastPageView = { path: p, t: now };
  void track("page_view", { path: p });
}

export async function logClientError(args: {
  message: string;
  stack?: string;
  component_stack?: string;
}) {
  try {
    const user_id = await getCurrentUserId();
    void supabase.from("client_errors").insert({
      user_id,
      message: args.message.slice(0, 2000),
      stack: args.stack?.slice(0, 8000) ?? null,
      component_stack: args.component_stack?.slice(0, 8000) ?? null,
      path: typeof window !== "undefined" ? window.location.pathname : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch {
    /* swallow */
  }
}
