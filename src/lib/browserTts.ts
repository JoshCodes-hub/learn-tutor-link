// On-device Text-to-Speech using the browser/phone's built-in SpeechSynthesis API.
// Zero API keys, works offline once the OS voices are loaded.
//
// Why a custom controller?
//   - speechSynthesis is global + flaky across mobile browsers
//   - we chunk long text so it never gets cut off (Chrome ~200 char limit)
//   - we expose progress so the UI can render a real progress bar

export type TtsState = "idle" | "loading" | "playing" | "paused" | "ended";

export interface TtsVoice {
  id: string;             // voiceURI
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

type Listener = (s: { state: TtsState; progress: number; chunk: number; total: number }) => void;

const synth: SpeechSynthesis | undefined =
  typeof window !== "undefined" ? window.speechSynthesis : undefined;

export const isTtsSupported = () => !!synth;

// Voices load async on most browsers — wait until they appear.
export function listVoices(): Promise<TtsVoice[]> {
  return new Promise((resolve) => {
    if (!synth) return resolve([]);
    const map = (vs: SpeechSynthesisVoice[]): TtsVoice[] =>
      vs.map((v) => ({
        id: v.voiceURI,
        name: v.name,
        lang: v.lang,
        localService: v.localService,
        default: v.default,
      }));
    const existing = synth.getVoices();
    if (existing.length) return resolve(map(existing));
    const handler = () => {
      const vs = synth.getVoices();
      if (vs.length) {
        synth.removeEventListener("voiceschanged", handler);
        resolve(map(vs));
      }
    };
    synth.addEventListener("voiceschanged", handler);
    // Safety fallback (some browsers never fire the event)
    setTimeout(() => resolve(map(synth.getVoices())), 1500);
  });
}

// Split at sentence/space boundaries so playback feels natural.
function chunkText(raw: string, max = 200): string[] {
  const clean = raw.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= max) return [clean];
  const sentences = clean.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let buf = "";
  for (const s of sentences) {
    if ((buf + " " + s).trim().length > max) {
      if (buf) chunks.push(buf.trim());
      if (s.length > max) {
        // hard split very long sentences on word boundaries
        const words = s.split(" ");
        let line = "";
        for (const w of words) {
          if ((line + " " + w).trim().length > max) {
            if (line) chunks.push(line.trim());
            line = w;
          } else line = (line ? line + " " : "") + w;
        }
        if (line.trim()) buf = line.trim();
        else buf = "";
      } else buf = s;
    } else buf = (buf ? buf + " " : "") + s;
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

export class BrowserTts {
  private chunks: string[] = [];
  private idx = 0;
  private current: SpeechSynthesisUtterance | null = null;
  private listeners = new Set<Listener>();
  private state: TtsState = "idle";

  voiceURI: string | null = null;
  rate = 1;
  pitch = 1;

  constructor(text: string) {
    this.chunks = chunkText(text);
  }

  on(fn: Listener) {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  private snapshot() {
    const total = this.chunks.length;
    const progress = total === 0 ? 0 : Math.min(1, this.idx / total);
    return { state: this.state, progress, chunk: this.idx, total };
  }

  private emit() {
    const snap = this.snapshot();
    this.listeners.forEach((fn) => fn(snap));
  }

  private speakNext() {
    if (!synth) return;
    if (this.idx >= this.chunks.length) {
      this.state = "ended";
      this.emit();
      return;
    }
    const u = new SpeechSynthesisUtterance(this.chunks[this.idx]);
    u.rate = this.rate;
    u.pitch = this.pitch;
    if (this.voiceURI) {
      const v = synth.getVoices().find((x) => x.voiceURI === this.voiceURI);
      if (v) u.voice = v;
    }
    u.onend = () => {
      this.idx += 1;
      this.emit();
      // Tiny delay helps Android Chrome keep the queue alive
      setTimeout(() => {
        if (this.state === "playing") this.speakNext();
      }, 30);
    };
    u.onerror = (e) => {
      // 'interrupted' fires on stop() — that's expected, not an error
      if ((e as any).error === "interrupted" || (e as any).error === "canceled") return;
      console.warn("TTS error", e);
      this.idx += 1;
      this.emit();
      if (this.state === "playing") this.speakNext();
    };
    this.current = u;
    synth.speak(u);
  }

  play() {
    if (!synth || !this.chunks.length) return;
    if (this.state === "paused") {
      synth.resume();
      this.state = "playing";
      this.emit();
      return;
    }
    if (this.state === "ended") this.idx = 0;
    synth.cancel(); // clear any leftover queue
    this.state = "playing";
    this.emit();
    this.speakNext();
  }

  pause() {
    if (!synth) return;
    if (this.state === "playing") {
      synth.pause();
      this.state = "paused";
      this.emit();
    }
  }

  stop() {
    if (!synth) return;
    this.state = "idle";
    this.idx = 0;
    synth.cancel();
    this.emit();
  }

  setRate(r: number) {
    this.rate = r;
    // Re-speak current chunk with new rate
    if (synth && (this.state === "playing" || this.state === "paused")) {
      synth.cancel();
      this.state = "playing";
      this.speakNext();
    }
  }

  setVoice(uri: string | null) {
    this.voiceURI = uri;
    if (synth && (this.state === "playing" || this.state === "paused")) {
      synth.cancel();
      this.state = "playing";
      this.speakNext();
    }
  }

  destroy() {
    this.listeners.clear();
    if (synth) synth.cancel();
  }
}
