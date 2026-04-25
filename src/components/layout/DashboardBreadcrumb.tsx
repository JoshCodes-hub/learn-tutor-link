import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "admin" | "tutor" | "student";

interface DashboardBreadcrumbProps {
  role: Role;
  className?: string;
}

// Map known routes to friendly labels
const ROUTE_LABELS: Record<string, string> = {
  "study-hub": "Study Hub",
  "theory": "Theory Prep",
  "tutors": "Tutors",
  "community": "Community",
  "leaderboard": "Leaderboard",
  "profile": "Profile",
  "edit": "Edit",
  "admin": "Admin",
  "tutor": "Tutor",
  "student": "Student",
  "dashboard": "Dashboard",
  "applications": "Applications",
  "startup-checklist": "Startup Check",
  "quiz": "Quiz",
  "practice": "Practice",
  "simulation": "Simulation",
  "results": "Results",
  "preview": "Preview",
  "team": "Team",
  "stats": "Stats",
  "pq-intelligence": "PQ Intelligence",
  "apply-tutor": "Apply as Tutor",
};

const formatLabel = (segment: string) =>
  ROUTE_LABELS[segment] ??
  segment
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");

export const DashboardBreadcrumb = ({ role, className }: DashboardBreadcrumbProps) => {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  const dashboardHome = `/${role}/dashboard`;

  // Build cumulative paths
  const crumbs = segments.map((segment, index) => {
    const to = "/" + segments.slice(0, index + 1).join("/");
    return { label: formatLabel(segment), to };
  });

  // If we're already on the dashboard home, hide breadcrumbs
  if (location.pathname === dashboardHome) return null;

  // Collapse middle segments on tiny screens when chain is long
  const shouldCollapse = crumbs.length > 3;
  const visibleCrumbs = shouldCollapse
    ? [crumbs[0], { label: "…", to: "", collapsed: true } as const, crumbs[crumbs.length - 1]]
    : crumbs;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "container mx-auto px-4 py-2 sm:py-3 mt-1 border-t border-border/40",
        "flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs sm:text-sm text-muted-foreground",
        className
      )}
    >
      <Link
        to={dashboardHome}
        className="inline-flex items-center gap-1 sm:gap-1.5 font-medium text-foreground hover:text-primary transition-colors"
      >
        <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <span>Dashboard</span>
      </Link>
      {visibleCrumbs.map((crumb, idx) => {
        const isLast = idx === visibleCrumbs.length - 1;
        const isCollapsed = "collapsed" in crumb && crumb.collapsed;
        return (
          <div key={`${crumb.to}-${idx}`} className="inline-flex items-center gap-1 sm:gap-1.5 min-w-0">
            <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 opacity-60" />
            {isCollapsed ? (
              <span className="inline-flex items-center" aria-hidden="true">
                <MoreHorizontal className="w-3.5 h-3.5 opacity-60" />
              </span>
            ) : isLast ? (
              <span aria-current="page" className="font-semibold text-foreground truncate max-w-[55vw] sm:max-w-none">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.to}
                className="hover:text-primary transition-colors truncate max-w-[40vw] sm:max-w-none"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default DashboardBreadcrumb;
