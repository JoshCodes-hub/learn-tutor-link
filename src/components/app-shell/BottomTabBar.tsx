import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, Sparkles, GraduationCap, User, LucideIcon, School, ClipboardCheck, Wallet, Megaphone, Users, Target, Headphones, MessageSquare, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface Tab { to: string; label: string; icon: LucideIcon; }

const STUDENT_TABS: Tab[] = [
  { to: "/student/dashboard", label: "Home",     icon: Home },
  { to: "/student/readiness", label: "Practice", icon: Target },
  { to: "/study-packs",       label: "Study Packs", icon: FolderOpen },
  { to: "/chat",              label: "Chat",     icon: MessageSquare },
  { to: "/profile/edit",      label: "Profile",  icon: User },
];

const SCHOOL_TABS: Tab[] = [
  { to: "/school/dashboard", label: "Overview", icon: School },
  { to: "/school/classes", label: "Classes", icon: BookOpen },
  { to: "/school/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/school/fees", label: "Fees", icon: Wallet },
  { to: "/school/announcements", label: "More", icon: Megaphone },
];

const TEACHER_TABS: Tab[] = [
  { to: "/school/dashboard", label: "Today", icon: Home },
  { to: "/school/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/school/results", label: "Results", icon: ClipboardCheck },
  { to: "/school/announcements", label: "Notices", icon: Megaphone },
  { to: "/profile/edit", label: "Profile", icon: User },
];

const PARENT_TABS: Tab[] = [
  { to: "/parent/dashboard", label: "Child", icon: Users },
  { to: "/school/results", label: "Results", icon: ClipboardCheck },
  { to: "/school/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/school/fees", label: "Fees", icon: Wallet },
  { to: "/profile/edit", label: "Profile", icon: User },
];

const HIDDEN_PREFIXES = ["/auth", "/onboarding", "/start", "/quiz/", "/school/intro", "/school/register", "/school/pending", "/website", "/forgot-password", "/reset-password"];

export const BottomTabBar = () => {
  const { primaryRole, user } = useAuth();
  const location = useLocation();

  if (!user) return null;
  if (HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p))) return null;
  if (location.pathname === "/") return null;

  // Force student tabs on student-area routes regardless of role
  // (so admins/tutors previewing the student dashboard still see the quick footer).
  const isStudentRoute =
    location.pathname.startsWith("/student") ||
    ["/study-packs", "/chat", "/profile/edit", "/notifications", "/library", "/review"].some((p) =>
      location.pathname.startsWith(p)
    );

  let tabs: Tab[];
  if (isStudentRoute) tabs = STUDENT_TABS;
  else if (primaryRole === "school_owner" || primaryRole === "school_admin") tabs = SCHOOL_TABS;
  else if (primaryRole === "teacher") tabs = TEACHER_TABS;
  else if (primaryRole === "parent") tabs = PARENT_TABS;
  else if (primaryRole === "student") tabs = STUDENT_TABS;
  else return null; // admin / tutor keep top nav only on their own routes

  return (
    <nav
      aria-label="Bottom navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/60"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || location.pathname.startsWith(to + "/");
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors min-h-[56px]",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-6 h-6 transition-transform", active && "scale-110")} />
                <span className="leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomTabBar;
