import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, ArrowDown, CheckCircle2, AlertCircle, WifiOff } from "lucide-react";
import { haptic } from "@/lib/native";
import { toast } from "@/hooks/use-toast";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  /** Pixels the user must drag before triggering refresh. */
  threshold?: number;
  /** Disable the gesture (e.g. on desktop). */
  disabled?: boolean;
  /** Min ms between refreshes; rapid drags within this window are ignored. */
  debounceMs?: number;
  /** Auto-retry attempts on failure (default 1). */
  maxRetries?: number;
}

type FeedbackState = "idle" | "success" | "error" | "offline";

/**
 * Mobile pull-to-refresh wrapper with:
 *  - In-flight guard + debounce (no duplicate concurrent requests)
 *  - Auto-retry with exponential backoff on failure
 *  - Offline detection with graceful fallback
 *  - "Last updated" timestamp + success animation
 *  - Scroll position preservation across re-renders
 */
export const PullToRefresh = ({
  onRefresh,
  children,
  threshold = 70,
  disabled = false,
  debounceMs = 1500,
  maxRetries = 1,
}: PullToRefreshProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const triggeredHapticRef = useRef(false);
  const inFlightRef = useRef(false);
  const lastRunRef = useRef(0);
  const scrollSnapshotRef = useRef<number>(0);

  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>("idle");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [, force] = useState(0);

  // Tick every 30s so "X min ago" stays current.
  useEffect(() => {
    if (!lastUpdated) return;
    const i = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(i);
  }, [lastUpdated]);

  const runRefresh = useCallback(async () => {
    const now = Date.now();
    // Debounce: ignore if we ran very recently
    if (now - lastRunRef.current < debounceMs) return;
    // Concurrency guard
    if (inFlightRef.current) return;

    // Offline short-circuit
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setFeedback("offline");
      toast({
        title: "You're offline",
        description: "Showing cached data. Reconnect and pull again to refresh.",
        variant: "destructive",
      });
      setTimeout(() => setFeedback("idle"), 2400);
      return;
    }

    inFlightRef.current = true;
    lastRunRef.current = now;
    setRefreshing(true);
    // Snapshot scroll so we can restore after children re-render
    const scroller = document.scrollingElement || document.documentElement;
    scrollSnapshotRef.current = scroller.scrollTop;

    let attempt = 0;
    let lastError: unknown = null;
    while (attempt <= maxRetries) {
      try {
        await haptic("medium");
        await onRefresh();
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        attempt += 1;
        if (attempt <= maxRetries) {
          // Exponential backoff: 600ms, 1200ms…
          await new Promise((r) => setTimeout(r, 600 * attempt));
        }
      }
    }

    setRefreshing(false);
    setPull(0);
    inFlightRef.current = false;

    if (lastError) {
      setFeedback("error");
      await haptic("error" as any);
      toast({
        title: "Couldn't refresh",
        description: "Please check your connection and try again.",
        variant: "destructive",
        action: undefined,
      });
      setTimeout(() => setFeedback("idle"), 2800);
    } else {
      setLastUpdated(Date.now());
      setFeedback("success");
      // Restore scroll position on the next frame in case lists shifted
      requestAnimationFrame(() => {
        const s = document.scrollingElement || document.documentElement;
        if (Math.abs(s.scrollTop - scrollSnapshotRef.current) > 4) {
          s.scrollTop = scrollSnapshotRef.current;
        }
      });
      setTimeout(() => setFeedback("idle"), 1600);
    }
  }, [onRefresh, debounceMs, maxRetries]);

  useEffect(() => {
    if (disabled) return;
    const onTouchStart = (e: TouchEvent) => {
      if (refreshing || inFlightRef.current) return;
      const scroller = document.scrollingElement || document.documentElement;
      if (scroller.scrollTop > 0) return;
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
      triggeredHapticRef.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pullingRef.current || startYRef.current == null) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      const resisted = Math.min(140, Math.pow(dy, 0.85));
      setPull(resisted);
      if (resisted > threshold && !triggeredHapticRef.current) {
        triggeredHapticRef.current = true;
        haptic("selection");
      }
    };

    const onTouchEnd = async () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      const shouldRefresh = pull > threshold;
      startYRef.current = null;
      if (shouldRefresh) {
        setPull(56);
        await runRefresh();
      } else {
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [disabled, refreshing, pull, threshold, runRefresh]);

  const armed = pull > threshold;
  const showIndicator = pull > 8 || refreshing || feedback !== "idle";

  return (
    <div ref={containerRef} className="relative">
      {/* Floating indicator pill */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 z-[60] flex items-center justify-center"
        style={{
          transform: `translate(-50%, ${Math.max(0, (refreshing ? 56 : pull) - 40)}px)`,
          opacity: showIndicator ? 1 : 0,
          transition:
            refreshing || pull === 0 || feedback !== "idle"
              ? "transform 0.25s ease, opacity 0.25s"
              : "none",
        }}
      >
        <div
          className={`rounded-full bg-card/95 backdrop-blur-md border shadow-lg px-3 py-2 flex items-center gap-2 text-xs font-medium transition-colors ${
            feedback === "success"
              ? "border-green-500/40 text-green-600 dark:text-green-400 animate-scale-in"
              : feedback === "error"
              ? "border-destructive/50 text-destructive animate-scale-in"
              : feedback === "offline"
              ? "border-amber-500/50 text-amber-600 animate-scale-in"
              : "border-border text-foreground"
          }`}
        >
          {refreshing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Refreshing…
            </>
          ) : feedback === "success" ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" /> Updated
            </>
          ) : feedback === "error" ? (
            <>
              <AlertCircle className="w-3.5 h-3.5" /> Refresh failed — pull again
            </>
          ) : feedback === "offline" ? (
            <>
              <WifiOff className="w-3.5 h-3.5" /> Offline
            </>
          ) : armed ? (
            <>
              <ArrowDown className="w-3.5 h-3.5 text-primary rotate-180 transition-transform" />{" "}
              Release to refresh
            </>
          ) : (
            <>
              <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" /> Pull to refresh
            </>
          )}
        </div>
      </div>

      <div
        style={{
          transform: pull > 0 ? `translateY(${Math.min(pull * 0.4, 40)}px)` : undefined,
          transition: refreshing || pull === 0 ? "transform 0.25s ease" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;

/**
 * Format a "last updated" timestamp as a short human-friendly string.
 * Exported so dashboards can render their own subtle label.
 */
export function formatLastUpdated(ts: number | null): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 30_000) return "just now";
  if (diff < 60_000) return "less than a minute ago";
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(ts).toLocaleString();
}
