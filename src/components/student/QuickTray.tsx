import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap, Layers, Users, Wallet, MessageSquare, Grid3x3,
  Play, Target, History, Bookmark,
  Library, FileText, Headphones, MessageCircle, Brain, LifeBuoy,
  UserSearch, Star, Hash, BookOpenCheck,
  Coins, Share2, Send, Crown,
  Sparkles, Trophy, Bell, Compass,
  CloudDownload,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";

type Tone = "gold" | "emerald" | "sapphire" | "violet" | "rose" | "orange";

const TONES: Record<Tone, { bg: string; ring: string; icon: string }> = {
  gold:     { bg: "from-amber-100 to-amber-200",     ring: "ring-amber-300/60",  icon: "text-amber-700" },
  emerald:  { bg: "from-emerald-100 to-emerald-200", ring: "ring-emerald-300/60",icon: "text-emerald-700" },
  sapphire: { bg: "from-sky-100 to-sky-200",         ring: "ring-sky-300/60",    icon: "text-sky-700" },
  violet:   { bg: "from-violet-100 to-violet-200",   ring: "ring-violet-300/60", icon: "text-violet-700" },
  rose:     { bg: "from-rose-100 to-rose-200",       ring: "ring-rose-300/60",   icon: "text-rose-700" },
  orange:   { bg: "from-orange-100 to-orange-200",   ring: "ring-orange-300/60", icon: "text-orange-700" },
};

interface SubItem {
  icon: LucideIcon;
  label: string;
  desc?: string;
  to: string;
  tone: Tone;
  badge?: string;
}

interface Category {
  key: string;
  icon: LucideIcon;
  label: string;
  tone: Tone;
  hint: string;
  items: SubItem[];
}

const CATEGORIES: Category[] = [
  {
    key: "practice",
    icon: GraduationCap,
    label: "Practice",
    tone: "gold",
    hint: "Sharpen your skills",
    items: [
      { icon: Play,         label: "CBT Exams",     desc: "Full timed simulation",   to: "/student/readiness", tone: "gold", badge: "Hot" },
      { icon: Target,       label: "Weak Areas",    desc: "Drill what you missed",   to: "/student/mastery",   tone: "sapphire" },
      { icon: BookOpenCheck,label: "Theory Prep",   desc: "Long-form questions",     to: "/theory",            tone: "rose" },
      { icon: History,      label: "Quiz History",  desc: "Past attempts",           to: "/student/report-card", tone: "orange" },
      { icon: Bookmark,     label: "Bookmarks",     desc: "Saved questions",         to: "/student/dashboard#bookmarks", tone: "violet" },
    ],
  },
  {
    key: "learn",
    icon: Layers,
    label: "Learn",
    tone: "violet",
    hint: "Notes, audio & AI tutor",
    items: [
      { icon: Library,      label: "Study Hub",     desc: "Your study packs",        to: "/study-hub",     tone: "violet" },
      { icon: FileText,     label: "Lecture Notes", desc: "Tutor uploads",           to: "/lecture-notes", tone: "sapphire" },
      { icon: Headphones,   label: "Audio Reader",  desc: "Listen to your notes",    to: "/audio-learning",tone: "emerald" },
      { icon: Brain,        label: "Flashcards",    desc: "Smart revision",          to: "/flashcards",    tone: "rose" },
      { icon: MessageCircle,label: "AI Tutor",      desc: "Ask anything",            to: "/ai-tutor",      tone: "gold", badge: "AI" },
      { icon: LifeBuoy,     label: "Survival Kit",  desc: "Last-minute help",        to: "/survival-kits", tone: "orange" },
    ],
  },
  {
    key: "tutors",
    icon: Users,
    label: "Tutors",
    tone: "emerald",
    hint: "Find & follow experts",
    items: [
      { icon: UserSearch,   label: "Browse Tutors", desc: "Discover top tutors",     to: "/tutors",        tone: "emerald" },
      { icon: Star,         label: "My Tutors",     desc: "Follows & favourites",    to: "/student/dashboard#favorite-tutors", tone: "gold" },
      { icon: Hash,         label: "Communities",   desc: "Join private groups",     to: "/community",     tone: "violet" },
      { icon: FileText,     label: "Tutor Notes",   desc: "Materials & PDFs",        to: "/lecture-notes", tone: "sapphire" },
    ],
  },
  {
    key: "wallet",
    icon: Wallet,
    label: "Wallet",
    tone: "orange",
    hint: "Tokens & rewards",
    items: [
      { icon: Coins,        label: "Tokens",        desc: "Buy & manage balance",    to: "/student/dashboard#wallet", tone: "gold" },
      { icon: Share2,       label: "Refer & Earn",  desc: "Invite, get rewarded",    to: "/student/dashboard#referral", tone: "violet", badge: "Earn" },
      { icon: Send,         label: "Transfers",     desc: "Send tokens by email",    to: "/student/dashboard#wallet", tone: "sapphire" },
      { icon: Crown,        label: "Subscription",  desc: "Premium plans",           to: "/student/dashboard#wallet", tone: "rose" },
    ],
  },
  {
    key: "community",
    icon: MessageSquare,
    label: "Community",
    tone: "sapphire",
    hint: "Learn together",
    items: [
      { icon: MessageSquare,label: "Brainstorm",    desc: "Open discussions",        to: "/community-wall",tone: "sapphire" },
      { icon: Hash,         label: "Course Rooms",  desc: "Per-course chats",        to: "/community",     tone: "violet" },
      { icon: Sparkles,     label: "Ask AI",        desc: "@AI in any thread",       to: "/ai-tutor",      tone: "gold", badge: "AI" },
      { icon: Trophy,       label: "Leaderboard",   desc: "Top scholars",            to: "/leaderboard",   tone: "orange" },
    ],
  },
  {
    key: "more",
    icon: Grid3x3,
    label: "More",
    tone: "rose",
    hint: "Tools & settings",
    items: [
      { icon: CloudDownload,label: "Offline Files",  desc: "Manage cached materials", to: "/library/offline-downloads", tone: "emerald" },
      { icon: History,      label: "AI History",     desc: "Search & export AI runs", to: "/ai-history",       tone: "violet" },
      { icon: Compass,      label: "Strategy",      desc: "Study smarter",           to: "/strategy",      tone: "emerald" },
      { icon: Trophy,       label: "Achievements",  desc: "Badges & XP",             to: "/student/dashboard#achievements", tone: "gold" },
      { icon: Bell,         label: "Announcements", desc: "Platform news",           to: "/announcements", tone: "rose" },
      { icon: BookOpenCheck,label: "Subjects",      desc: "Browse all courses",      to: "/subjects",      tone: "violet" },
    ],
  },
];

export const QuickTray = () => {
  const navigate = useNavigate();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const active = CATEGORIES.find((c) => c.key === openKey) ?? null;

  const go = (to: string) => {
    setOpenKey(null);
    if (to.includes("#")) {
      const [path, hash] = to.split("#");
      navigate(path);
      setTimeout(() => {
        const el = document.getElementById(hash);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 220);
    } else {
      navigate(to);
    }
  };

  return (
    <section aria-label="Quick access" className="mb-8">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="font-serif text-xl md:text-2xl font-semibold tracking-tight text-foreground">
            Quick access
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tap a category to open its toolkit.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-amber-100/70 bg-gradient-to-br from-white via-white to-amber-50/40 p-4 md:p-5 shadow-[0_2px_18px_-8px_rgba(180,140,40,0.22)]">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 md:gap-4">
          {CATEGORIES.map((cat, i) => {
            const t = TONES[cat.tone];
            return (
              <motion.button
                key={cat.key}
                type="button"
                onClick={() => setOpenKey(cat.key)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.94 }}
                className="group flex flex-col items-center gap-2 p-1"
              >
                <div
                  className={cn(
                    "h-16 w-16 md:h-18 md:w-18 rounded-2xl bg-gradient-to-br shadow-sm ring-1 flex items-center justify-center transition-all duration-300 group-hover:shadow-lg group-hover:scale-105",
                    t.bg,
                    t.ring
                  )}
                >
                  <cat.icon className={cn("h-7 w-7 md:h-8 md:w-8", t.icon)} strokeWidth={2} />
                </div>
                <span className="text-xs md:text-sm font-semibold text-foreground text-center leading-tight">
                  {cat.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <Sheet open={!!openKey} onOpenChange={(v) => !v && setOpenKey(null)}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t border-amber-200/70 bg-white max-h-[85vh] overflow-y-auto"
        >
          {active && (
            <>
              <SheetHeader className="text-left mb-2">
                <SheetTitle className="font-serif text-2xl font-semibold flex items-center gap-2">
                  <span className={cn(
                    "inline-flex h-9 w-9 rounded-xl items-center justify-center bg-gradient-to-br ring-1",
                    TONES[active.tone].bg, TONES[active.tone].ring
                  )}>
                    <active.icon className={cn("h-5 w-5", TONES[active.tone].icon)} />
                  </span>
                  {active.label}
                </SheetTitle>
                <SheetDescription>{active.hint}</SheetDescription>
              </SheetHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-2 pb-[max(env(safe-area-inset-bottom),1rem)]">
                {active.items.map((item, i) => {
                  const t = TONES[item.tone];
                  return (
                    <motion.button
                      key={item.label}
                      type="button"
                      onClick={() => go(item.to)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-3 p-3 rounded-2xl border border-border/60 bg-white hover:bg-amber-50/50 hover:border-amber-200 transition-all text-left"
                    >
                      <div className={cn(
                        "h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br ring-1 flex items-center justify-center",
                        t.bg, t.ring
                      )}>
                        <item.icon className={cn("h-5 w-5", t.icon)} strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-foreground truncate">{item.label}</span>
                          {item.badge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.desc && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.desc}</p>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
};

export default QuickTray;
