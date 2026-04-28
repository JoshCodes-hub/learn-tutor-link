import { cn } from "@/lib/utils";

/**
 * Premium shimmer skeletons in the Gold & White aesthetic. Use to fill space
 * while data loads instead of generic gray bars or spinners.
 *
 * Requires the `animate-shimmer` keyframe defined in tailwind.config.ts.
 */

export const ShimmerLine = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-md bg-amber-100/40 h-3",
      "before:absolute before:inset-0 before:-translate-x-full",
      "before:bg-gradient-to-r before:from-transparent before:via-amber-200/60 before:to-transparent",
      "before:animate-[shimmer_1.6s_infinite]",
      className
    )}
  />
);

export const ShimmerCircle = ({ size = 40, className }: { size?: number; className?: string }) => (
  <div
    style={{ width: size, height: size }}
    className={cn(
      "relative overflow-hidden rounded-full bg-amber-100/40",
      "before:absolute before:inset-0 before:-translate-x-full",
      "before:bg-gradient-to-r before:from-transparent before:via-amber-200/60 before:to-transparent",
      "before:animate-[shimmer_1.6s_infinite]",
      className
    )}
  />
);

export const SkeletonStatCard = () => (
  <div className="rounded-2xl border border-amber-100/60 bg-gradient-to-br from-white to-amber-50/20 p-5 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <ShimmerLine className="w-20 h-3" />
      <ShimmerCircle size={32} />
    </div>
    <ShimmerLine className="w-24 h-7 mb-2" />
    <ShimmerLine className="w-32 h-2.5" />
  </div>
);

export const SkeletonListItem = () => (
  <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-100/60 bg-white/60">
    <ShimmerCircle size={44} />
    <div className="flex-1 space-y-2">
      <ShimmerLine className="w-3/5" />
      <ShimmerLine className="w-2/5 h-2.5" />
    </div>
    <ShimmerLine className="w-12 h-6" />
  </div>
);

export const SkeletonQuizCard = () => (
  <div className="rounded-2xl border border-amber-100/60 bg-gradient-to-br from-white to-amber-50/20 p-5 shadow-sm space-y-4">
    <div className="flex items-start gap-3">
      <ShimmerCircle size={48} className="rounded-xl" />
      <div className="flex-1 space-y-2 pt-1">
        <ShimmerLine className="w-3/4 h-4" />
        <ShimmerLine className="w-1/2 h-3" />
      </div>
    </div>
    <div className="space-y-2">
      <ShimmerLine />
      <ShimmerLine className="w-5/6" />
    </div>
    <div className="flex justify-between items-center pt-2 border-t border-amber-100/40">
      <ShimmerLine className="w-20 h-3" />
      <ShimmerLine className="w-16 h-8 rounded-md" />
    </div>
  </div>
);

export const SkeletonDashboard = () => (
  <div className="space-y-6 p-4 md:p-6">
    <div className="flex items-center gap-4">
      <ShimmerCircle size={56} />
      <div className="flex-1 space-y-2">
        <ShimmerLine className="w-48 h-5" />
        <ShimmerLine className="w-32 h-3" />
      </div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SkeletonStatCard />
      <SkeletonStatCard />
      <SkeletonStatCard />
      <SkeletonStatCard />
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <SkeletonQuizCard />
      <SkeletonQuizCard />
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 5 }: { rows?: number }) => (
  <div className="rounded-2xl border border-amber-100/60 overflow-hidden bg-white">
    <div className="flex gap-4 px-4 py-3 bg-amber-50/40 border-b border-amber-100/60">
      <ShimmerLine className="w-32 h-3" />
      <ShimmerLine className="w-24 h-3" />
      <ShimmerLine className="w-20 h-3 ml-auto" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-amber-100/40 last:border-0">
        <ShimmerCircle size={32} />
        <ShimmerLine className="flex-1 max-w-xs" />
        <ShimmerLine className="w-20 h-3" />
        <ShimmerLine className="w-16 h-6 rounded-md ml-auto" />
      </div>
    ))}
  </div>
);
