import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo/SEO";
import RoleSelectionCards, { type IntendedRole } from "@/components/auth/RoleSelectionCards";
import { logSecurityEvent } from "@/lib/securityAudit";
import logo from "@/assets/logo.png";

const ROLE_HOME: Record<IntendedRole, string> = {
  student: "/student/dashboard",
  tutor: "/tutor/dashboard",
  admin: "/admin/dashboard",
};

/**
 * Role hub. Lets the user explicitly choose where to go (defaulting to
 * Student). RoleRoute on each destination enforces actual permissions —
 * picking "Admin" without the admin role still hits the Access Blocked
 * screen. Selection is purely a navigation hint, not a privilege grant.
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, primaryRole, isLoading, signOut, hasRole } = useAuth();
  const [selected, setSelected] = useState<IntendedRole>("student");

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    // Pre-select the user's strongest role, but never escalate above what
    // they actually have. Default stays "student".
    if (hasRole("admin")) setSelected("admin");
    else if (hasRole("tutor")) setSelected("tutor");
    else setSelected("student");
  }, [user, isLoading, hasRole, navigate]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  const handleContinue = async () => {
    await logSecurityEvent(user.id, "role_selected", {
      intended_role: selected,
      current_role: primaryRole,
      from: "dashboard_hub",
    });
    navigate(ROLE_HOME[selected]);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth?reason=switch", { replace: true });
  };

  return (
    <>
      <SEO
        title="Choose your view"
        description="Pick which OverraPrep workspace to enter."
        noindex
        url="https://overraprep.com/dashboard"
      />
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <img src={logo} alt="OverraPrep" className="h-9 w-auto" />
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-1.5" /> Sign out
            </Button>
          </div>

          <h1 className="font-display text-2xl font-bold mb-1">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Choose how you'd like to use OverraPrep. You can always switch later.
          </p>

          <RoleSelectionCards value={selected} onChange={setSelected} size="md" />

          <p className="text-xs text-muted-foreground mt-3">
            Signed in as <span className="font-semibold capitalize">{primaryRole || "student"}</span>.
            Picking a role you don't have will show an Access Blocked message instead of granting access.
          </p>

          <Button className="w-full mt-6" size="lg" onClick={handleContinue}>
            Continue as {selected[0].toUpperCase() + selected.slice(1)}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
