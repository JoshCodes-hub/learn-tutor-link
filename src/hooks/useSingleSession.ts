import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TOKEN_KEY = "overra_device_token";

function getOrCreateToken(): string {
  try {
    let t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      t = (crypto as any).randomUUID?.() ?? String(Date.now()) + Math.random().toString(36).slice(2);
      localStorage.setItem(TOKEN_KEY, t);
    }
    return t;
  } catch {
    return String(Date.now());
  }
}

/**
 * Enforces single active session per user: registers this device's token
 * server-side, then heartbeats every 60s. If the server-side token has been
 * replaced (another device signed in), this device signs out gracefully.
 */
export function useSingleSession(userId: string | null | undefined) {
  const registered = useRef(false);
  useEffect(() => {
    if (!userId) {
      registered.current = false;
      return;
    }
    const token = getOrCreateToken();
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;

    const register = async () => {
      try {
        await (supabase.rpc as any)("record_device_session", { _token: token, _ua: ua });
        registered.current = true;
      } catch { /* swallow */ }
    };

    const ping = async () => {
      try {
        const { data } = await (supabase.rpc as any)("ping_session", { _token: token });
        if (data && data !== token) {
          toast.message("Signed in on another device", {
            description: "You've been signed out here for security.",
          });
          try { localStorage.removeItem(TOKEN_KEY); } catch { /* noop */ }
          await supabase.auth.signOut();
        }
      } catch { /* swallow */ }
    };

    void register();
    const handle = window.setInterval(ping, 60_000);
    const onVis = () => { if (document.visibilityState === "visible") void ping(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(handle);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [userId]);
}