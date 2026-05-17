import { useEffect, useState } from "react";
import { Play, Pause, X, Headphones } from "lucide-react";
import {
  subscribeGlobalAudio,
  pauseGlobal,
  resumeGlobal,
  stopGlobal,
  seekGlobal,
  type GlobalAudioState,
} from "@/lib/globalAudio";

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

export default function MiniPlayerBar() {
  const [s, setS] = useState<GlobalAudioState | null>(null);
  useEffect(() => subscribeGlobalAudio(setS), []);
  if (!s?.track) return null;

  const pct = s.duration > 0 ? (s.current / s.duration) * 100 : 0;

  return (
    <div className="fixed bottom-16 md:bottom-3 left-1/2 -translate-x-1/2 z-[60] w-[min(560px,calc(100vw-1rem))]">
      <div className="rounded-2xl bg-background/95 backdrop-blur border border-amber-300/60 shadow-[0_10px_30px_-12px_rgba(180,140,40,0.45)] p-2.5 flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-200 to-amber-300 grid place-items-center text-amber-800 shrink-0">
          <Headphones className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate leading-tight">{s.track.title || "Now playing"}</p>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="range"
              min={0}
              max={s.duration || 0}
              step={0.1}
              value={s.current}
              onChange={(e) => seekGlobal(Number(e.target.value))}
              className="flex-1 h-1 accent-amber-500"
              aria-label="Seek"
            />
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {fmt(s.current)} / {fmt(s.duration)}
            </span>
          </div>
          <div className="h-0.5 bg-amber-100 rounded-full mt-0.5 overflow-hidden md:hidden">
            <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button
          onClick={() => (s.playing ? pauseGlobal() : resumeGlobal())}
          className="h-9 w-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-white grid place-items-center shrink-0"
          aria-label={s.playing ? "Pause" : "Play"}
        >
          {s.playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={stopGlobal}
          className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground grid place-items-center shrink-0"
          aria-label="Close player"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}