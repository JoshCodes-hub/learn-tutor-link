import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  className?: string;
  /** Disable the visibility-blur (e.g. for previews you actively want visible). */
  disableBlur?: boolean;
}

/**
 * Lightweight screenshot-deterrence wrapper:
 * - Blurs content when the tab/app loses focus.
 * - Disables text selection + iOS callout.
 * - Calls a native FLAG_SECURE shim if the Capacitor wrapper exposes one.
 */
export function ProtectedView({ children, className, disableBlur }: Props) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState !== "visible");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onVis);
    window.addEventListener("focus", onVis);

    // Best-effort native screenshot block — no-op on web
    const w = window as any;
    try { w.AndroidSecure?.enable?.(); } catch { /* noop */ }

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onVis);
      window.removeEventListener("focus", onVis);
      try { w.AndroidSecure?.disable?.(); } catch { /* noop */ }
    };
  }, []);

  return (
    <div
      className={cn(
        "select-none transition-[filter] duration-200",
        !disableBlur && hidden && "blur-md",
        className,
      )}
      style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" } as React.CSSProperties}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
}

export default ProtectedView;