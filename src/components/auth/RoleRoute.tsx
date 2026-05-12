import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

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
  const { user, isLoading, primaryRole, hasRole } = useAuth();
  const location = useLocation();

  const allowed =
    !!user &&
    (hasRole("admin") || (primaryRole && allow.includes(primaryRole as AppRole)));

  const denied = !isLoading && !!user && !allowed;

  useEffect(() => {
    if (denied) {
      toast({
        variant: "destructive",
        title: "Wrong role for this page",
        description: `You're signed in as ${
          ROLE_LABEL[primaryRole || "student"] || "a user"
        }. This area requires: ${allow.map((r) => ROLE_LABEL[r] || r).join(", ")}.`,
      });
    }
  }, [denied, primaryRole, allow]);

  if (isLoading) {
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
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
};

export default RoleRoute;