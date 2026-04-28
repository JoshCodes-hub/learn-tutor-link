import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import SplashScreen from "@/components/SplashScreen";
import AnimatedRoutes from "@/components/layout/AnimatedRoutes";
import BiometricUnlock from "@/components/native/BiometricUnlock";
import OfflineBanner from "@/components/native/OfflineBanner";
import BottomTabBar from "@/components/app-shell/BottomTabBar";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { NetworkStatus } from "@/components/system/NetworkStatus";
import ScrollToTop from "@/components/system/ScrollToTop";
import PageViewTracker from "@/components/system/PageViewTracker";
import { initPushNotifications } from "@/lib/native/push";
import { Capacitor } from "@capacitor/core";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 1,
      gcTime: 1000 * 60 * 10,
    },
  },
});

// Auto-register push when a user signs in (native only).
function PushBootstrap() {
  const { user } = useAuth();
  useEffect(() => {
    if (user?.id && Capacitor.isNativePlatform()) {
      initPushNotifications(user.id);
    }
  }, [user?.id]);
  return null;
}

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    const lastSplash = localStorage.getItem("lastSplashShown");
    if (!lastSplash) return true;
    const hoursSinceLastSplash = (Date.now() - parseInt(lastSplash)) / (1000 * 60 * 60);
    return hoursSinceLastSplash > 24;
  });

  const handleSplashComplete = () => {
    localStorage.setItem("lastSplashShown", Date.now().toString());
    setShowSplash(false);
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <InstallPrompt />
          <OfflineBanner />
          <NetworkStatus />
          {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
          <BrowserRouter>
            <ScrollToTop />
            <PageViewTracker />
            <AuthProvider>
              <PushBootstrap />
              <BiometricUnlock>
                <PaymentTestModeBanner />
                <div className="pb-16 md:pb-0">
                  <AnimatedRoutes />
                </div>
                <BottomTabBar />
              </BiometricUnlock>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
