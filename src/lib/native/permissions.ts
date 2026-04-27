/**
 * Native permission helpers with friendly pre-prompts.
 * Always call requestXxxPermission() before opening camera, mic, etc.
 * On the web (non-native), these are no-ops that resolve true.
 */
import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { toast } from "sonner";

const isNative = () => Capacitor.isNativePlatform();

export async function requestCameraPermission(): Promise<boolean> {
  if (!isNative()) return true;
  try {
    const status = await Camera.checkPermissions();
    if (status.camera === "granted" && status.photos === "granted") return true;
    const result = await Camera.requestPermissions({ permissions: ["camera", "photos"] });
    const ok = result.camera === "granted" && result.photos !== "denied";
    if (!ok) toast.error("Camera access denied. Enable it in Settings to continue.");
    return ok;
  } catch (e) {
    console.error("Camera permission error:", e);
    return false;
  }
}

export async function requestPhotoPermission(): Promise<boolean> {
  if (!isNative()) return true;
  try {
    const status = await Camera.checkPermissions();
    if (status.photos === "granted") return true;
    const result = await Camera.requestPermissions({ permissions: ["photos"] });
    const ok = result.photos !== "denied";
    if (!ok) toast.error("Photo access denied. Enable it in Settings.");
    return ok;
  } catch (e) {
    console.error("Photo permission error:", e);
    return false;
  }
}

export async function requestPushPermission(): Promise<boolean> {
  if (!isNative()) {
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") return true;
    const result = await Notification.requestPermission();
    return result === "granted";
  }
  try {
    const status = await PushNotifications.checkPermissions();
    if (status.receive === "granted") return true;
    const result = await PushNotifications.requestPermissions();
    if (result.receive !== "granted") {
      toast.error("Notifications disabled. You'll miss quiz reminders.");
      return false;
    }
    await PushNotifications.register();
    return true;
  } catch (e) {
    console.error("Push permission error:", e);
    return false;
  }
}

export async function requestLocalNotificationPermission(): Promise<boolean> {
  if (!isNative()) return true;
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === "granted") return true;
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted";
  } catch {
    return false;
  }
}
