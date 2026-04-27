import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

/**
 * Forces logged-in students without an academic_path to complete onboarding.
 * Tutors and admins are exempt (they manage content, not consume by path).
 */
export const AcademicPathGate = ({ children }: { children: ReactNode }) => {
  const { user, profile, primaryRole, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingSpinner />;

  // Not logged in — let downstream routes decide
  if (!user) return <>{children}</>;

  // Tutors & admins skip the gate
  if (primaryRole === "tutor" || primaryRole === "admin") return <>{children}</>;

  const exemptPaths = ["/onboarding/path", "/onboarding/refine", "/onboarding/match", "/auth"];
  const isExempt = exemptPaths.some((p) => location.pathname.startsWith(p));

  if (profile && !profile.academic_path && !isExempt) {
    return <Navigate to="/onboarding/path" replace />;
  }

  // After choosing path, send students through tutor-matching once
  const onboardingDone = (profile as any)?.onboarding_completed;
  if (profile?.academic_path && onboardingDone === false && !isExempt) {
    return <Navigate to="/onboarding/match" replace />;
  }

  return <>{children}</>;
};

export default AcademicPathGate;
