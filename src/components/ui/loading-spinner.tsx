import { Sparkles } from "lucide-react";

/**
 * Branded full-screen loading state. Gold & White luxury aesthetic with a
 * shimmering serif wordmark, soft halo, and subtle pulse — never a generic spinner.
 */
export const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-amber-50/20 to-background">
    <div className="flex flex-col items-center gap-5">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300/40 to-amber-500/30 blur-2xl animate-pulse" />
        <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30 flex items-center justify-center">
          <Sparkles className="h-7 w-7 text-white animate-pulse" />
          <div className="absolute inset-0 rounded-full border-2 border-amber-200/60 border-t-transparent animate-spin" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="font-serif text-base font-semibold tracking-wide bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
          Preparing your experience
        </span>
        <span className="text-xs text-muted-foreground">Just a moment…</span>
      </div>
    </div>
  </div>
);

export const LoadingCard = () => (
  <div className="flex items-center justify-center p-10">
    <div className="relative">
      <div className="absolute inset-0 rounded-full bg-amber-400/30 blur-xl animate-pulse" />
      <div className="relative h-10 w-10 rounded-full border-2 border-amber-300/50 border-t-amber-600 animate-spin" />
    </div>
  </div>
);
