import { useEffect, useState } from "react";
import { Fingerprint, ScanFace, Bell, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  disableBiometric,
  enableBiometric,
  getBiometricLabel,
  isBiometricAvailable,
  isBiometricEnabled,
} from "@/lib/native/biometric";
import { requestPushPermission } from "@/lib/native/permissions";
import { useAuth } from "@/hooks/useAuth";
import { initPushNotifications } from "@/lib/native/push";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";

/**
 * Settings card for native quick-login + push notifications.
 * Renders a hint on web; full controls on native.
 */
export function NativeSettings() {
  const { user } = useAuth();
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState("Biometric");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [showPassDialog, setShowPassDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    (async () => {
      const { available } = await isBiometricAvailable();
      setAvailable(available);
      setEnabled(await isBiometricEnabled());
      setLabel(await getBiometricLabel());
    })();
  }, []);

  const handleToggleBiometric = async (next: boolean) => {
    if (!next) {
      await disableBiometric();
      setEnabled(false);
      toast.success(`${label} disabled`);
      return;
    }
    setShowPassDialog(true);
  };

  const confirmEnable = async () => {
    if (!user?.email || !password) return;
    setWorking(true);
    const ok = await enableBiometric(user.email, password);
    setWorking(false);
    setShowPassDialog(false);
    setPassword("");
    if (ok) {
      setEnabled(true);
      toast.success(`${label} enabled. You'll unlock the app instantly next time.`);
    } else {
      toast.error("Couldn't enable biometric login");
    }
  };

  const handleTogglePush = async (next: boolean) => {
    if (!next) {
      setPushEnabled(false);
      toast.message("Notifications disabled in app", {
        description: "To fully revoke, use system Settings.",
      });
      return;
    }
    const granted = await requestPushPermission();
    setPushEnabled(granted);
    if (granted && user?.id) {
      await initPushNotifications(user.id);
      toast.success("Notifications enabled");
    }
  };

  if (!Capacitor.isNativePlatform()) {
    return (
      <Card className="p-4 bg-muted/30">
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Biometric login & native push notifications are available in the mobile app.
        </p>
      </Card>
    );
  }

  const Icon = label === "Face ID" || label === "Face Unlock" ? ScanFace : Fingerprint;

  return (
    <div className="space-y-3">
      {available && (
        <Card className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-sm">{label} login</div>
              <div className="text-xs text-muted-foreground">Unlock instantly</div>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggleBiometric} />
        </Card>
      )}

      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-sm">Push notifications</div>
            <div className="text-xs text-muted-foreground">Quiz & tutor alerts</div>
          </div>
        </div>
        <Switch checked={pushEnabled} onCheckedChange={handleTogglePush} />
      </Card>

      <Dialog open={showPassDialog} onOpenChange={setShowPassDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm your password</DialogTitle>
            <DialogDescription>
              We'll securely store it in your device's keychain so {label} can unlock the app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="bio-pass">Password</Label>
            <Input
              id="bio-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPassDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmEnable} disabled={!password || working}>
              {working ? "Enabling..." : "Enable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default NativeSettings;
