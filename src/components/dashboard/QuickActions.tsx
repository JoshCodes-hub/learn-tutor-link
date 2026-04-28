import { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type Tone = "gold" | "emerald" | "sapphire" | "rose" | "violet" | "slate";

const TONES: Record<
  Tone,
  { iconBg: string; iconText: string; glow: string; chip: string }
> = {
  gold: {
    iconBg: "bg-gradient-to-br from-amber-100 to-amber-200/80 border-amber-200",
    iconText: "text-amber-700",
    glow: "from-amber-300/40 via-amber-200/20 to-transparent",
    chip: "bg-amber-50 text-amber-800 border-amber-200",
  },
  emerald: {
    iconBg: "bg-gradient-to-br from-emerald-100 to-emerald-200/80 border-emerald-200",
    iconText: "text-emerald-700",
    glow: "from-emerald-300/40 via-emerald-200/20 to-transparent",
    chip: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  sapphire: {
    iconBg: "bg-gradient-to-br from-sky-100 to-sky-200/80 border-sky-200",
    iconText: "text-sky-700",
    glow: "from-sky-300/40 via-sky-200/20 to-transparent",
    chip: "bg-sky-50 text-sky-800 border-sky-200",
  },
  rose: {
    iconBg: "bg-gradient-to-br from-rose-100 to-rose-200/80 border-rose-200",
    iconText: "text-rose-700",
    glow: "from-rose-300/40 via-rose-200/20 to-transparent",
    chip: "bg-rose-50 text-rose-800 border-rose-200",
  },
  violet: {
    iconBg: "bg-gradient-to-br from-violet-100 to-violet-200/80 border-violet-200",
    iconText: "text-violet-700",
    glow: "from-violet-300/40 via-violet-200/20 to-transparent",
    chip: "bg-violet-50 text-violet-800 border-violet-200",
  },
  slate: {
    iconBg: "bg-gradient-to-br from-slate-100 to-slate-200/80 border-slate-200",
    iconText: "text-slate-700",
    glow: "from-slate-300/40 via-slate-200/20 to-transparent",
    chip: "bg-slate-50 text-slate-800 border-slate-200",
  },
};

export interface QuickAction {
  icon: LucideIcon;
  label: string;
  description?: string;
  to?: string;
  onClick?: () => void;
  tone?: Tone;
  badge?: string | number;
  disabled?: boolean;
}

interface QuickActionsProps {
  title?: string;
  subtitle?: string;
  actions: QuickAction[];
  className?: string;
  /** Highlight the first action with a bigger "primary" treatment */
  highlightFirst?: boolean;
  rightSlot?: ReactNode;
}

/**
 * Premium role-based quick action grid. Animated in, glassy tiles
 * with gold accents, optional badge chips (e.g., "12 pending").
 */
export const QuickActions = ({
  title = "Quick actions",
  subtitle,
  actions,
  className,
  highlightFirst = true,
  rightSlot,
}: QuickActionsProps) => {
  const navigate = useNavigate();

  const handleClick = (a: QuickAction) => {
    if (a.disabled) return;
    if (a.onClick) a.onClick();
    else if (a.to) navigate(a.to);
  };

  return (
    <section className={cn("mb-8", className)}>
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="font-serif text-xl md:text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {rightSlot}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {actions.map((a, i) => {
          const t = TONES[a.tone ?? "gold"];
          const isPrimary = highlightFirst && i === 0;

          return (
            <motion.button
              key={a.label}
              type="button"
              onClick={() => handleClick(a)}
              disabled={a.disabled}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              whileHover={a.disabled ? undefined : { y: -3 }}
              whileTap={a.disabled ? undefined : { scale: 0.98 }}
              className={cn(
                "group relative text-left overflow-hidden rounded-2xl border p-4 md:p-5 transition-all duration-300",
                "bg-gradient-to-br from-white via-white to-amber-50/20",
                "border-white/70 shadow-[0_2px_12px_-4px_rgba(180,140,40,0.18)]",
                !a.disabled && "hover:shadow-[0_14px_36px_-12px_rgba(180,140,40,0.35)] cursor-pointer",
                a.disabled && "opacity-50 cursor-not-allowed",
                isPrimary && "sm:col-span-2 lg:col-span-1 ring-1 ring-amber-300/50"
              )}
            >
              {/* Glow */}
              <div
                className={cn(
                  "pointer-events-none absolute -top-12 -right-10 h-32 w-32 rounded-full blur-3xl opacity-70 bg-gradient-to-br",
                  t.glow
                )}
              />
              {/* Top accent line */}
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r",
                  t.glow
                )}
              />

              <div className="relative flex items-start gap-3">
                <div
                  className={cn(
                    "h-11 w-11 shrink-0 rounded-xl border flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110",
                    t.iconBg
                  )}
                >
                  <a.icon className={cn("h-5 w-5", t.iconText)} strokeWidth={1.75} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-serif text-base md:text-lg font-semibold text-foreground leading-tight">
                      {a.label}
                    </h3>
                    {a.badge !== undefined && a.badge !== 0 && (
                      <span
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full border",
                          t.chip
                        )}
                      >
                        {a.badge}
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-xs md:text-sm text-muted-foreground mt-0.5 leading-snug">
                      {a.description}
                    </p>
                  )}
                </div>

                <ArrowRight
                  className={cn(
                    "h-4 w-4 mt-1 transition-all duration-300",
                    a.disabled
                      ? "text-muted-foreground/30"
                      : "text-muted-foreground/40 group-hover:text-amber-700 group-hover:translate-x-1"
                  )}
                />
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

export default QuickActions;
