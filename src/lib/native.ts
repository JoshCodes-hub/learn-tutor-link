// Native-feeling helpers (work in browser; degrade gracefully)

export async function nativeShare(data: { title?: string; text?: string; url?: string; files?: File[] }) {
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

export function haptic(kind: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light') {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  const map: Record<string, number | number[]> = {
    light: 10, medium: 20, heavy: 35, success: [12, 30, 12], warning: [40, 60, 40],
  };
  try { navigator.vibrate(map[kind] ?? 10); } catch (_) { /* ignore */ }
}
