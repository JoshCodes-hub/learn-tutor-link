import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Play, Pause, Rewind, FastForward, Download, Loader2,
  AudioWaveform, Headphones, Music2, Volume2, VolumeX, Sparkles, GraduationCap, Mic2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SPEEDS = [0.5, 1, 1.5, 2] as const;
const LOFI_SRC = "/audio/lofi-study.mp3"; // drop a royalty-free loop here

type Voice = "standard" | "lecturer";

// Map UI voice → Overra Engine voice param
const voiceParam = (v: Voice) => (v === "lecturer" ? "lecturer" : "nigerian");

interface Props {
  text: string | undefined | null;
  fileName?: string;
}

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
};

// Calls our Overra TTS edge function. Auto-retries while the HF Space is warming up.
const fetchTts = async (
  text: string,
  voice: Voice,
  onWarming?: () => void,
): Promise<Blob> => {
  const payload = {
    text: text.slice(0, 5000),
    voice: voiceParam(voice),
    beat_type: "afro_lofi",
  };

  const MAX_RETRIES = 6; // ~30s max wait
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const { data, error } = await supabase.functions.invoke("overra-tts", {
      body: payload,
    });

    // Edge function returned audio bytes → data is a Blob
    if (!error && data instanceof Blob && data.type.startsWith("audio/")) {
      return data;
    }

    // Try to parse warming-up signal from the response
    let warming = false;
    let message = "TTS failed";
    if (error) {
      message = error.message || message;
      const ctx: any = (error as any).context;
      try {
        const txt = await ctx?.text?.();
        if (txt) {
          const j = JSON.parse(txt);
          warming = !!j.warming_up;
          message = j.message || j.error || message;
        }
      } catch {}
      // Heuristic fallback
      if (/wak|warm|load|503|starting/i.test(message)) warming = true;
    } else if (data && typeof data === "object" && "warming_up" in (data as any)) {
      warming = !!(data as any).warming_up;
      message = (data as any).message || message;
    }

    if (warming && attempt < MAX_RETRIES) {
      onWarming?.();
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    throw new Error(message);
  }
  throw new Error("Engine still warming up — please retry");
};

// Split text into sentences, preserving order
const splitSentences = (raw: string): string[] => {
  const clean = raw.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const parts = clean.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [clean];
  return parts.map((p) => p.trim()).filter(Boolean);
};

// Group sentences into paragraphs (~2-3 sentences each)
const groupParagraphs = (sentences: string[]): number[][] => {
  const groups: number[][] = [];
  let current: number[] = [];
  let chars = 0;
  sentences.forEach((s, i) => {
    current.push(i);
    chars += s.length;
    if (chars > 280 || current.length >= 3) {
      groups.push(current);
      current = [];
      chars = 0;
    }
  });
  if (current.length) groups.push(current);
  return groups;
};

export const OverraAudioSuite = ({ text, fileName = "overra-audio.mp3" }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const lofiRef = useRef<HTMLAudioElement | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const sentenceRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [warming, setWarming] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [voice, setVoice] = useState<Voice>("standard");
  const [voiceOfCurrent, setVoiceOfCurrent] = useState<Voice>("standard");

  // Lo-Fi mixer
  const [lofiOn, setLofiOn] = useState(false);
  const [lofiVol, setLofiVol] = useState(25);

  // Section players: paragraph index -> { url, loading, playing }
  const [sections, setSections] = useState<Record<number, { url?: string; loading?: boolean; playing?: boolean }>>({});
  const sectionAudioRefs = useRef<Record<number, HTMLAudioElement | null>>({});

  const sentences = useMemo(() => splitSentences(text || ""), [text]);
  const paragraphs = useMemo(() => groupParagraphs(sentences), [sentences]);
  const totalChars = useMemo(() => sentences.reduce((a, s) => a + s.length, 0) || 1, [sentences]);

  // Active sentence index based on current time
  const activeIndex = useMemo(() => {
    if (!duration || !sentences.length) return -1;
    const ratio = current / duration;
    let acc = 0;
    for (let i = 0; i < sentences.length; i++) {
      acc += sentences[i].length;
      if (acc / totalChars >= ratio) return i;
    }
    return sentences.length - 1;
  }, [current, duration, sentences, totalChars]);

  // Init wavesurfer
  useEffect(() => {
    if (!containerRef.current) return;
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "rgba(201,169,110,0.30)",
      progressColor: "#E8C77A",
      cursorColor: "rgba(232,199,122,0.8)",
      cursorWidth: 2,
      barWidth: 2,
      barRadius: 2,
      barGap: 2,
      height: 72,
      normalize: true,
    });
    wsRef.current = ws;
    ws.on("ready", () => setDuration(ws.getDuration()));
    ws.on("timeupdate", (t) => setCurrent(t));
    ws.on("play", () => { setPlaying(true); resumeLofi(); });
    ws.on("pause", () => { setPlaying(false); duckLofi(); });
    ws.on("finish", () => { setPlaying(false); duckLofi(); });
    return () => { ws.destroy(); wsRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load url into wavesurfer
  useEffect(() => {
    if (!wsRef.current || !url) return;
    wsRef.current.load(url);
  }, [url]);

  // Speed
  useEffect(() => {
    wsRef.current?.setPlaybackRate(speed, false);
  }, [speed, url]);

  // Auto-scroll active sentence
  useEffect(() => {
    if (activeIndex < 0) return;
    const el = sentenceRefs.current[activeIndex];
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex]);

  // Lo-Fi behavior
  const duckLofi = useCallback(() => {
    const a = lofiRef.current;
    if (!a || !lofiOn) return;
    a.volume = (lofiVol / 100) * 0.4;
  }, [lofiOn, lofiVol]);

  const resumeLofi = useCallback(() => {
    const a = lofiRef.current;
    if (!a || !lofiOn) return;
    a.volume = lofiVol / 100;
    a.play().catch(() => {});
  }, [lofiOn, lofiVol]);

  useEffect(() => {
    const a = lofiRef.current;
    if (!a) return;
    if (lofiOn) {
      a.volume = (playing ? 1 : 0.4) * (lofiVol / 100);
      a.play().catch(() => toast.error("Add a lo-fi loop at /public/audio/lofi-study.mp3"));
    } else {
      a.pause();
    }
  }, [lofiOn, lofiVol, playing]);

  // Cleanup blob urls on unmount
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
    Object.values(sections).forEach((s) => s.url && URL.revokeObjectURL(s.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async () => {
    if (!text?.trim()) return toast.error("No summary text to narrate yet");
    setLoading(true);
    setWarming(false);
    try {
      const blob = await fetchTts(text, voice, () => {
        setWarming(true);
        toast.message("Engine waking up… retrying in 5s");
      });
      const objUrl = URL.createObjectURL(blob);
      setUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return objUrl; });
      setVoiceOfCurrent(voice);
      toast.success("Audio ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate audio");
    } finally {
      setLoading(false);
      setWarming(false);
    }
  };

  const togglePlay = () => wsRef.current?.playPause();
  const seekBy = (delta: number) => {
    const ws = wsRef.current; if (!ws) return;
    const d = ws.getDuration();
    ws.seekTo(Math.max(0, Math.min(1, (ws.getCurrentTime() + delta) / (d || 1))));
  };

  // Section playback
  const playSection = async (paraIdx: number, paraText: string) => {
    const existing = sections[paraIdx];
    // pause any other section
    Object.entries(sectionAudioRefs.current).forEach(([k, a]) => {
      if (Number(k) !== paraIdx && a && !a.paused) a.pause();
    });
    if (existing?.url) {
      const a = sectionAudioRefs.current[paraIdx];
      if (!a) return;
      if (a.paused) a.play(); else a.pause();
      return;
    }
    setSections((s) => ({ ...s, [paraIdx]: { ...s[paraIdx], loading: true } }));
    try {
      const blob = await fetchTts(paraText, voice, () =>
        toast.message("Engine waking up… retrying in 5s"),
      );
      const objUrl = URL.createObjectURL(blob);
      setSections((s) => ({ ...s, [paraIdx]: { url: objUrl, loading: false } }));
    } catch (e) {
      setSections((s) => ({ ...s, [paraIdx]: { loading: false } }));
      toast.error(e instanceof Error ? e.message : "Failed to generate section audio");
    }
  };

  const voiceMismatch = url && voice !== voiceOfCurrent;

  return (
    <div
      className="relative rounded-3xl overflow-hidden border shadow-2xl"
      style={{
        background: "linear-gradient(135deg, #0B1426 0%, #0F1B33 60%, #0B1426 100%)",
        borderColor: "rgba(201,169,110,0.25)",
      }}
    >
      {/* Glow */}
      <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(232,199,122,0.18), transparent 70%)" }} />
      <div className="pointer-events-none absolute -bottom-24 -left-16 w-72 h-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(201,169,110,0.12), transparent 70%)" }} />

      <div className="relative p-5 md:p-6 space-y-5" style={{ color: "#E8C77A" }}>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full grid place-items-center shrink-0" style={{ background: "rgba(232,199,122,0.15)", border: "1px solid rgba(232,199,122,0.3)" }}>
              <Sparkles className="w-5 h-5" style={{ color: "#E8C77A" }} />
            </div>
            <div className="min-w-0">
              <p className="font-display text-base font-semibold tracking-tight" style={{ color: "#F5E6C8" }}>Overra AI Elite 8 · Audio Suite</p>
              <p className="text-[11px]" style={{ color: "rgba(232,199,122,0.65)" }}>Premium narration · waveform · live transcript</p>
            </div>
          </div>

          {/* Voice toggle */}
          <div className="inline-flex rounded-full p-1" style={{ background: "rgba(232,199,122,0.08)", border: "1px solid rgba(232,199,122,0.2)" }}>
            {(["standard", "lecturer"] as Voice[]).map((v) => (
              <button
                key={v}
                onClick={() => setVoice(v)}
                className={cn("px-3 h-8 text-xs font-semibold rounded-full inline-flex items-center gap-1.5 transition-all")}
                style={voice === v
                  ? { background: "linear-gradient(135deg,#C9A96E,#E8C77A)", color: "#0B1426" }
                  : { color: "rgba(232,199,122,0.7)" }}
              >
                {v === "lecturer" ? <GraduationCap className="w-3.5 h-3.5" /> : <Mic2 className="w-3.5 h-3.5" />}
                {v === "lecturer" ? "Lecturer" : "Standard"}
              </button>
            ))}
          </div>
        </div>

        {/* Generate / Voice mismatch */}
        {(!url || voiceMismatch) && (
          <Button
            onClick={generate}
            disabled={loading || !text?.trim()}
            className="w-full font-semibold border-0"
            style={{ background: "linear-gradient(135deg,#C9A96E,#E8C77A)", color: "#0B1426" }}
          >
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
              : voiceMismatch ? <><AudioWaveform className="w-4 h-4 mr-2" /> Regenerate in {voice === "lecturer" ? "Lecturer" : "Standard"} voice</>
              : <><AudioWaveform className="w-4 h-4 mr-2" /> Generate Premium Narration</>}
          </Button>
        )}

        {/* Waveform */}
        <div className="rounded-2xl p-3" style={{ background: "rgba(11,20,38,0.6)", border: "1px solid rgba(232,199,122,0.15)" }}>
          <div ref={containerRef} className="w-full" />
          {!url && (
            <div className="h-[72px] grid place-items-center text-xs" style={{ color: "rgba(232,199,122,0.5)" }}>
              <span className="inline-flex items-center gap-2"><Headphones className="w-4 h-4" /> Generate audio to see the waveform</span>
            </div>
          )}
        </div>

        {/* Transport */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => seekBy(-10)}
            disabled={!url}
            className="w-10 h-10 rounded-full grid place-items-center disabled:opacity-40 transition-all hover:scale-105"
            style={{ background: "rgba(232,199,122,0.1)", border: "1px solid rgba(232,199,122,0.25)", color: "#E8C77A" }}
            aria-label="Back 10 seconds"
          >
            <Rewind className="w-4 h-4" />
          </button>
          <button
            onClick={togglePlay}
            disabled={!url}
            className="w-14 h-14 rounded-full grid place-items-center disabled:opacity-40 transition-all hover:scale-105 shadow-lg"
            style={{ background: "linear-gradient(135deg,#C9A96E,#E8C77A)", color: "#0B1426", boxShadow: "0 8px 24px rgba(232,199,122,0.35)" }}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
          <button
            onClick={() => seekBy(10)}
            disabled={!url}
            className="w-10 h-10 rounded-full grid place-items-center disabled:opacity-40 transition-all hover:scale-105"
            style={{ background: "rgba(232,199,122,0.1)", border: "1px solid rgba(232,199,122,0.25)", color: "#E8C77A" }}
            aria-label="Forward 10 seconds"
          >
            <FastForward className="w-4 h-4" />
          </button>
        </div>

        {/* Speed + Time + Download */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full p-1" style={{ background: "rgba(232,199,122,0.08)", border: "1px solid rgba(232,199,122,0.2)" }}>
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className="px-3 h-7 text-xs font-semibold rounded-full transition-all"
                style={speed === s
                  ? { background: "linear-gradient(135deg,#C9A96E,#E8C77A)", color: "#0B1426" }
                  : { color: "rgba(232,199,122,0.7)" }}
              >
                {s}x
              </button>
            ))}
          </div>
          <div className="text-xs tabular-nums" style={{ color: "rgba(232,199,122,0.7)" }}>
            {fmt(current)} / {fmt(duration)}
          </div>
          <a href={url ?? undefined} download={fileName} className={cn(!url && "pointer-events-none opacity-40")}>
            <button
              className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold transition-all hover:scale-105"
              style={{ background: "rgba(232,199,122,0.1)", border: "1px solid rgba(232,199,122,0.3)", color: "#E8C77A" }}
            >
              <Download className="w-3.5 h-3.5" /> Download MP3
            </button>
          </a>
        </div>

        {/* Vibes mixer */}
        <div className="rounded-2xl p-4 flex items-center gap-3 flex-wrap" style={{ background: "rgba(11,20,38,0.55)", border: "1px solid rgba(232,199,122,0.15)" }}>
          <button
            onClick={() => setLofiOn((v) => !v)}
            className="inline-flex items-center gap-2 px-3 h-9 rounded-full text-xs font-semibold transition-all"
            style={lofiOn
              ? { background: "linear-gradient(135deg,#C9A96E,#E8C77A)", color: "#0B1426" }
              : { background: "rgba(232,199,122,0.08)", border: "1px solid rgba(232,199,122,0.25)", color: "#E8C77A" }}
          >
            <Music2 className="w-3.5 h-3.5" /> {lofiOn ? "Lo-Fi On" : "Study Vibes"}
          </button>
          <div className="flex-1 min-w-[160px] flex items-center gap-2">
            {lofiVol === 0 ? <VolumeX className="w-4 h-4" style={{ color: "rgba(232,199,122,0.6)" }} /> : <Volume2 className="w-4 h-4" style={{ color: "rgba(232,199,122,0.6)" }} />}
            <Slider value={[lofiVol]} max={100} step={1} onValueChange={(v) => setLofiVol(v[0])} className="flex-1" />
            <span className="text-[11px] tabular-nums w-8 text-right" style={{ color: "rgba(232,199,122,0.6)" }}>{lofiVol}%</span>
          </div>
          <audio ref={lofiRef} src={LOFI_SRC} loop preload="none" className="hidden" />
        </div>

        {/* Transcript */}
        {sentences.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: "rgba(11,20,38,0.55)", border: "1px solid rgba(232,199,122,0.15)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(232,199,122,0.7)" }}>
                Live Transcript
              </p>
              <p className="text-[11px]" style={{ color: "rgba(232,199,122,0.5)" }}>Tap a paragraph to hear just that section</p>
            </div>
            <div ref={transcriptRef} className="max-h-72 overflow-y-auto pr-2 space-y-3 text-sm leading-relaxed" style={{ color: "rgba(245,230,200,0.85)" }}>
              {paragraphs.map((para, pIdx) => {
                const sec = sections[pIdx] || {};
                return (
                  <div key={pIdx} className="group">
                    <p
                      className="cursor-pointer rounded-lg p-2 -mx-2 transition-colors hover:bg-[rgba(232,199,122,0.06)]"
                      onClick={() => playSection(pIdx, para.map((i) => sentences[i]).join(" "))}
                    >
                      {para.map((sIdx) => (
                        <span
                          key={sIdx}
                          ref={(el) => { sentenceRefs.current[sIdx] = el; }}
                          className="transition-all duration-300"
                          style={sIdx === activeIndex ? {
                            background: "linear-gradient(120deg, rgba(232,199,122,0.95), rgba(201,169,110,0.85))",
                            color: "#0B1426",
                            padding: "1px 4px",
                            borderRadius: "4px",
                            fontWeight: 600,
                          } : undefined}
                        >
                          {sentences[sIdx]}{" "}
                        </span>
                      ))}
                    </p>
                    {(sec.loading || sec.url) && (
                      <div className="mt-1 ml-2 flex items-center gap-2">
                        {sec.loading && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#E8C77A" }} />}
                        {sec.url && (
                          <>
                            <audio
                              ref={(el) => { sectionAudioRefs.current[pIdx] = el; }}
                              src={sec.url}
                              controls
                              className="h-7 w-full max-w-xs"
                              onPlay={() => setSections((s) => ({ ...s, [pIdx]: { ...s[pIdx], playing: true } }))}
                              onPause={() => setSections((s) => ({ ...s, [pIdx]: { ...s[pIdx], playing: false } }))}
                            />
                            <a href={sec.url} download={`section-${pIdx + 1}.mp3`}>
                              <button
                                className="p-1.5 rounded-full transition-all hover:scale-110"
                                style={{ background: "rgba(232,199,122,0.1)", color: "#E8C77A" }}
                                aria-label="Download section"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            </a>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OverraAudioSuite;
