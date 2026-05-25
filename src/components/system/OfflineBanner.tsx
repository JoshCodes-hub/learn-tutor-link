import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-[60] w-full bg-amber-500/95 text-white text-[12.5px] font-medium px-4 py-1.5 text-center shadow-sm flex items-center justify-center gap-2"
    >
      <WifiOff className="h-3.5 w-3.5" />
      You're offline — showing cached content where available.
    </div>
  );
}

export default OfflineBanner;