/**
 * Biometric authentication wrapper.
 * - Stores user credentials in the platform keychain (encrypted).
 * - Re-signs the user in via Supabase on app open after Face ID / Touch ID.
 * - Falls back to no-op on web.
 */
import { Capacitor } from "@capacitor/core";
import {
  NativeBiometric,
  BiometryType,
} from "capacitor-native-biometric";
import { Preferences } from "@capacitor/preferences";
import { supabase } from "@/integrations/supabase/client";

const SERVER = "overraprep-ai";
const ENABLED_KEY = "biometric_enabled";

export const isNative = () => Capacitor.isNativePlatform();

export async function isBiometricAvailable(): Promise<{
  available: boolean;
  type: BiometryType | null;
}> {
  if (!isNative()) return { available: false, type: null };
  try {
    const result = await NativeBiometric.isAvailable();
    return { available: result.isAvailable, type: result.biometryType };
  } catch {
    return { available: false, type: null };
  }
}

export async function getBiometricLabel(): Promise<string> {
  const { type } = await isBiometricAvailable();
  switch (type) {
    case BiometryType.FACE_ID:
      return "Face ID";
    case BiometryType.TOUCH_ID:
      return "Touch ID";
    case BiometryType.FACE_AUTHENTICATION:
      return "Face Unlock";
    case BiometryType.FINGERPRINT:
      return "Fingerprint";
    case BiometryType.IRIS_AUTHENTICATION:
      return "Iris Unlock";
    default:
      return "Biometric";
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  const { value } = await Preferences.get({ key: ENABLED_KEY });
  return value === "true";
}

export async function enableBiometric(email: string, password: string): Promise<boolean> {
  if (!isNative()) return false;
  const { available } = await isBiometricAvailable();
  if (!available) return false;
  try {
    await NativeBiometric.setCredentials({ username: email, password, server: SERVER });
    await Preferences.set({ key: ENABLED_KEY, value: "true" });
    return true;
  } catch (e) {
    console.error("Failed to enable biometric:", e);
    return false;
  }
}

export async function disableBiometric(): Promise<void> {
  try {
    await NativeBiometric.deleteCredentials({ server: SERVER });
  } catch {}
  await Preferences.set({ key: ENABLED_KEY, value: "false" });
}

/**
 * Verify identity then sign in with stored credentials.
 * Returns true if a session was established.
 */
export async function biometricLogin(): Promise<boolean> {
  if (!isNative()) return false;
  if (!(await isBiometricEnabled())) return false;
  try {
    await NativeBiometric.verifyIdentity({
      reason: "Unlock OverraPrep",
      title: "Quick Login",
      subtitle: "Use biometrics to sign in",
      description: "Your credentials stay on this device.",
    });
    const creds = await NativeBiometric.getCredentials({ server: SERVER });
    const { error } = await supabase.auth.signInWithPassword({
      email: creds.username,
      password: creds.password,
    });
    return !error;
  } catch (e) {
    console.warn("Biometric login cancelled or failed:", e);
    return false;
  }
}
