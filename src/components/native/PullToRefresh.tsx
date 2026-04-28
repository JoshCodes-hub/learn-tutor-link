import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { haptic } from "@/lib/native";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  /** Pixels the user must drag before triggering refresh. */
  threshold?: number;
  /** Disable the gesture (e.g. on desktop). */
  disabled?: boolean;
}

/**
 * Mobile pull-to-refresh wrapper. Activates only when the page is scrolled to top
 * and the user is dragging down. Works in browser preview AND native shells —
 * triggers haptic feedback on threshold crossing when running natively.
 */
export const PullToRefresh = ({
  onRefresh,
  children,
  threshold = 70,
  disabled = false,
}: PullToRefreshProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const triggeredHapticRef = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (disabled) return;
    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      // Only start when scrolled to top
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
      // Resistive curve
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
        setRefreshing(true);
        setPull(56);
        try {
          await haptic("medium");
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
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
  }, [disabled, refreshing, pull, threshold, onRefresh]);

  const armed = pull > threshold;

  return (
    <div ref={containerRef} className="relative">
      {/* Indicator */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 z-[60] flex items-center justify-center"
        style={{
          transform: `translate(-50%, ${Math.max(0, pull - 40)}px)`,
          opacity: pull > 8 ? 1 : 0,
          transition: refreshing || pull === 0 ? "transform 0.25s ease, opacity 0.2s" : "none",
        }}
      >
        <div className="rounded-full bg-card/95 backdrop-blur-md border border-border shadow-lg px-3 py-2 flex items-center gap-2 text-xs font-medium text-foreground">
          {refreshing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Refreshing…
            </>
          ) : armed ? (
            <>
              <ArrowDown className="w-3.5 h-3.5 text-primary rotate-180 transition-transform" /> Release to refresh
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
