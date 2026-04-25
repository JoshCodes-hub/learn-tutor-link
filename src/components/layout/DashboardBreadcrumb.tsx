import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
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

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "container mx-auto px-4 py-3 flex items-center gap-1.5 text-sm text-muted-foreground overflow-x-auto",
        className
      )}
    >
      <Link
        to={dashboardHome}
        className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors whitespace-nowrap"
      >
        <Home className="w-4 h-4" />
        Dashboard
      </Link>
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <div key={crumb.to} className="inline-flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
            {isLast ? (
              <span aria-current="page" className="font-semibold text-foreground whitespace-nowrap">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.to}
                className="hover:text-primary transition-colors whitespace-nowrap"
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
