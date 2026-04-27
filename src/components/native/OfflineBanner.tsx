/**
 * Network status hook + lightweight offline banner.
 * Uses Capacitor Network on native, falls back to navigator.onLine on web.
 */
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Network, type ConnectionStatus } from "@capacitor/network";
import { WifiOff } from "lucide-react";

export function useNetworkStatus() {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [connectionType, setConnectionType] = useState<string>("unknown");

  useEffect(() => {
    let listener: { remove: () => void } | undefined;

    const apply = (status: ConnectionStatus) => {
      setOnline(status.connected);
      setConnectionType(status.connectionType);
    };

    if (Capacitor.isNativePlatform()) {
      Network.getStatus().then(apply);
      Network.addListener("networkStatusChange", apply).then((l) => (listener = l));
    } else {
      const on = () => setOnline(true);
      const off = () => setOnline(false);
      window.addEventListener("online", on);
      window.addEventListener("offline", off);
      return () => {
        window.removeEventListener("online", on);
        window.removeEventListener("offline", off);
      };
    }
    return () => listener?.remove();
  }, []);

  return { online, connectionType };
}

export function OfflineBanner() {
  const { online } = useNetworkStatus();
  if (online) return null;
  return (
    <div className="fixed top-[env(safe-area-inset-top)] inset-x-0 z-[200] bg-warning text-warning-foreground text-xs py-2 px-4 flex items-center justify-center gap-2 shadow-md backdrop-blur">
      <WifiOff className="w-3.5 h-3.5" />
      <span className="font-medium">You're offline — cached content available</span>
    </div>
  );
}

export default OfflineBanner;
