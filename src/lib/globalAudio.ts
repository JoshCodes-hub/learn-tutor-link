// Singleton background audio service so playback persists across route changes.
// A single HTMLAudioElement lives for the lifetime of the app; pages just
// drive it through `playGlobal(...)` and subscribe to its state.

export interface GlobalAudioTrack {
  src: string;
  title?: string;
  subtitle?: string;
  artwork?: string;
}

export interface GlobalAudioState {
  track: GlobalAudioTrack | null;
  playing: boolean;
  current: number;
  duration: number;
  rate: number;
}

type Listener = (s: GlobalAudioState) => void;

let audio: HTMLAudioElement | null = null;
const listeners = new Set<Listener>();
const state: GlobalAudioState = {
  track: null,
  playing: false,
  current: 0,
  duration: 0,
  rate: 1,
};

function ensure(): HTMLAudioElement {
  if (audio) return audio;
  const el = new Audio();
  el.preload = "metadata";
  el.crossOrigin = "anonymous";
  el.addEventListener("play", () => emit({ playing: true }));
  el.addEventListener("pause", () => emit({ playing: false }));
  el.addEventListener("ended", () => emit({ playing: false, current: el.duration || 0 }));
  el.addEventListener("timeupdate", () => emit({ current: el.currentTime, duration: el.duration || 0 }));
  el.addEventListener("loadedmetadata", () => emit({ duration: el.duration || 0 }));
  audio = el;
  if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
    try {
      navigator.mediaSession.setActionHandler("play", () => el.play().catch(() => {}));
      navigator.mediaSession.setActionHandler("pause", () => el.pause());
      navigator.mediaSession.setActionHandler("seekbackward", () => { el.currentTime = Math.max(0, el.currentTime - 10); });
      navigator.mediaSession.setActionHandler("seekforward", () => { el.currentTime = Math.min(el.duration || 0, el.currentTime + 10); });
    } catch { /* noop */ }
  }
  return el;
}

function emit(partial: Partial<GlobalAudioState>) {
  Object.assign(state, partial);
  listeners.forEach((l) => l({ ...state }));
}

export function subscribeGlobalAudio(l: Listener): () => void {
  listeners.add(l);
  l({ ...state });
  return () => listeners.delete(l);
}

export function getGlobalAudioState(): GlobalAudioState {
  return { ...state };
}

export async function playGlobal(track: GlobalAudioTrack) {
  const el = ensure();
  const same = state.track?.src === track.src;
  if (!same) {
    el.src = track.src;
    el.currentTime = 0;
    emit({ track, current: 0, duration: 0 });
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title || "Audio",
          artist: track.subtitle || "OverraPrep",
          artwork: track.artwork ? [{ src: track.artwork, sizes: "512x512" }] : [],
        });
      } catch { /* noop */ }
    }
  }
  try { await el.play(); } catch (e) { console.warn("global audio play failed", e); }
}

export function pauseGlobal() { audio?.pause(); }
export function resumeGlobal() { audio?.play().catch(() => {}); }
export function seekGlobal(t: number) { if (audio) audio.currentTime = t; }
export function setRateGlobal(r: number) { if (audio) { audio.playbackRate = r; emit({ rate: r }); } }
export function stopGlobal() {
  if (audio) { audio.pause(); audio.removeAttribute("src"); audio.load(); }
  emit({ track: null, playing: false, current: 0, duration: 0 });
}