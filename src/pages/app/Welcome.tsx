import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SplashScreen from "@/components/SplashScreen";
import Ambassadors from "@/pages/app/Ambassadors";
import { SEO } from "@/components/seo/SEO";

/**
 * Native-style entry. Flow:
 *   1. Signed in   → redirect to role dashboard
 *   2. First visit → SplashScreen → WelcomeCarousel → /start
 *   3. Returning   → straight to /start
 */
const Welcome = () => {
  const navigate = useNavigate();
  const { user, primaryRole, isLoading } = useAuth();

  // Always show splash on app open (per brand requirement)
  const [showSplash, setShowSplash] = useState(true);

  // Redirect signed-in users to their dashboard
  useEffect(() => {
    if (isLoading || !user) return;
    if (primaryRole === "admin") navigate("/admin/dashboard", { replace: true });
    else if (primaryRole === "tutor") navigate("/tutor/dashboard", { replace: true });
    else if ((primaryRole as any) === "school_owner") navigate("/school/dashboard", { replace: true });
    else if ((primaryRole as any) === "parent") navigate("/parent/dashboard", { replace: true });
    else if (primaryRole === "student") navigate("/student/dashboard", { replace: true });
  }, [user, primaryRole, isLoading, navigate]);

  const handleSplashDone = () => {
    try {
      localStorage.setItem("lastSplashShown", Date.now().toString());
    } catch {}
    setShowSplash(false);
  };

  return (
    <>
      <SEO title="Welcome" description="OverraPrep AI — the smart learning and school management app." noindex url="/" />
      {showSplash ? (
        <SplashScreen onComplete={handleSplashDone} />
      ) : (
        <Ambassadors />
      )}
    </>
  );
};

export default Welcome;
