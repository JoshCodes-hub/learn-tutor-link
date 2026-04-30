import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Clock, XCircle, LogOut, Mail } from "lucide-react";
import logo from "@/assets/logo.png";

/**
 * If a signed-in user has a tutor application that is pending or rejected
 * AND does not yet have the tutor or admin role, block all app access and
 * show a status screen. They must wait for an admin decision before they
 * can use the platform.
 */
export const TutorPendingGate = ({ children }: { children: ReactNode }) => {
  const { user, isLoading, hasRole, signOut, primaryRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [appStatus, setAppStatus] = useState<"pending" | "rejected" | null>(null);
  const [adminNotes, setAdminNotes] = useState<string | null>(null);

  // Routes the blocked user can still visit
  const exemptPaths = ["/auth", "/forgot-password", "/reset-password", "/terms", "/privacy"];
  const isExempt = exemptPaths.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (isLoading) return;
      if (!user) {
        setChecking(false);
        setAppStatus(null);
        return;
      }
      // Tutors and admins are never blocked
      if (hasRole("tutor") || hasRole("admin")) {
        setChecking(false);
        setAppStatus(null);
        return;
      }
      const { data } = await supabase
        .from("tutor_applications")
        .select("status, admin_notes")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (data && (data.status === "pending" || data.status === "rejected")) {
        setAppStatus(data.status as "pending" | "rejected");
        setAdminNotes(data.admin_notes ?? null);
      } else {
        setAppStatus(null);
      }
      setChecking(false);
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [user, isLoading, hasRole, primaryRole]);

  if (isLoading || checking) {
    if (!user) return <>{children}</>;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || !appStatus || isExempt) return <>{children}</>;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  const isPending = appStatus === "pending";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-lg">
        <img src={logo} alt="OverraPrep" className="h-12 w-auto mx-auto mb-6" />
        <div
          className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
            isPending ? "bg-amber-100 text-amber-600" : "bg-destructive/10 text-destructive"
          }`}
        >
          {isPending ? <Clock className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          {isPending ? "Application Under Review" : "Application Not Approved"}
        </h1>
        <p className="text-muted-foreground mb-4">
          {isPending
            ? "Thanks for applying to become a tutor. An administrator is reviewing your application. You'll be able to sign in and access your tutor dashboard as soon as it's approved."
            : "Unfortunately your tutor application was not approved at this time."}
        </p>
        {adminNotes && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4 text-left">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
              Admin notes
            </p>
            <p className="text-sm text-foreground">{adminNotes}</p>
          </div>
        )}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
          <Mail className="w-4 h-4" />
          <span>We'll email you with the decision</span>
        </div>
        <Button variant="outline" className="w-full" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );
};

export default TutorPendingGate;
