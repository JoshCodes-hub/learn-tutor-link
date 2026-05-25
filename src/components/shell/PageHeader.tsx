import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * Premium page header used across student-facing pages.
 * Eyebrow (level chip) · H1 · subtitle · right-aligned actions.
 */
export function PageHeader({ eyebrow, title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "relative mb-6 rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/70 via-white to-white p-5 md:p-6 overflow-hidden",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-amber-300/20 blur-3xl"
      />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5">{eyebrow}</div>
          )}
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm md:text-[15px] text-muted-foreground mt-1.5 max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}

export function LevelChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-800 border border-amber-300/60 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      {label}
    </span>
  );
}