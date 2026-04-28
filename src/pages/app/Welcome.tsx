import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SplashScreen from "@/components/SplashScreen";
import WelcomeCarousel from "@/components/onboarding/WelcomeCarousel";
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

  // 24h splash throttle
  const [showSplash, setShowSplash] = useState(() => {
    try {
      const last = localStorage.getItem("lastSplashShown");
      if (!last) return true;
      return (Date.now() - parseInt(last)) / 36e5 > 24;
    } catch {
      return true;
    }
  });

  // First-visit-only carousel
  const [showCarousel, setShowCarousel] = useState(() => {
    try {
      return localStorage.getItem("welcomeSeen") !== "1";
    } catch {
      return true;
    }
  });

  // Redirect signed-in users to their dashboard
  useEffect(() => {
    if (isLoading || !user) return;
    if (primaryRole === "admin") navigate("/admin/dashboard", { replace: true });
    else if (primaryRole === "tutor") navigate("/tutor/dashboard", { replace: true });
    else if ((primaryRole as any) === "school_owner") navigate("/school/dashboard", { replace: true });
    else if (primaryRole === "student") navigate("/student/dashboard", { replace: true });
  }, [user, primaryRole, isLoading, navigate]);

  // When neither splash nor carousel is needed, send to /start
  useEffect(() => {
    if (showSplash || showCarousel) return;
    if (isLoading || user) return;
    navigate("/start", { replace: true });
  }, [showSplash, showCarousel, isLoading, user, navigate]);

  const handleSplashDone = () => {
    try {
      localStorage.setItem("lastSplashShown", Date.now().toString());
    } catch {}
    setShowSplash(false);
  };

  const handleCarouselDone = () => {
    try {
      localStorage.setItem("welcomeSeen", "1");
    } catch {}
    setShowCarousel(false);
    navigate("/start", { replace: true });
  };

  return (
    <>
      <SEO title="Welcome" description="OverraPrep AI — the smart learning and school management app." noindex url="/" />
      {showSplash ? (
        <SplashScreen onComplete={handleSplashDone} />
      ) : showCarousel ? (
        <WelcomeCarousel onFinish={handleCarouselDone} />
      ) : (
        <div className="min-h-screen bg-background" />
      )}
    </>
  );
};

export default Welcome;
