import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { formatLastUpdated } from "@/components/native/PullToRefresh";

interface LastUpdatedBadgeProps {
  /** Epoch ms of the last successful refresh. */
  timestamp: number | null;
  className?: string;
}

/**
 * Subtle "Last updated X min ago" pill. Re-renders every 30s while mounted.
 * Animates with a brief fade-in whenever the timestamp changes.
 */
export const LastUpdatedBadge = ({ timestamp, className = "" }: LastUpdatedBadgeProps) => {
  const [, force] = useState(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!timestamp) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 900);
    return () => clearTimeout(t);
  }, [timestamp]);

  useEffect(() => {
    if (!timestamp) return;
    const i = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(i);
  }, [timestamp]);

  if (!timestamp) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 border border-border/50 rounded-full px-2.5 py-1 ${
        pulse ? "animate-fade-in" : ""
      } ${className}`}
      aria-live="polite"
    >
      <Clock className={`w-3 h-3 ${pulse ? "text-primary" : ""}`} />
      <span>Updated {formatLastUpdated(timestamp)}</span>
    </div>
  );
};

export default LastUpdatedBadge;
