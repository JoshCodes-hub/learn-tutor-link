import { motion } from "framer-motion";
import { Headphones, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle: string;
  isPlaying: boolean;
}

/**
 * Large, music-app style album-art square. Gold gradient with floating orbs
 * and a slowly-rotating headphone disc when playing. Pure visual.
 */
export function NowPlayingArtwork({ title, subtitle, isPlaying }: Props) {
  return (
    <div className="relative aspect-square w-full max-w-[280px] mx-auto rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-amber-200/40">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-[conic-gradient(from_220deg_at_50%_50%,#f3d27a,#c9a84c,#8b6f1e,#c9a84c,#f3d27a)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/30" />

      {/* Floating orbs */}
      <motion.div
        className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/30 blur-3xl"
        animate={isPlaying ? { scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] } : { opacity: 0.3 }}
        transition={{ duration: 5, repeat: Infinity }}
      />
      <motion.div
        className="absolute -left-10 bottom-0 w-40 h-40 rounded-full bg-black/25 blur-3xl"
        animate={isPlaying ? { scale: [1.1, 1, 1.1], opacity: [0.5, 0.3, 0.5] } : { opacity: 0.3 }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      {/* Rotating disc */}
      <motion.div
        animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        className="absolute inset-8 rounded-full bg-gradient-to-br from-white/30 to-white/5 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/40 shadow-inner"
      >
        <div className="absolute inset-3 rounded-full border border-white/30" />
        <div className="absolute inset-6 rounded-full border border-white/20" />
        <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center ring-2 ring-white/40">
          <Headphones className={cn("w-6 h-6 text-white", !isPlaying && "opacity-80")} />
        </div>
      </motion.div>

      {/* Now-playing chip */}
      <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur text-white">
        <Sparkles className="w-3 h-3" />
        <span className="text-[10px] font-bold tracking-wider uppercase">Now Playing</span>
      </div>

      {/* Bottom title */}
      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/55 via-black/20 to-transparent text-white">
        <p className="font-display text-base font-bold tracking-tight truncate">{title}</p>
        <p className="text-[11px] opacity-85 truncate">{subtitle}</p>
      </div>
    </div>
  );
}