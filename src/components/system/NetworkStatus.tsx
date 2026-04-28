import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { WifiOff, Wifi } from "lucide-react";

/**
 * Listens to browser online/offline events and shows branded toasts.
 * Mounted once globally in App.tsx — renders nothing.
 */
export const NetworkStatus = () => {
  const wasOffline = useRef<boolean>(typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    const onOffline = () => {
      wasOffline.current = true;
      toast.error("You're offline", {
        description: "Some features will be unavailable until you reconnect.",
        icon: <WifiOff className="h-4 w-4" />,
        duration: Infinity,
        id: "network-offline",
      });
    };
    const onOnline = () => {
      if (!wasOffline.current) return;
      wasOffline.current = false;
      toast.dismiss("network-offline");
      toast.success("Back online", {
        description: "Your connection has been restored.",
        icon: <Wifi className="h-4 w-4" />,
        duration: 3000,
      });
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    if (!navigator.onLine) onOffline();
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
};

export default NetworkStatus;
