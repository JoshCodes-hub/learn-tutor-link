// On-device Text-to-Speech with word-level boundary tracking and resume support.
// Pure browser SpeechSynthesis. Zero API keys. Works offline.

export type TtsState = "idle" | "loading" | "playing" | "paused" | "ended";

export interface TtsVoice {
  id: string; name: string; lang: string; localService: boolean; default: boolean;
}

export interface TtsTick {
  state: TtsState;
  progress: number;        // 0..1 across all chunks
  chunk: number;           // current chunk index
  total: number;           // total chunks
  charIndex: number;       // char offset within current chunk (word boundary)
  wordLength: number;      // length of currently spoken word
}

type Listener = (s: TtsTick) => void;

const synth: SpeechSynthesis | undefined =
  typeof window !== "undefined" ? window.speechSynthesis : undefined;

export const isTtsSupported = () => !!synth;

export function listVoices(): Promise<TtsVoice[]> {
  return new Promise((resolve) => {
    if (!synth) return resolve([]);
    const map = (vs: SpeechSynthesisVoice[]): TtsVoice[] =>
      vs.map((v) => ({ id: v.voiceURI, name: v.name, lang: v.lang, localService: v.localService, default: v.default }));
    const existing = synth.getVoices();
    if (existing.length) return resolve(map(existing));
    const handler = () => {
      const vs = synth.getVoices();
      if (vs.length) { synth.removeEventListener("voiceschanged", handler); resolve(map(vs)); }
    };
    synth.addEventListener("voiceschanged", handler);
    setTimeout(() => resolve(map(synth.getVoices())), 1500);
  });
}

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
        const words = s.split(" ");
        let line = "";
        for (const w of words) {
          if ((line + " " + w).trim().length > max) {
            if (line) chunks.push(line.trim());
            line = w;
          } else line = (line ? line + " " : "") + w;
        }
        if (line.trim()) buf = line.trim(); else buf = "";
      } else buf = s;
    } else buf = (buf ? buf + " " : "") + s;
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

export class BrowserTts {
  readonly chunks: string[];
  private idx = 0;
  private current: SpeechSynthesisUtterance | null = null;
  private listeners = new Set<Listener>();
  private state: TtsState = "idle";
  private charIndex = 0;
  private wordLength = 0;

  voiceURI: string | null = null;
  rate = 1;
  pitch = 1;

  constructor(text: string) { this.chunks = chunkText(text); }

  on(fn: Listener) { this.listeners.add(fn); fn(this.snapshot()); return () => this.listeners.delete(fn); }

  private snapshot(): TtsTick {
    const total = this.chunks.length;
    const progress = total === 0 ? 0 : Math.min(1, this.idx / total);
    return { state: this.state, progress, chunk: this.idx, total, charIndex: this.charIndex, wordLength: this.wordLength };
  }
  private emit() { const s = this.snapshot(); this.listeners.forEach((fn) => fn(s)); }

  /** Resume / start from a specific chunk index */
  setStartIndex(i: number) {
    this.idx = Math.max(0, Math.min(i, Math.max(0, this.chunks.length - 1)));
    this.charIndex = 0; this.wordLength = 0;
  }

  private speakNext() {
    if (!synth) return;
    if (this.idx >= this.chunks.length) { this.state = "ended"; this.charIndex = 0; this.emit(); return; }
    const u = new SpeechSynthesisUtterance(this.chunks[this.idx]);
    u.rate = this.rate; u.pitch = this.pitch;
    if (this.voiceURI) {
      const v = synth.getVoices().find((x) => x.voiceURI === this.voiceURI);
      if (v) u.voice = v;
    }
    u.onboundary = (e) => {
      if (e.name && e.name !== "word") return;
      this.charIndex = (e as any).charIndex || 0;
      // Estimate the word length from the chunk text
      const rest = this.chunks[this.idx].slice(this.charIndex);
      const m = rest.match(/^\S+/);
      this.wordLength = m ? m[0].length : 0;
      this.emit();
    };
    u.onend = () => {
      this.idx += 1; this.charIndex = 0; this.wordLength = 0;
      this.emit();
      setTimeout(() => { if (this.state === "playing") this.speakNext(); }, 30);
    };
    u.onerror = (e) => {
      const err = (e as any).error;
      if (err === "interrupted" || err === "canceled") return;
      console.warn("TTS error", e);
      this.idx += 1; this.emit();
      if (this.state === "playing") this.speakNext();
    };
    this.current = u;
    synth.speak(u);
  }

  play() {
    if (!synth || !this.chunks.length) return;
    if (this.state === "paused") { synth.resume(); this.state = "playing"; this.emit(); return; }
    if (this.state === "ended") this.idx = 0;
    synth.cancel();
    this.state = "playing"; this.emit();
    this.speakNext();
  }

  pause() {
    if (!synth) return;
    if (this.state === "playing") { synth.pause(); this.state = "paused"; this.emit(); }
  }

  stop() {
    if (!synth) return;
    this.state = "idle"; this.idx = 0; this.charIndex = 0; this.wordLength = 0;
    synth.cancel(); this.emit();
  }

  setRate(r: number) {
    this.rate = r;
    if (synth && (this.state === "playing" || this.state === "paused")) {
      synth.cancel(); this.state = "playing"; this.speakNext();
    }
  }
  setVoice(uri: string | null) {
    this.voiceURI = uri;
    if (synth && (this.state === "playing" || this.state === "paused")) {
      synth.cancel(); this.state = "playing"; this.speakNext();
    }
  }

  destroy() { this.listeners.clear(); if (synth) synth.cancel(); }
}
