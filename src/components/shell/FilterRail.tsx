import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface FilterChip {
  id: string;
  label: ReactNode;
  count?: number;
}

interface FilterRailProps {
  chips: FilterChip[];
  active: string;
  onChange: (id: string) => void;
  sticky?: boolean;
  trailing?: ReactNode;
}

/**
 * Horizontal scrollable chip row used to filter content on student pages.
 */
export function FilterRail({ chips, active, onChange, sticky = true, trailing }: FilterRailProps) {
  return (
    <div
      className={cn(
        "mb-5 -mx-4 px-4 py-2 bg-background/80 backdrop-blur-md border-b border-border/60",
        sticky && "sticky top-[56px] z-20",
      )}
    >
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {chips.map((c) => {
          const on = c.id === active;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-semibold transition-all",
                on
                  ? "bg-foreground text-background border-foreground shadow-sm"
                  : "bg-background text-foreground border-border hover:border-amber-400/60 hover:bg-amber-50/40",
              )}
            >
              {c.label}
              {typeof c.count === "number" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] font-bold leading-4",
                    on ? "bg-background/20 text-background" : "bg-muted text-muted-foreground",
                  )}
                >
                  {c.count}
                </span>
              )}
            </button>
          );
        })}
        {trailing && <div className="ml-auto shrink-0">{trailing}</div>}
      </div>
    </div>
  );
}