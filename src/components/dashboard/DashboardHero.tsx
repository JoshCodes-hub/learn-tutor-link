import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Sparkles, Sun, Moon, Sunrise } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Role = "student" | "tutor" | "admin" | "school" | "parent";

const ROLE_BADGE: Record<Role, { label: string; gradient: string; ring: string }> = {
  student: {
    label: "Scholar",
    gradient: "from-amber-400 via-amber-500 to-amber-600",
    ring: "ring-amber-400/40",
  },
  tutor: {
    label: "Tutor",
    gradient: "from-violet-500 via-fuchsia-500 to-amber-500",
    ring: "ring-violet-400/40",
  },
  admin: {
    label: "Administrator",
    gradient: "from-slate-700 via-slate-800 to-amber-600",
    ring: "ring-amber-400/40",
  },
  school: {
    label: "School",
    gradient: "from-emerald-500 via-teal-500 to-amber-500",
    ring: "ring-emerald-400/40",
  },
  parent: {
    label: "Guardian",
    gradient: "from-rose-400 via-amber-400 to-amber-600",
    ring: "ring-rose-400/40",
  },
};

interface DashboardHeroProps {
  role: Role;
  fullName?: string | null;
  avatarUrl?: string | null;
  /** LinkedIn-style cover/banner image rendered behind the avatar. */
  coverUrl?: string | null;
  subtitle?: ReactNode;
  /** Optional right-side slot for actions (buttons) */
  actions?: ReactNode;
  /** Optional bottom slot for an inline strip (streak, tokens) */
  footer?: ReactNode;
  className?: string;
}

const greetingFor = (hour: number) => {
  if (hour < 5) return { label: "Burning the midnight oil", icon: Moon };
  if (hour < 12) return { label: "Good morning", icon: Sunrise };
  if (hour < 17) return { label: "Good afternoon", icon: Sun };
  if (hour < 21) return { label: "Good evening", icon: Sun };
  return { label: "Good night", icon: Moon };
};

const initials = (name?: string | null) => {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
};

/**
 * Cinematic dashboard header. Gold gradient aura, glassy plate,
 * time-aware greeting, halo avatar with role badge, and slots
 * for actions and a footer strip (streak, tokens, etc.).
 */
export const DashboardHero = ({
  role,
  fullName,
  avatarUrl,
  coverUrl,
  subtitle,
  actions,
  footer,
  className,
}: DashboardHeroProps) => {
  const hour = new Date().getHours();
  const { label: greet, icon: GreetIcon } = greetingFor(hour);
  const badge = ROLE_BADGE[role];
  const firstName = fullName?.split(" ")[0] || "there";

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-amber-100/60",
        "bg-gradient-to-br from-white via-amber-50/40 to-white",
        "shadow-[0_8px_40px_-16px_rgba(180,140,40,0.35)]",
        "p-5 md:p-8",
        className
      )}
    >
      {/* Decorative gold orbs */}
      <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-gradient-to-br from-amber-300/40 via-amber-400/20 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-gradient-to-tr from-amber-200/30 via-yellow-200/10 to-transparent blur-3xl" />
      {/* LinkedIn-style cover band (subtle, behind everything) */}
      {coverUrl && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28 md:h-36 overflow-hidden"
          aria-hidden
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${coverUrl})` }}
          />
          {/* Soft gold/white wash so foreground text stays readable */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/55 via-white/70 to-white" />
          <div className="absolute inset-0 bg-gradient-to-r from-amber-50/30 via-transparent to-amber-50/30" />
        </div>
      )}
      {/* Faint gold grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(180,140,40,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(180,140,40,0.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="relative flex flex-col md:flex-row md:items-center gap-5 md:gap-7">
        {/* Avatar with halo + role badge */}
        <div className="relative shrink-0">
          <div className={cn("absolute -inset-1.5 rounded-full bg-gradient-to-br blur-md opacity-70", badge.gradient)} />
          <Avatar className={cn("relative h-16 w-16 md:h-20 md:w-20 ring-4 ring-white", badge.ring)}>
            <AvatarImage src={avatarUrl ?? undefined} alt={fullName ?? "User avatar"} />
            <AvatarFallback className={cn("text-white font-semibold bg-gradient-to-br", badge.gradient)}>
              {initials(fullName)}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider text-white shadow-md",
              "bg-gradient-to-r",
              badge.gradient
            )}
          >
            {badge.label}
          </span>
        </div>

        {/* Greeting block */}
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 border border-amber-200/50 backdrop-blur text-xs font-medium text-amber-900 shadow-sm">
            <GreetIcon className="h-3.5 w-3.5 text-amber-600" />
            <span>{greet}</span>
            <Sparkles className="h-3 w-3 text-amber-500" />
          </div>
          <h1 className="mt-2 font-serif text-2xl md:text-4xl font-semibold tracking-tight text-foreground leading-tight">
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-amber-700 via-amber-600 to-amber-500 bg-clip-text text-transparent">
              {firstName}
            </span>
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm md:text-[15px] text-muted-foreground max-w-xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Actions slot */}
        {actions && (
          <div className="flex flex-wrap gap-2 md:gap-3 md:items-center md:justify-end">
            {actions}
          </div>
        )}
      </div>

      {footer && (
        <div className="relative mt-5 pt-5 border-t border-amber-100/60">
          {footer}
        </div>
      )}
    </motion.section>
  );
};

export default DashboardHero;
