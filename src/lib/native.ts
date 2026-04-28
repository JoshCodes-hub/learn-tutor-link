/**
 * Native bridge helpers — gracefully fall back to Web APIs when Capacitor is not running.
 * This lets the same code work in the browser preview AND inside the native iOS/Android shell.
 */

let capacitorMod: typeof import("@capacitor/core") | null = null;
let hapticsMod: typeof import("@capacitor/haptics") | null = null;
let shareMod: typeof import("@capacitor/share") | null = null;

async function loadCapacitor() {
  if (capacitorMod) return capacitorMod;
  try {
    capacitorMod = await import("@capacitor/core");
  } catch {
    capacitorMod = null;
  }
  return capacitorMod;
}

export async function isNative(): Promise<boolean> {
  const cap = await loadCapacitor();
  try {
    return !!cap?.Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

/* ------------------------------ Haptics ----------------------------------- */

export type HapticIntensity = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

export async function haptic(intensity: HapticIntensity = "light") {
  if (await isNative()) {
    if (!hapticsMod) {
      try {
        hapticsMod = await import("@capacitor/haptics");
      } catch {
        hapticsMod = null;
      }
    }
    try {
      const { Haptics, ImpactStyle, NotificationType } = hapticsMod!;
      switch (intensity) {
        case "light":
          return Haptics.impact({ style: ImpactStyle.Light });
        case "medium":
          return Haptics.impact({ style: ImpactStyle.Medium });
        case "heavy":
          return Haptics.impact({ style: ImpactStyle.Heavy });
        case "selection":
          return Haptics.selectionStart();
        case "success":
          return Haptics.notification({ type: NotificationType.Success });
        case "warning":
          return Haptics.notification({ type: NotificationType.Warning });
        case "error":
          return Haptics.notification({ type: NotificationType.Error });
      }
    } catch (err) {
      console.warn("[haptic] native failed", err);
    }
  }
  // Web fallback — Vibration API
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      const map: Record<HapticIntensity, number | number[]> = {
        light: 10,
        medium: 20,
        heavy: 35,
        selection: 8,
        success: [12, 40, 12],
        warning: [20, 60, 20],
        error: [40, 60, 40, 60, 40],
      };
      navigator.vibrate(map[intensity]);
    }
  } catch {
    // ignore
  }
}

/* ------------------------------- Share ------------------------------------ */

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

export async function shareContent(opts: ShareOptions): Promise<boolean> {
  if (await isNative()) {
    if (!shareMod) {
      try {
        shareMod = await import("@capacitor/share");
      } catch {
        shareMod = null;
      }
    }
    try {
      const { Share } = shareMod!;
      await Share.share({
        title: opts.title,
        text: opts.text,
        url: opts.url,
        dialogTitle: opts.dialogTitle ?? opts.title,
      });
      return true;
    } catch (err: any) {
      // User cancel returns an error on iOS — treat as soft success
      if (String(err?.message || "").toLowerCase().includes("cancel")) return true;
      console.warn("[share] native failed", err);
    }
  }
  // Web Share API fallback
  try {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      await (navigator as any).share({ title: opts.title, text: opts.text, url: opts.url });
      return true;
    }
  } catch (err: any) {
    if (err?.name === "AbortError") return true;
  }
  // Final fallback — copy URL to clipboard
  try {
    const value = opts.url || opts.text || opts.title || "";
    if (value && typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

/* ----------------------------- Splash screen ------------------------------ */

export async function hideSplash() {
  if (!(await isNative())) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 350 });
  } catch {
    // ignore
  }
}
