import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

/**
 * Gate that restricts access to admin-only routes.
 * - Shows loader while auth is resolving
 * - Sends unauthenticated users to /auth with redirect-back
 * - Blocks non-admin authenticated users with a toast + redirect
 */
export const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { user, isLoading, hasRole } = useAuth();
  const location = useLocation();
  const { toast } = useToast();

  const isAdmin = !!user && hasRole("admin");
  const denied = !isLoading && !!user && !isAdmin;

  useEffect(() => {
    if (denied) {
      toast({
        variant: "destructive",
        title: "Access denied",
        description: "Admin privileges are required to view this page.",
      });
    }
  }, [denied, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Verifying admin access…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?redirect=${redirect}`} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center bg-card border border-border rounded-2xl p-8 shadow-xl">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">Admin only</h1>
          <p className="text-sm text-muted-foreground mb-6">
            You don't have permission to access this area.
          </p>
          <Navigate to="/dashboard" replace />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;
