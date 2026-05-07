import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Rewind, FastForward, Download, Loader2, Headphones, AudioWaveform } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TTS_URL = "https://urgency-company-bonfire.ngrok-free.dev/tts";
const SPEEDS = [1, 1.5, 2] as const;

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

export const StudyPackAudioPlayer = ({ text, fileName = "study-pack-audio.mp3" }: Props) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);

  const generate = async () => {
    if (!text?.trim()) {
      toast.error("No summary text to narrate yet");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${TTS_URL}?text=${encodeURIComponent(text.slice(0, 5000))}`, {
        method: "GET",
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (!res.ok) throw new Error(`TTS failed (${res.status})`);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return objUrl;
      });
      toast.success("Audio ready");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to generate audio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.playbackRate = speed;
  }, [speed, url]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.play(); setPlaying(true); }
    else { a.pause(); setPlaying(false); }
  };

  const seekBy = (delta: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min((a.duration || 0), a.currentTime + delta));
  };

  return (
    <div className="space-y-4">
      {!url && (
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/15 grid place-items-center mb-3">
            <Headphones className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-display text-lg font-semibold">Listen to this Study Pack</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Generate AI narration from the Summary and listen on the go.
          </p>
          <Button onClick={generate} disabled={loading || !text?.trim()} className="min-w-[180px]">
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
            ) : (
              <><AudioWaveform className="w-4 h-4 mr-2" /> Generate Audio</>
            )}
          </Button>
        </div>
      )}

      {url && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <audio
            ref={audioRef}
            src={url}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
            onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
            onEnded={() => setPlaying(false)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            preload="metadata"
            className="hidden"
          />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 grid place-items-center shrink-0">
              <AudioWaveform className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">AI Narration</p>
              <p className="text-[11px] text-muted-foreground">From Summary</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Slider
              value={[current]}
              max={duration || 0.0001}
              step={0.1}
              onValueChange={(v) => {
                const a = audioRef.current;
                if (a) { a.currentTime = v[0]; setCurrent(v[0]); }
              }}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
              <span>{fmt(current)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="icon" onClick={() => seekBy(-10)} aria-label="Back 10 seconds" className="rounded-full">
              <Rewind className="w-4 h-4" />
            </Button>
            <Button onClick={togglePlay} size="icon" className="rounded-full h-12 w-12" aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </Button>
            <Button variant="outline" size="icon" onClick={() => seekBy(10)} aria-label="Forward 10 seconds" className="rounded-full">
              <FastForward className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="inline-flex rounded-full border border-border p-0.5 bg-muted/40">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={cn(
                    "px-3 h-7 text-xs font-semibold rounded-full transition-colors",
                    speed === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={generate} disabled={loading}>
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Regenerate"}
              </Button>
              <a href={url} download={fileName}>
                <Button variant="outline" size="sm">
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
