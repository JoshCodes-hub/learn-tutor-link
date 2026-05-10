import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Smartphone, Download, Share, Bell, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo/SEO";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export default function Install() {
  const nav = useNavigate();
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true;

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", handler);
    const installedHandler = () => setInstalled(true);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null);
  };

  const askPush = async () => {
    if (!("Notification" in window)) return;
    await Notification.requestPermission();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background pb-20">
      <SEO title="Install OverraPrep" description="Install OverraPrep AI on your phone" />
      <header className="flex items-center gap-2 px-3 py-3">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-base font-semibold">Install App</h1>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Get OverraPrep on your phone</h2>
          <p className="text-sm text-muted-foreground">
            Install for faster access, offline support, and a real native feel.
          </p>
        </div>

        {isStandalone || installed ? (
          <div className="rounded-xl border bg-card p-6 text-center">
            <Check className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="font-semibold mb-1">You're all set!</h3>
            <p className="text-xs text-muted-foreground">OverraPrep is installed on this device.</p>
          </div>
        ) : isIOS ? (
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Share className="w-4 h-4" /> On iPhone / iPad:
            </p>
            <ol className="text-sm text-muted-foreground space-y-2 pl-4 list-decimal">
              <li>Tap the <strong>Share</strong> button in Safari</li>
              <li>Scroll and tap <strong>"Add to Home Screen"</strong></li>
              <li>Tap <strong>Add</strong> in the top corner</li>
            </ol>
          </div>
        ) : deferred ? (
          <Button size="lg" className="w-full" onClick={install}>
            <Download className="w-5 h-5 mr-2" /> Install OverraPrep
          </Button>
        ) : (
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Open the browser menu and choose <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>.
            </p>
          </div>
        )}

        <div className="mt-6 rounded-xl border bg-card p-5">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Enable notifications</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Get nudged about chat replies, due review cards, and study streaks.
              </p>
              <Button variant="outline" size="sm" onClick={askPush}>Allow notifications</Button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <Feature icon={<Sparkles className="w-5 h-5" />} label="AI Tutor" />
          <Feature icon={<Bell className="w-5 h-5" />} label="Reminders" />
          <Feature icon={<Download className="w-5 h-5" />} label="Offline" />
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex justify-center text-primary mb-1">{icon}</div>
      <p className="text-xs">{label}</p>
    </div>
  );
}
