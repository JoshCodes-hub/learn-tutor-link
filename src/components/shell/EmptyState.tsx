import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-amber-300/60 bg-gradient-to-b from-amber-50/40 to-white px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-amber-500/10 text-amber-600">
          {icon}
        </div>
      )}
      <h3 className="font-display text-base font-bold">{title}</h3>
      {description && (
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}