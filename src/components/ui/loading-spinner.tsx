import logo from "@/assets/logo.png";

/**
 * Branded full-screen loading state.
 * Official OverraPrep gold logo, centered with a smooth pulse + halo.
 * Fixed dimensions prevent any layout shift during mount/unmount.
 */
export const LoadingSpinner = () => (
  <div
    className="fixed inset-0 z-[9998] flex items-center justify-center bg-background"
    style={{
      paddingTop: "env(safe-area-inset-top)",
      paddingBottom: "env(safe-area-inset-bottom)",
    }}
    role="status"
    aria-live="polite"
    aria-label="Loading"
  >
    <div className="relative flex flex-col items-center gap-5">
      {/* Reserve space — prevents layout shift */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* Soft gold halo */}
        <div
          className="absolute inset-0 rounded-full bg-primary/25 blur-2xl animate-pulse"
          aria-hidden
        />
        {/* Spinning gold ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin"
          aria-hidden
        />
        {/* Official logo — gentle breathing animation, no layout shift */}
        <img
          src={logo}
          alt=""
          width={88}
          height={88}
          className="relative w-22 h-22 object-contain animate-logo-breathe"
          style={{
            width: 88,
            height: 88,
            filter: "drop-shadow(0 6px 16px hsl(43 80% 45% / 0.35))",
          }}
        />
      </div>
      <span className="text-xs font-medium tracking-wide text-muted-foreground">
        Loading…
      </span>
    </div>
  </div>
);

export const LoadingCard = () => (
  <div
    className="flex items-center justify-center p-10"
    role="status"
    aria-label="Loading"
  >
    <div className="relative w-16 h-16 flex items-center justify-center">
      <div
        className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse"
        aria-hidden
      />
      <div
        className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin"
        aria-hidden
      />
      <img
        src={logo}
        alt=""
        width={40}
        height={40}
        className="relative object-contain animate-logo-breathe"
        style={{ width: 40, height: 40 }}
      />
    </div>
  </div>
);
