/**
 * Push notification setup. On native, requests permission, registers the
 * device with FCM/APNs, and persists the token to the user's profile so
 * the backend can send targeted nudges.
 *
 * Requires user to add a Firebase project + google-services.json /
 * GoogleService-Info.plist after exporting to GitHub.
 */
import { Capacitor } from "@capacitor/core";
import { PushNotifications, type Token } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const isNative = () => Capacitor.isNativePlatform();

export async function initPushNotifications(userId: string) {
  if (!isNative()) return;

  try {
    const status = await PushNotifications.checkPermissions();
    let receive = status.receive;

    if (receive === "prompt" || receive === "prompt-with-rationale") {
      const req = await PushNotifications.requestPermissions();
      receive = req.receive;
    }

    if (receive !== "granted") return;

    await PushNotifications.register();

    PushNotifications.addListener("registration", async (token: Token) => {
      // Persist device token in profile metadata for server-side push.
      await supabase
        .from("profiles")
        .update({
          academic_metadata: {
            push_token: token.value,
            push_platform: Capacitor.getPlatform(),
            push_registered_at: new Date().toISOString(),
          } as any,
        } as any)
        .eq("id", userId);
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("Push registration error:", err);
    });

    PushNotifications.addListener("pushNotificationReceived", (notif) => {
      // Foreground push — show as in-app toast
      toast(notif.title || "OverraPrep", { description: notif.body });
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const link = action.notification.data?.link;
      if (link) window.location.href = link;
    });
  } catch (e) {
    console.error("Push init failed:", e);
  }
}

/**
 * Schedule a local reminder (works offline, no FCM required).
 * Used for daily quiz reminders & exam-readiness nudges.
 */
export async function scheduleLocalReminder(opts: {
  id: number;
  title: string;
  body: string;
  at: Date;
}) {
  if (!isNative()) return;
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: opts.id,
          title: opts.title,
          body: opts.body,
          schedule: { at: opts.at, allowWhileIdle: true },
        },
      ],
    });
  } catch (e) {
    console.error("Local notif schedule failed:", e);
  }
}
