// Native-feeling helpers (work in browser; degrade gracefully)

export interface ShareData { title?: string; text?: string; url?: string; files?: File[]; dialogTitle?: string }

export async function shareContent(data: ShareData): Promise<boolean> {
  try {
    if (navigator.share && (!data.files || (navigator as any).canShare?.({ files: data.files }))) {
      await navigator.share(data);
      return true;
    }
  } catch (_) { /* user cancelled */ }
  if (data.url) {
    try { await navigator.clipboard.writeText(data.url); return true; } catch (_) { /* ignore */ }
  }
  return false;
}

// Backward-compatible alias
export const nativeShare = shareContent;

export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

export async function haptic(kind: HapticKind = 'light'): Promise<void> {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  const map: Record<HapticKind, number | number[]> = {
    light: 10, medium: 20, heavy: 35,
    success: [12, 30, 12], warning: [40, 60, 40], error: [60, 40, 60],
    selection: 5,
  };
  try { navigator.vibrate(map[kind] ?? 10); } catch (_) { /* ignore */ }
}
