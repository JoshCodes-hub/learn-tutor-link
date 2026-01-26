import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import SplashScreen from "@/components/SplashScreen";
import AnimatedRoutes from "@/components/layout/AnimatedRoutes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 1, // 1 minute - reduced for fresher data
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash on first visit or after 24 hours
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <InstallPrompt />
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
        <BrowserRouter>
          <AuthProvider>
            <AnimatedRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
