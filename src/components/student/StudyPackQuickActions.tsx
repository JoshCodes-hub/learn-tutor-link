import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ClipboardCheck, Headphones, Layers, Bot, Library, FolderOpen,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "violet" | "emerald" | "orange" | "sky" | "rose" | "amber";

const TONES: Record<Tone, { bg: string; icon: string; ring: string }> = {
  violet:  { bg: "bg-violet-50",  icon: "text-violet-600",  ring: "ring-violet-100" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", ring: "ring-emerald-100" },
  orange:  { bg: "bg-orange-50",  icon: "text-orange-600",  ring: "ring-orange-100" },
  sky:     { bg: "bg-sky-50",     icon: "text-sky-600",     ring: "ring-sky-100" },
  rose:    { bg: "bg-rose-50",    icon: "text-rose-600",    ring: "ring-rose-100" },
  amber:   { bg: "bg-amber-50",   icon: "text-amber-600",   ring: "ring-amber-100" },
};

interface Tile {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  to: string;
  tone: Tone;
}

const TILES: Tile[] = [
  { icon: ClipboardCheck, title: "Practice Quiz",  subtitle: "Test your knowledge",  to: "/student/readiness", tone: "violet" },
  { icon: Headphones,     title: "Audio Reader",   subtitle: "Listen to your notes", to: "/audio-learning",    tone: "emerald" },
  { icon: Layers,         title: "Flashcards",     subtitle: "Smart revision",       to: "/flashcards",        tone: "orange" },
  { icon: Bot,            title: "AI Tutor",       subtitle: "Ask anything",         to: "/ai-tutor",          tone: "sky" },
  { icon: Library,        title: "My Library",     subtitle: "Saved resources",      to: "/library",           tone: "rose" },
  { icon: FolderOpen,     title: "Study Packs",    subtitle: "My generated packs",   to: "/study-packs",       tone: "amber" },
];

export const StudyPackQuickActions = () => {
  const navigate = useNavigate();

  return (
    <section aria-label="Quick actions" className="mb-6">
      <div className="flex items-end justify-between mb-3 px-0.5">
        <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground">
          Quick Actions
        </h3>
        <button
          type="button"
          onClick={() => navigate("/study-hub")}
          className="text-xs sm:text-sm font-semibold text-amber-700 hover:text-amber-800 transition-colors"
        >
          View all
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {TILES.map((t, i) => {
          const tone = TONES[t.tone];
          return (
            <motion.button
              key={t.title}
              type="button"
              onClick={() => navigate(t.to)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.96 }}
              className="group relative flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card p-3 sm:p-4 text-center shadow-[0_2px_10px_-6px_rgba(0,0,0,0.08)] hover:shadow-[0_10px_24px_-12px_rgba(0,0,0,0.18)] hover:border-amber-200 transition-all min-h-[112px] sm:min-h-[128px]"
            >
              <div
                className={cn(
                  "h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center ring-4",
                  tone.bg, tone.ring
                )}
              >
                <t.icon className={cn("h-6 w-6 sm:h-7 sm:w-7", tone.icon)} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="text-[12px] sm:text-sm font-bold text-foreground leading-tight">
                  {t.title}
                </div>
                <div className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-1">
                  {t.subtitle}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

export default StudyPackQuickActions;
