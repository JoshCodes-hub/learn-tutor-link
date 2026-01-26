import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const skeletonVariants = cva(
  "rounded-md bg-muted",
  {
    variants: {
      animation: {
        pulse: "animate-pulse",
        shimmer: "animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]",
        none: "",
      },
    },
    defaultVariants: {
      animation: "shimmer",
    },
  }
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

function Skeleton({ className, animation, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(skeletonVariants({ animation, className }))}
      {...props}
    />
  );
}

// Pre-built skeleton components for common use cases
function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-2 pt-4">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
    </div>
  );
}

function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  };
  return <Skeleton className={cn("rounded-full", sizeClasses[size])} />;
}

function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{ width: `${100 - i * 10}%` }}
        />
      ))}
    </div>
  );
}

function SkeletonButton() {
  return <Skeleton className="h-11 w-24 rounded-lg" />;
}

export { Skeleton, SkeletonCard, SkeletonAvatar, SkeletonText, SkeletonButton, skeletonVariants };
