import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Play, Target, FileText, Headphones, MessageSquare, Users,
  GraduationCap, Trophy, Sparkles, BookOpen, Library, Compass,
  Brain, Layers, LifeBuoy, Share2, Flame, Star, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tone =
  | "gold" | "emerald" | "sapphire" | "rose" | "violet"
  | "indigo" | "orange" | "teal" | "pink" | "cyan";

const TONES: Record<Tone, { bg: string; ring: string; icon: string }> = {
  gold:     { bg: "from-amber-100 to-amber-200",     ring: "ring-amber-300/50",  icon: "text-amber-700" },
  emerald:  { bg: "from-emerald-100 to-emerald-200", ring: "ring-emerald-300/50",icon: "text-emerald-700" },
  sapphire: { bg: "from-sky-100 to-sky-200",         ring: "ring-sky-300/50",    icon: "text-sky-700" },
  rose:     { bg: "from-rose-100 to-rose-200",       ring: "ring-rose-300/50",   icon: "text-rose-700" },
  violet:   { bg: "from-violet-100 to-violet-200",   ring: "ring-violet-300/50", icon: "text-violet-700" },
  indigo:   { bg: "from-indigo-100 to-indigo-200",   ring: "ring-indigo-300/50", icon: "text-indigo-700" },
  orange:   { bg: "from-orange-100 to-orange-200",   ring: "ring-orange-300/50", icon: "text-orange-700" },
  teal:     { bg: "from-teal-100 to-teal-200",       ring: "ring-teal-300/50",   icon: "text-teal-700" },
  pink:     { bg: "from-pink-100 to-pink-200",       ring: "ring-pink-300/50",   icon: "text-pink-700" },
  cyan:     { bg: "from-cyan-100 to-cyan-200",       ring: "ring-cyan-300/50",   icon: "text-cyan-700" },
};

interface Feature {
  icon: LucideIcon;
  label: string;
  to: string;
  tone: Tone;
  badge?: string;
}

interface Group {
  title: string;
  hint?: string;
  items: Feature[];
}

const GROUPS: Group[] = [
  {
    title: "Practice & Exams",
    hint: "Sharpen your skills",
    items: [
      { icon: Play,    label: "CBT Sim",     to: "/student/readiness", tone: "gold", badge: "Hot" },
      { icon: Target,  label: "Weak Areas",  to: "/student/mastery",   tone: "sapphire" },
      { icon: Brain,   label: "Flashcards",  to: "/flashcards",        tone: "violet" },
      { icon: Layers,  label: "Subjects",    to: "/subjects",          tone: "emerald" },
      { icon: BookOpen,label: "Theory Prep", to: "/theory",            tone: "rose" },
      { icon: Flame,   label: "My Report",   to: "/student/report-card", tone: "orange" },
    ],
  },
  {
    title: "Learn",
    hint: "Notes, audio & AI tutor",
    items: [
      { icon: Library,    label: "Study Hub",   to: "/study-hub",     tone: "indigo" },
      { icon: FileText,   label: "Lecture Notes", to: "/lecture-notes", tone: "teal" },
      { icon: Headphones, label: "Audio Learn", to: "/audio-learning",tone: "violet" },
      { icon: MessageSquare, label: "AI Tutor", to: "/ai-tutor",      tone: "pink", badge: "AI" },
      { icon: LifeBuoy,   label: "Survival Kit",to: "/survival-kits", tone: "rose" },
      { icon: Compass,    label: "Strategy",    to: "/strategy",      tone: "cyan" },
    ],
  },
  {
    title: "Community & Rewards",
    hint: "Connect, compete, win",
    items: [
      { icon: GraduationCap, label: "Tutors",       to: "/tutors",       tone: "gold" },
      { icon: Users,         label: "Community",    to: "/community",    tone: "emerald" },
      { icon: Share2,        label: "Q&A Board",    to: "/qa",           tone: "sapphire" },
      { icon: Trophy,        label: "Leaderboard",  to: "/leaderboard",  tone: "orange" },
      { icon: Star,          label: "Achievements", to: "/student/dashboard#achievements", tone: "pink" },
      { icon: Sparkles,      label: "Refer & Earn", to: "/student/dashboard#referral", tone: "violet", badge: "Earn" },
    ],
  },
];

export const FeatureGrid = () => {
  const navigate = useNavigate();

  return (
    <section aria-label="All features" className="mb-8 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-serif text-xl md:text-2xl font-semibold tracking-tight text-foreground">
            Everything you need
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tap any tool to jump in — nothing is hidden.
          </p>
        </div>
      </div>

      {GROUPS.map((group, gi) => (
        <div key={group.title}>
          <div className="flex items-baseline justify-between mb-3 px-0.5">
            <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-amber-800/80">
              {group.title}
            </h3>
            {group.hint && (
              <span className="text-[11px] text-muted-foreground">{group.hint}</span>
            )}
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 md:gap-3 rounded-2xl border border-amber-100/70 bg-gradient-to-br from-white via-white to-amber-50/40 p-3 md:p-4 shadow-[0_2px_14px_-6px_rgba(180,140,40,0.18)]">
            {group.items.map((f, i) => {
              const t = TONES[f.tone];
              return (
                <motion.button
                  key={f.label}
                  type="button"
                  onClick={() => {
                    if (f.to.includes("#")) {
                      const [path, hash] = f.to.split("#");
                      navigate(path);
                      setTimeout(() => {
                        const el = document.getElementById(hash);
                        el?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 200);
                    } else navigate(f.to);
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: gi * 0.05 + i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.94 }}
                  className="group relative flex flex-col items-center justify-start gap-1.5 p-1.5 rounded-xl"
                >
                  <div
                    className={cn(
                      "relative h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-gradient-to-br shadow-sm ring-1 flex items-center justify-center transition-all duration-300 group-hover:shadow-lg group-hover:scale-105",
                      t.bg,
                      t.ring
                    )}
                  >
                    <f.icon className={cn("h-5 w-5 md:h-6 md:w-6", t.icon)} strokeWidth={2} />
                    {f.badge && (
                      <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white shadow">
                        {f.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] md:text-xs font-medium text-foreground text-center leading-tight line-clamp-2">
                    {f.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
};

export default FeatureGrid;
