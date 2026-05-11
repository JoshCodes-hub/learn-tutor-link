import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Headphones,
  Download,
  BookmarkPlus,
  Captions,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerCardProps {
  src: string;
  title?: string;
  subtitle?: string;
  /** Optional transcript text shown when captions are toggled on */
  transcript?: string;
  /** Suggested filename when downloading */
  downloadName?: string;
  /** Optional className extension for the outer card */
  className?: string;
  /** Persistence key for resume position (in seconds) */
  resumeKey?: string;
  /** Optional handler for the "Save to Library" footer button */
  onSaveToLibrary?: () => void;
}

const SPEEDS = [1, 1.5, 2] as const;
const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

// Skip-back / Skip-forward "10" badge icons (custom — circular arrow with "10")
const SkipIcon = ({ direction = "back" }: { direction?: "back" | "forward" }) => (
  <svg viewBox="0 0 28 28" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {direction === "back" ? (
      <>
        <path d="M5 14a9 9 0 1 0 3-6.7" />
        <polyline points="5,3 5,8 10,8" />
      </>
    ) : (
      <>
        <path d="M23 14a9 9 0 1 1-3-6.7" />
        <polyline points="23,3 23,8 18,8" />
      </>
    )}
    <text x="14" y="18" textAnchor="middle" fontSize="8" fontWeight="700" stroke="none" fill="currentColor">10</text>
  </svg>
);

/**
 * Premium "AI Narration" audio player. Matches the Study Pack audio
 * mockup: hero gradient header → time-stamped scrubber → large center
 * play with ±10s skips → speed pills → Download / Save footer.
 *
 * Accessibility:
 * - All controls keyboard reachable, with visible focus rings.
 * - Scrubber is a native range slider (full keyboard support, ARIA values).
 * - Toggle buttons expose aria-pressed for assistive tech.
 */
export const AudioPlayerCard = ({
  src,
  title = "AI Narration",
  subtitle = "Listen to your document",
  transcript,
  downloadName = "narration.mp3",
  className,
  resumeKey,
  onSaveToLibrary,
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

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

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
        "relative overflow-hidden rounded-[28px] border border-amber-200/70 bg-white shadow-[0_24px_60px_-30px_rgba(180,140,40,0.45)]",
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

      {/* Hero header */}
      <div className="relative px-6 pt-7 pb-6 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white">
        <div className="absolute -top-12 -right-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" aria-hidden />
        <div className="absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-amber-300/30 blur-3xl" aria-hidden />
        <div className="relative flex flex-col items-center text-center">
          <motion.div
            animate={playing ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={{ duration: 2, repeat: playing ? Infinity : 0, ease: "easeInOut" }}
            className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg mb-3"
          >
            <Headphones className="h-8 w-8 text-white" aria-hidden />
          </motion.div>
          <p className="font-display text-xl font-bold tracking-tight">{title}</p>
          <p className="text-[12.5px] text-white/85 mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 sm:px-6 pt-5 pb-5">
        {/* Scrubber + timestamps */}
        <div className="relative">
          <div className="h-1.5 rounded-full bg-amber-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-[width] duration-150 relative"
              style={{ width: `${pct}%` }}
            >
              <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-3.5 w-3.5 rounded-full bg-white border-2 border-amber-500 shadow" aria-hidden />
            </div>
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
            className="absolute inset-0 w-full h-5 -top-2 opacity-0 cursor-pointer"
          />
          <div className="mt-2 flex items-center justify-between text-[12px] tabular-nums text-muted-foreground">
            <span>{fmt(current)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        {/* Transport */}
        <div className="mt-4 flex items-center justify-center gap-6 sm:gap-8">
          <button
            type="button"
            onClick={() => seekBy(-10)}
            aria-label="Skip back 10 seconds"
            className="h-12 w-12 rounded-full text-amber-700 hover:bg-amber-50 flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <SkipIcon direction="back" />
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            aria-pressed={playing}
            className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-[0_14px_30px_-10px_rgba(180,140,40,0.7)] flex items-center justify-center hover:from-amber-500 hover:to-amber-700 active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
          >
            {playing ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 translate-x-[2px]" />}
          </button>
          <button
            type="button"
            onClick={() => seekBy(10)}
            aria-label="Skip forward 10 seconds"
            className="h-12 w-12 rounded-full text-amber-700 hover:bg-amber-50 flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <SkipIcon direction="forward" />
          </button>
        </div>

        {/* Secondary controls (mute + captions) */}
        {(transcript || true) && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-pressed={muted}
              aria-label={muted ? "Unmute" : "Mute"}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-amber-700 hover:bg-amber-50 flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            {transcript && (
              <button
                type="button"
                onClick={() => setShowCaptions((v) => !v)}
                aria-pressed={showCaptions}
                aria-label="Toggle captions"
                className={cn(
                  "h-8 px-3 rounded-full text-[11px] font-bold inline-flex items-center gap-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                  showCaptions
                    ? "bg-amber-500 text-white"
                    : "text-muted-foreground hover:text-amber-700 hover:bg-amber-50",
                )}
              >
                <Captions className="h-3.5 w-3.5" /> CC
              </button>
            )}
          </div>
        )}

        {/* Speed selector */}
        <div className="mt-5">
          <p className="text-[13px] font-semibold text-foreground/80 mb-2">Playback Speed</p>
          <div role="radiogroup" aria-label="Playback speed" className="grid grid-cols-3 gap-2">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={speed === s}
                onClick={() => setSpeed(s)}
                className={cn(
                  "h-11 rounded-xl text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                  speed === s
                    ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-[0_8px_20px_-10px_rgba(180,140,40,0.7)]"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-100",
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Captions / transcript */}
        <AnimatePresence>
          {showCaptions && transcript && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-4 overflow-hidden"
            >
              <div
                className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 max-h-48 overflow-y-auto text-[12.5px] leading-relaxed text-foreground/85"
                aria-live="polite"
              >
                {transcript}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer actions */}
      <div className="px-5 sm:px-6 pb-5 pt-1 grid grid-cols-2 gap-3">
        <a
          href={src}
          download={downloadName}
          className="h-12 rounded-2xl border-2 border-amber-200 bg-white text-amber-800 font-semibold text-sm inline-flex items-center justify-center gap-2 hover:bg-amber-50 active:scale-[0.98] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <Download className="h-4 w-4" /> Download Audio
        </a>
        <button
          type="button"
          onClick={onSaveToLibrary}
          disabled={!onSaveToLibrary}
          className={cn(
            "h-12 rounded-2xl font-semibold text-sm inline-flex items-center justify-center gap-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
            onSaveToLibrary
              ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-[0_10px_24px_-12px_rgba(180,140,40,0.7)] hover:from-amber-500 hover:to-amber-700 active:scale-[0.98]"
              : "bg-amber-100/60 text-amber-800/60 cursor-not-allowed",
          )}
        >
          <BookmarkPlus className="h-4 w-4" /> Save to Library
        </button>
      </div>
    </div>
  );
};

export default AudioPlayerCard;
