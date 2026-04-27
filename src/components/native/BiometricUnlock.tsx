import { useEffect, useState } from "react";
import { Fingerprint, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { biometricLogin, getBiometricLabel, isBiometricAvailable, isBiometricEnabled } from "@/lib/native/biometric";
import { useAuth } from "@/hooks/useAuth";
import { Capacitor } from "@capacitor/core";
import logo from "@/assets/logo.png";

/**
 * Lock screen shown on cold app open when biometric quick-login is enabled
 * and there is no active session.
 */
export function BiometricUnlock({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [label, setLabel] = useState("Biometric");
  const [attempting, setAttempting] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!Capacitor.isNativePlatform()) {
        setChecked(true);
        return;
      }
      // Wait for auth bootstrap
      if (isLoading) return;

      const enabled = await isBiometricEnabled();
      const { available } = await isBiometricAvailable();
      const lbl = await getBiometricLabel();
      if (cancelled) return;

      setLabel(lbl);

      if (enabled && available && !session) {
        setNeedsUnlock(true);
        // Auto-prompt
        setAttempting(true);
        const ok = await biometricLogin();
        if (cancelled) return;
        setAttempting(false);
        if (ok) setNeedsUnlock(false);
      }
      setChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoading, session]);

  // Once a session arrives, drop the lock
  useEffect(() => {
    if (session) setNeedsUnlock(false);
  }, [session]);

  if (!checked) return null;
  if (!needsUnlock) return <>{children}</>;

  const Icon = label === "Face ID" || label === "Face Unlock" ? ScanFace : Fingerprint;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6">
      <img src={logo} alt="OverraPrep" className="w-20 h-20 mb-8 rounded-2xl shadow-lg" />
      <h1 className="font-display text-2xl font-bold mb-2">Welcome back</h1>
      <p className="text-sm text-muted-foreground mb-10 text-center">
        Use {label} to unlock OverraPrep
      </p>
      <button
        onClick={async () => {
          setAttempting(true);
          const ok = await biometricLogin();
          setAttempting(false);
          if (ok) setNeedsUnlock(false);
        }}
        disabled={attempting}
        className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center active:scale-95 transition-transform mb-6"
        aria-label={`Unlock with ${label}`}
      >
        <Icon className="w-12 h-12 text-primary" />
      </button>
      <Button
        variant="ghost"
        onClick={() => setNeedsUnlock(false)}
        className="text-sm text-muted-foreground"
      >
        Use password instead
      </Button>
    </div>
  );
}

export default BiometricUnlock;
