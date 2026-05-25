import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export interface DeviceLogin {
  id: string;
  device_label: string | null;
  user_agent: string | null;
  last_active_at: string;
  created_at: string;
}

function detectLabel(): string {
  if (typeof navigator === "undefined") return "Unknown device";
  const ua = navigator.userAgent;
  const isMobile = /iPhone|iPad|Android|Mobile/i.test(ua);
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) ? "Safari" : "Browser";
  const os =
    /Android/i.test(ua) ? "Android" :
    /iPhone|iPad|iOS/i.test(ua) ? "iOS" :
    /Mac OS X/i.test(ua) ? "macOS" :
    /Windows/i.test(ua) ? "Windows" :
    /Linux/i.test(ua) ? "Linux" : "Device";
  return `${browser} on ${os}${isMobile ? " (mobile)" : ""}`;
}

export function useDeviceHistory() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["device-history", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<DeviceLogin[]> => {
      const { data, error } = await (supabase.from as any)("device_login_history")
        .select("*").eq("user_id", user!.id).order("last_active_at", { ascending: false });
      if (error) throw error;
      return (data || []) as DeviceLogin[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await (supabase.from as any)("device_login_history").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["device-history", user?.id] }),
  });

  return { ...query, remove };
}

/** Auto-records this device on login. Mount once near the auth root. */
export function useRecordDeviceLogin(userId: string | null | undefined) {
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        await (supabase as any).rpc("record_device_login", {
          _label: detectLabel(),
          _ua: typeof navigator !== "undefined" ? navigator.userAgent : null,
        });
      } catch { /* swallow */ }
    })();
  }, [userId]);
}