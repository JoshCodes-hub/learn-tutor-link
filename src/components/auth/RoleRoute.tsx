import { ReactNode, useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Loader2, ShieldAlert, ArrowRight, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { logSecurityEvent } from "@/lib/securityAudit";
import { Button } from "@/components/ui/button";

type AppRole = "student" | "tutor" | "admin" | "school_owner" | "school_admin" | "teacher" | "parent";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin/dashboard",
  tutor: "/tutor/dashboard",
  student: "/student/dashboard",
  school_owner: "/school/dashboard",
  school_admin: "/school/dashboard",
  teacher: "/school/dashboard",
  parent: "/parent/dashboard",
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  tutor: "Tutor",
  student: "Student",
  school_owner: "School Owner",
  school_admin: "School Admin",
  teacher: "Teacher",
  parent: "Parent",
};

/**
 * Restrict a route to specific app roles. Admins always pass.
 * - Unauthenticated → /auth with redirect-back
 * - Wrong role → toast + redirect to that role's home dashboard
 */
export const RoleRoute = ({
  allow,
  children,
}: {
  allow: AppRole[];
  children: ReactNode;
}) => {
  const { user, isLoading, primaryRole, hasRole, signOut, roles } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const allowed =
    !!user &&
    (hasRole("admin") || (primaryRole && allow.includes(primaryRole as AppRole)));

  // Roles load async after the session resolves. Treat "user but no roles yet"
  // as still-loading so we don't flash the Access Blocked screen.
  const rolesLoading = !!user && roles.length === 0 && !primaryRole;
  const denied = !isLoading && !rolesLoading && !!user && !allowed;

  useEffect(() => {
    if (denied) {
      toast({
        variant: "destructive",
        title: "Wrong role for this page",
        description: `You're signed in as ${
          ROLE_LABEL[primaryRole || "student"] || "a user"
        }. This area requires: ${allow.map((r) => ROLE_LABEL[r] || r).join(", ")}.`,
      });
      void logSecurityEvent(user!.id, "role_blocked", {
        current_role: primaryRole,
        required_roles: allow,
        attempted_path: location.pathname,
      });
    }
  }, [denied, primaryRole, allow]);

  if (isLoading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Checking access…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?redirect=${redirect}`} replace />;
  }

  if (!allowed) {
    const home = ROLE_HOME[primaryRole || "student"] || "/student/dashboard";
    const required = allow.map((r) => ROLE_LABEL[r] || r).join(" or ");
    const current = ROLE_LABEL[primaryRole || "student"] || "your account";
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div
          role="alert"
          aria-live="polite"
          className="max-w-md w-full text-center bg-card border border-border rounded-2xl p-8 shadow-xl"
        >
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">Access blocked</h1>
          <p className="text-sm text-muted-foreground mb-1">
            This page requires the <span className="font-semibold text-foreground">{required}</span> role.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            You're currently signed in as <span className="font-semibold text-foreground">{current}</span>.
            We'll send you to <span className="font-mono text-xs">{home}</span>.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button className="flex-1" onClick={() => navigate(home, { replace: true })}>
              Go to my dashboard <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={async () => {
                await logSecurityEvent(user.id, "role_switch", {
                  from_role: primaryRole,
                  reason: "blocked_page",
                  attempted_path: location.pathname,
                });
                await signOut();
                navigate("/auth?reason=switch", { replace: true });
              }}
            >
              <LogOut className="w-4 h-4 mr-2" /> Switch account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleRoute;