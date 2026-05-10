import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Download,
  Captions,
  Volume2,
  VolumeX,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerCardProps {
  src: string;
  title?: string;
  /** Optional transcript text shown when captions are toggled on */
  transcript?: string;
  /** Suggested filename when downloading */
  downloadName?: string;
  /** Optional className extension for the outer card */
  className?: string;
  /** Persistence key for resume position (in seconds) */
  resumeKey?: string;
}

const SPEEDS = [1, 1.25, 1.5, 2] as const;
const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

/**
 * Premium gold-accent audio player card. Replaces the bare HTML5 controls
 * with: large play/pause, scrubber with buffered progress, ±10s skips,
 * speed selector, captions/transcript toggle, mute, download.
 *
 * Accessibility:
 * - All controls keyboard reachable, with visible focus rings.
 * - Scrubber is a native range slider (full keyboard support, ARIA values).
 * - Toggle buttons expose aria-pressed for assistive tech.
 */
export const AudioPlayerCard = ({
  src,
  title = "Audio narration",
  transcript,
  downloadName = "narration.mp3",
  className,
  resumeKey,
}: AudioPlayerCardProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [muted, setMuted] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);

  // Restore resume position
  useEffect(() => {
    if (!resumeKey) return;
    const saved = Number(localStorage.getItem(`audio-resume:${resumeKey}`) || "0");
    if (saved > 0 && audioRef.current) {
      const onLoaded = () => {
        if (audioRef.current && saved < (audioRef.current.duration || Infinity) - 2) {
          audioRef.current.currentTime = saved;
        }
        audioRef.current?.removeEventListener("loadedmetadata", onLoaded);
      };
      audioRef.current.addEventListener("loadedmetadata", onLoaded);
    }
  }, [resumeKey, src]);

  // Persist resume position
  useEffect(() => {
    if (!resumeKey) return;
    const id = window.setInterval(() => {
      const t = audioRef.current?.currentTime ?? 0;
      if (t > 0) localStorage.setItem(`audio-resume:${resumeKey}`, String(Math.floor(t)));
    }, 4000);
    return () => window.clearInterval(id);
  }, [resumeKey]);

  // Apply speed
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  // Apply mute
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const seekBy = (delta: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min((el.duration || 0), el.currentTime + delta));
  };

  const onScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Number(e.target.value);
  };

  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-white to-white p-4 sm:p-5 shadow-[0_10px_30px_-16px_rgba(180,140,40,0.35)]",
        className,
      )}
      role="region"
      aria-label={`Audio player: ${title}`}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime || 0)}
        onEnded={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shrink-0">
          <Volume2 className="h-5 w-5 text-white" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-bold text-foreground truncate">{title}</p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {fmt(current)} <span aria-hidden>·</span> <span className="opacity-70">{fmt(duration)}</span>
          </p>
        </div>
        <a
          href={src}
          download={downloadName}
          aria-label="Download audio"
          className="h-10 w-10 rounded-full bg-white border border-amber-200 hover:bg-amber-50 flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
        >
          <Download className="h-4 w-4 text-amber-700" />
        </a>
      </div>

      {/* Scrubber */}
      <div className="relative mb-1">
        <div className="h-1.5 rounded-full bg-amber-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-[width] duration-150"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={onScrub}
          aria-label="Seek audio"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={current}
          aria-valuetext={`${fmt(current)} of ${fmt(duration)}`}
          className="absolute inset-0 w-full h-4 -top-1 opacity-0 cursor-pointer"
        />
      </div>

      {/* Controls */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => seekBy(-10)}
            aria-label="Skip back 10 seconds"
            className="h-10 w-10 rounded-full bg-white border border-amber-200 text-amber-800 hover:bg-amber-50 flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            aria-pressed={playing}
            className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-[0_8px_22px_-8px_rgba(180,140,40,0.65)] flex items-center justify-center hover:from-amber-600 hover:to-amber-700 active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-[1px]" />}
          </button>
          <button
            type="button"
            onClick={() => seekBy(10)}
            aria-label="Skip forward 10 seconds"
            className="h-10 w-10 rounded-full bg-white border border-amber-200 text-amber-800 hover:bg-amber-50 flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {transcript && (
            <button
              type="button"
              onClick={() => setShowCaptions((v) => !v)}
              aria-pressed={showCaptions}
              aria-label="Toggle captions"
              className={cn(
                "h-9 px-2.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                showCaptions
                  ? "bg-amber-500 text-white"
                  : "bg-white border border-amber-200 text-amber-800 hover:bg-amber-50",
              )}
            >
              <Captions className="h-3.5 w-3.5" /> CC
            </button>
          )}
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-pressed={muted}
            aria-label={muted ? "Unmute" : "Mute"}
            className="h-9 w-9 rounded-full bg-white border border-amber-200 text-amber-800 hover:bg-amber-50 flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Speed selector */}
      <div
        className="mt-3 flex items-center gap-1.5 flex-wrap"
        role="radiogroup"
        aria-label="Playback speed"
      >
        <Gauge className="h-3.5 w-3.5 text-amber-700" aria-hidden />
        <span className="text-[10px] uppercase tracking-wider font-bold text-amber-700 mr-1">Speed</span>
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={speed === s}
            onClick={() => setSpeed(s)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
              speed === s
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-white border border-amber-200 text-amber-800 hover:bg-amber-50",
            )}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Captions / transcript */}
      <AnimatePresence>
        {showCaptions && transcript && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-3 overflow-hidden"
          >
            <div
              className="rounded-xl border border-amber-100 bg-white p-3 max-h-48 overflow-y-auto text-[12.5px] leading-relaxed text-foreground/85"
              aria-live="polite"
            >
              {transcript}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AudioPlayerCard;
