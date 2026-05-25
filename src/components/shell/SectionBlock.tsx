import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionBlockProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionBlock({ title, subtitle, action, children, className }: SectionBlockProps) {
  return (
    <section className={cn("mb-8", className)}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg md:text-xl font-bold tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}