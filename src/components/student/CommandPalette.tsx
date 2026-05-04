import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Play, Target, Brain, Layers, BookOpen, Flame, Library, FileText,
  Headphones, MessageSquare, LifeBuoy, Compass, GraduationCap, Users,
  Share2, Trophy, Star, Sparkles, User, Coins, LayoutDashboard,
  Search, type LucideIcon,
} from "lucide-react";

interface Cmd {
  icon: LucideIcon;
  label: string;
  to: string;
  group: string;
  keywords?: string;
  hint?: string;
}

const COMMANDS: Cmd[] = [
  // Practice
  { icon: Play, label: "CBT Simulation", to: "/student/readiness", group: "Practice & Exams", keywords: "exam timed mock test cbt simulation", hint: "Timed mock exam" },
  { icon: Target, label: "Weak Areas", to: "/student/mastery", group: "Practice & Exams", keywords: "weak mastery breakdown improve", hint: "Drill what needs work" },
  { icon: Brain, label: "Flashcards", to: "/flashcards", group: "Practice & Exams", keywords: "flash cards memorize spaced repetition" },
  { icon: Layers, label: "Subjects", to: "/subjects", group: "Practice & Exams", keywords: "courses topics browse" },
  { icon: BookOpen, label: "Theory Prep", to: "/theory", group: "Practice & Exams", keywords: "theory essay long answer" },
  { icon: Flame, label: "My Report Card", to: "/student/report-card", group: "Practice & Exams", keywords: "report card grades performance" },
  { icon: Play, label: "Offline Practice", to: "/student/offline", group: "Practice & Exams", keywords: "offline no internet download" },

  // Learn
  { icon: Library, label: "Study Hub", to: "/study-hub", group: "Learn", keywords: "study materials notes upload" },
  { icon: FileText, label: "Lecture Notes", to: "/lecture-notes", group: "Learn", keywords: "notes pdf tutor materials" },
  { icon: Headphones, label: "Audio Learning", to: "/audio-learning", group: "Learn", keywords: "audio listen tts text to speech podcast" },
  { icon: MessageSquare, label: "AI Tutor", to: "/ai-tutor", group: "Learn", keywords: "ai chatbot ask gemini chat assistant", hint: "Chat with AI" },
  { icon: LifeBuoy, label: "Survival Kits", to: "/survival-kits", group: "Learn", keywords: "survival kit cheatsheet quick" },
  { icon: Compass, label: "Strategy", to: "/strategy", group: "Learn", keywords: "strategy plan study plan" },

  // Community
  { icon: GraduationCap, label: "Browse Tutors", to: "/tutors", group: "Community", keywords: "tutor teachers find" },
  { icon: Users, label: "Community", to: "/community", group: "Community", keywords: "community group discuss" },
  { icon: Share2, label: "Q&A Board", to: "/qa", group: "Community", keywords: "questions answers ask board" },
  { icon: Trophy, label: "Leaderboard", to: "/leaderboard", group: "Community", keywords: "ranking top students compete" },
  { icon: MessageSquare, label: "Messages", to: "/messages", group: "Community", keywords: "inbox dm chat" },

  // Account
  { icon: LayoutDashboard, label: "Dashboard", to: "/student/dashboard", group: "Account", keywords: "home dashboard overview" },
  { icon: User, label: "Edit Profile", to: "/profile/edit", group: "Account", keywords: "profile settings account edit" },
  { icon: Coins, label: "Buy Tokens", to: "/student/dashboard#tokens", group: "Account", keywords: "tokens buy wallet credits pay" },
  { icon: Star, label: "Achievements", to: "/student/dashboard#achievements", group: "Account", keywords: "badges achievements rewards" },
  { icon: Sparkles, label: "Refer & Earn", to: "/student/dashboard#referral", group: "Account", keywords: "referral invite earn friends" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CommandPalette = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();

  const groups = useMemo(() => {
    const map = new Map<string, Cmd[]>();
    for (const c of COMMANDS) {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push(c);
    }
    return Array.from(map.entries());
  }, []);

  const go = (to: string) => {
    onOpenChange(false);
    if (to.includes("#")) {
      const [path, hash] = to.split("#");
      navigate(path);
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    } else {
      navigate(to);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search features… try 'flashcards', 'AI tutor', 'weak areas'" />
      <CommandList>
        <CommandEmpty>No results. Try a different word.</CommandEmpty>
        {groups.map(([group, items], gi) => (
          <div key={group}>
            {gi > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {items.map((c) => (
                <CommandItem
                  key={c.label}
                  value={`${c.label} ${c.keywords ?? ""}`}
                  onSelect={() => go(c.to)}
                  className="gap-3 cursor-pointer"
                >
                  <div className="h-8 w-8 rounded-lg bg-amber-50 ring-1 ring-amber-200/70 flex items-center justify-center shrink-0">
                    <c.icon className="h-4 w-4 text-amber-700" strokeWidth={2.2} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">{c.label}</span>
                    {c.hint && (
                      <span className="text-[11px] text-muted-foreground truncate">{c.hint}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
};

/** Standalone search trigger button — opens the palette and shows ⌘K hint. */
export const CommandPaletteTrigger = ({
  onOpen,
  className = "",
}: { onOpen: () => void; className?: string }) => {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform));
  }, []);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Search features"
      className={
        "group flex items-center gap-2.5 h-10 w-full px-3.5 rounded-xl border border-amber-200/60 bg-white/70 backdrop-blur-sm hover:bg-white hover:border-amber-300/80 hover:shadow-[0_4px_20px_-8px_rgba(217,159,0,0.25)] focus:outline-none focus:ring-2 focus:ring-amber-300/60 text-left transition-all duration-200 " +
        className
      }
    >
      <Search className="h-4 w-4 text-amber-600 shrink-0 group-hover:text-amber-700 transition-colors" />
      <span className="flex-1 text-sm text-muted-foreground/80 truncate font-medium">
        Search features, courses, tutors…
      </span>
      <kbd className="hidden md:inline-flex items-center gap-0.5 ml-2 h-6 px-2 rounded-md border border-amber-200/70 bg-amber-50/60 text-[10px] font-mono font-semibold text-amber-700 shadow-sm">
        {isMac ? "⌘" : "Ctrl"}<span>K</span>
      </kbd>
    </button>
  );
};

/** Hook: registers ⌘K / Ctrl+K to open the palette. */
export const useCommandPaletteHotkey = (setOpen: (v: boolean | ((o: boolean) => boolean)) => void) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o: boolean) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);
};

export default CommandPalette;
