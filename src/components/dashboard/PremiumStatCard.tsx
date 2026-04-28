import { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "./AnimatedCounter";

type Tone = "gold" | "emerald" | "sapphire" | "rose" | "violet" | "slate";

const TONES: Record<
  Tone,
  { ring: string; iconBg: string; iconText: string; glow: string; bar: string }
> = {
  gold: {
    ring: "before:from-amber-300/60 before:via-amber-400/20 before:to-transparent",
    iconBg: "bg-gradient-to-br from-amber-50 to-amber-100/70 border-amber-200",
    iconText: "text-amber-700",
    glow: "from-amber-200/40 to-amber-400/10",
    bar: "from-amber-400 to-amber-600",
  },
  emerald: {
    ring: "before:from-emerald-300/60 before:via-emerald-400/20 before:to-transparent",
    iconBg: "bg-gradient-to-br from-emerald-50 to-emerald-100/70 border-emerald-200",
    iconText: "text-emerald-700",
    glow: "from-emerald-200/40 to-emerald-400/10",
    bar: "from-emerald-400 to-emerald-600",
  },
  sapphire: {
    ring: "before:from-sky-300/60 before:via-sky-400/20 before:to-transparent",
    iconBg: "bg-gradient-to-br from-sky-50 to-sky-100/70 border-sky-200",
    iconText: "text-sky-700",
    glow: "from-sky-200/40 to-sky-400/10",
    bar: "from-sky-400 to-sky-600",
  },
  rose: {
    ring: "before:from-rose-300/60 before:via-rose-400/20 before:to-transparent",
    iconBg: "bg-gradient-to-br from-rose-50 to-rose-100/70 border-rose-200",
    iconText: "text-rose-700",
    glow: "from-rose-200/40 to-rose-400/10",
    bar: "from-rose-400 to-rose-600",
  },
  violet: {
    ring: "before:from-violet-300/60 before:via-violet-400/20 before:to-transparent",
    iconBg: "bg-gradient-to-br from-violet-50 to-violet-100/70 border-violet-200",
    iconText: "text-violet-700",
    glow: "from-violet-200/40 to-violet-400/10",
    bar: "from-violet-400 to-violet-600",
  },
  slate: {
    ring: "before:from-slate-300/60 before:via-slate-400/20 before:to-transparent",
    iconBg: "bg-gradient-to-br from-slate-50 to-slate-100/70 border-slate-200",
    iconText: "text-slate-700",
    glow: "from-slate-200/40 to-slate-400/10",
    bar: "from-slate-400 to-slate-600",
  },
};

interface PremiumStatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  tone?: Tone;
  hint?: ReactNode;
  delta?: number; // positive = up, negative = down
  progress?: number; // 0..100, draws a sleek progress bar
  onClick?: () => void;
  className?: string;
  delay?: number;
}

/**
 * Premium glassmorphism KPI tile. Gold/emerald/sapphire tones,
 * soft halo glow, animated counter, optional delta and progress bar.
 *
 * Usage:
 *   <PremiumStatCard icon={Coins} label="Tokens" value={120} tone="gold" delta={+12} />
 */
export const PremiumStatCard = ({
  icon: Icon,
  label,
  value,
  suffix,
  prefix,
  decimals = 0,
  tone = "gold",
  hint,
  delta,
  progress,
  onClick,
  className,
  delay = 0,
}: PremiumStatCardProps) => {
  const t = TONES[tone];
  const isClickable = !!onClick;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={isClickable ? { y: -3 } : undefined}
      className={cn(
        "group relative text-left w-full overflow-hidden rounded-2xl border border-white/60",
        "bg-gradient-to-br from-white via-white to-amber-50/30",
        "shadow-[0_2px_12px_-4px_rgba(180,140,40,0.18)]",
        "p-5 transition-all duration-300",
        isClickable && "cursor-pointer hover:shadow-[0_12px_36px_-12px_rgba(180,140,40,0.35)]",
        // Top gold accent ring
        "before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r",
        t.ring,
        className
      )}
    >
      {/* Soft glow */}
      <div
        className={cn(
          "pointer-events-none absolute -top-12 -right-10 h-32 w-32 rounded-full blur-3xl opacity-70 bg-gradient-to-br",
          t.glow
        )}
      />

      <div className="relative flex items-start justify-between gap-3 mb-3">
        <div
          className={cn(
            "h-11 w-11 rounded-xl border flex items-center justify-center shadow-sm",
            t.iconBg
          )}
        >
          <Icon className={cn("h-5 w-5", t.iconText)} strokeWidth={1.75} />
        </div>
        {isClickable && (
          <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-amber-700 transition-colors" />
        )}
      </div>

      <p className="relative text-xs uppercase tracking-wider text-muted-foreground/80 font-medium mb-1">
        {label}
      </p>
      <div className="relative flex items-baseline gap-2">
        <AnimatedCounter
          value={value}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
          className="font-serif text-3xl font-semibold tracking-tight text-foreground"
        />
        {typeof delta === "number" && delta !== 0 && (
          <span
            className={cn(
              "text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
              delta > 0
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : "bg-rose-50 text-rose-700 border border-rose-100"
            )}
          >
            {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
      </div>

      {hint && (
        <p className="relative text-xs text-muted-foreground mt-1.5">{hint}</p>
      )}

      {typeof progress === "number" && (
        <div className="relative mt-3 h-1.5 w-full rounded-full bg-amber-100/40 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            transition={{ duration: 1.1, delay: delay + 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn("h-full bg-gradient-to-r rounded-full", t.bar)}
          />
        </div>
      )}
    </motion.button>
  );
};

export default PremiumStatCard;
