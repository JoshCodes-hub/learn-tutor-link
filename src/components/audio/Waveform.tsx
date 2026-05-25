import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** 0..1 playback progress */
  progress: number;
  /** whether playback is active — drives subtle animation */
  playing?: boolean;
  bars?: number;
  className?: string;
}

/**
 * Lightweight CSS-only "waveform" — a row of bars whose filled portion
 * matches `progress`. Active bars wobble slightly while playing.
 * No external deps. Pure visual indicator over the underlying audio engine.
 */
export function Waveform({ progress, playing, bars = 56, className }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const seedsRef = useRef<number[]>(
    Array.from({ length: bars }, () => 0.35 + Math.random() * 0.65)
  );

  useEffect(() => {
    if (!playing) return;
    const el = rootRef.current;
    if (!el) return;
    let raf = 0;
    const tick = () => {
      const t = performance.now() / 320;
      const children = el.children;
      const filled = Math.floor(progress * children.length);
      for (let i = 0; i < children.length; i++) {
        const c = children[i] as HTMLElement;
        const seed = seedsRef.current[i];
        const within = Math.abs(i - filled) < 4;
        const wobble = within ? 0.5 + Math.sin(t + i) * 0.3 : 0;
        const h = Math.min(1, seed + wobble);
        c.style.transform = `scaleY(${h})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, progress]);

  const filled = Math.floor(Math.max(0, Math.min(1, progress)) * bars);

  return (
    <div
      ref={rootRef}
      className={cn("flex items-center gap-[2px] h-12 select-none", className)}
      aria-hidden
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "block w-[3px] rounded-full origin-center transition-colors",
            i <= filled ? "bg-amber-500" : "bg-amber-200/70",
          )}
          style={{
            height: `${22 + seedsRef.current[i] * 26}px`,
            transform: `scaleY(${seedsRef.current[i]})`,
            transitionDuration: "120ms",
          }}
        />
      ))}
    </div>
  );
}

export default Waveform;