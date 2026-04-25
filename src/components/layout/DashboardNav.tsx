import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Brain,
  GraduationCap,
  Trophy,
  Users,
  User,
  Library,
  Shield,
  ClipboardCheck,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ScrollArea,
  ScrollBar,
} from "@/components/ui/scroll-area";

type Role = "admin" | "tutor" | "student";

interface DashboardNavProps {
  role: Role;
}

const linksByRole: Record<Role, { to: string; label: string; icon: React.ComponentType<{ className?: string }> }[]> = {
  student: [
    { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/study-hub", label: "Study Hub", icon: Library },
    { to: "/theory", label: "Theory Prep", icon: BookOpen },
    { to: "/tutors", label: "Tutors", icon: GraduationCap },
    { to: "/community", label: "Community", icon: Users },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/profile/edit", label: "Profile", icon: User },
  ],
  tutor: [
    { to: "/tutor/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/study-hub", label: "Study Hub", icon: Library },
    { to: "/theory", label: "Theory Prep", icon: BookOpen },
    { to: "/community", label: "Community", icon: Users },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/profile/edit", label: "Profile", icon: User },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: Shield },
    { to: "/admin/applications", label: "Applications", icon: ClipboardCheck },
    { to: "/admin/startup-checklist", label: "Startup Check", icon: CheckCircle2 },
    { to: "/tutors", label: "Tutors", icon: GraduationCap },
    { to: "/study-hub", label: "Study Hub", icon: Library },
    { to: "/theory", label: "Theory Prep", icon: BookOpen },
    { to: "/community", label: "Community", icon: Users },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ],
};

export const DashboardNav = ({ role }: DashboardNavProps) => {
  const location = useLocation();
  const links = linksByRole[role];

  return (
    <nav aria-label="Dashboard navigation" className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <ScrollArea className="w-full">
          <div className="flex items-center gap-1 py-2">
            {links.map(({ to, label, icon: Icon }) => {
              const isActive =
                location.pathname === to ||
                (to !== "/" && location.pathname.startsWith(to + "/"));
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </nav>
  );
};

export default DashboardNav;
