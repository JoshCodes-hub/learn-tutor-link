import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone, Share } from "lucide-react";
import logo from "@/assets/logo.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isInStandaloneMode);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if user dismissed the prompt before
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    // Show prompt again after 7 days
    if (dismissed && daysSinceDismissed < 7) {
      return;
    }

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Delay showing the prompt for better UX
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // For iOS, show instructions after a delay if not in standalone
    if (iOS && !isInStandaloneMode && (!dismissed || daysSinceDismissed >= 7)) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error("Install prompt error:", error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  // Don't show if already installed
  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 p-6 pb-12">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-background shadow-lg flex items-center justify-center overflow-hidden">
              <img src={logo} alt="OverraPrep AI" className="w-12 h-12 object-contain" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Install OverraPrep
              </h2>
              <p className="text-sm text-muted-foreground">
                Get the full app experience
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 -mt-6 bg-card rounded-t-3xl relative">
          <div className="space-y-4">
            {/* Benefits */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-primary" />
                </div>
                <span className="text-muted-foreground">Works offline</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Download className="w-4 h-4 text-accent" />
                </div>
                <span className="text-muted-foreground">Fast loading</span>
              </div>
            </div>

            {isIOS ? (
              /* iOS Instructions */
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  To install on your iPhone:
                </p>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">1</span>
                    Tap the <Share className="w-4 h-4 inline mx-1" /> Share button
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">2</span>
                    Scroll down and tap "Add to Home Screen"
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">3</span>
                    Tap "Add" to install
                  </li>
                </ol>
              </div>
            ) : (
              /* Android/Desktop Install Button */
              <Button
                onClick={handleInstall}
                className="w-full h-12 text-base font-semibold"
                disabled={!deferredPrompt}
              >
                <Download className="w-5 h-5 mr-2" />
                Install App
              </Button>
            )}

            <button
              onClick={handleDismiss}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
