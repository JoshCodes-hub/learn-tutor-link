import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNetworkStatus } from "@/components/native/OfflineBanner";
import { haptic } from "@/lib/native";

interface DashboardOfflineBannerProps {
  /** Same handler used by PullToRefresh — triggers a fresh data fetch. */
  onReattempt: () => Promise<void> | void;
}

/**
 * Persistent inline banner shown on dashboards while the device is offline.
 * Mirrors the pull-to-refresh action with a one-tap "Reattempt refresh" button
 * so users can retry without needing to perform the gesture.
 */
export const DashboardOfflineBanner = ({ onReattempt }: DashboardOfflineBannerProps) => {
  const { online } = useNetworkStatus();
  const [retrying, setRetrying] = useState(false);
  const [justCameOnline, setJustCameOnline] = useState(false);

  // Show a brief "back online" pulse once connectivity returns.
  useEffect(() => {
    if (online) {
      setJustCameOnline(true);
      const t = setTimeout(() => setJustCameOnline(false), 2400);
      return () => clearTimeout(t);
    }
  }, [online]);

  if (online && !justCameOnline) return null;

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    await haptic("medium");
    try {
      await onReattempt();
    } catch {
      // Errors are handled by the underlying refresh + toast pipeline
    } finally {
      setRetrying(false);
    }
  };

  if (!online) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="sticky top-[env(safe-area-inset-top)] z-40 mx-auto mb-4 flex w-full max-w-5xl items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 backdrop-blur-md shadow-md animate-fade-in"
      >
        <div className="flex items-center gap-2.5 text-sm">
          <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20">
            <WifiOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </span>
          <div className="leading-tight">
            <p className="font-semibold text-foreground">You're offline</p>
            <p className="text-xs text-muted-foreground">
              Showing cached data. Reconnect to fetch the latest.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRetry}
          disabled={retrying}
          className="shrink-0 border-amber-500/50 hover:bg-amber-500/15"
        >
          {retrying ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Retrying…
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5" /> Reattempt refresh
            </>
          )}
        </Button>
      </div>
    );
  }

  // Brief confirmation banner once connectivity is restored.
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-[env(safe-area-inset-top)] z-40 mx-auto mb-4 flex w-full max-w-5xl items-center gap-2 rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-2 text-sm font-medium text-green-700 dark:text-green-400 shadow-sm animate-fade-in"
    >
      <RefreshCw className="h-3.5 w-3.5" /> Back online — data is fresh.
    </div>
  );
};

export default DashboardOfflineBanner;
