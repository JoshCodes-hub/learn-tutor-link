import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";

const Typewriter = ({
  text,
  className,
  startDelay = 0,
  speed = 0.06,
}: {
  text: string;
  className?: string;
  startDelay?: number;
  speed?: number;
}) => {
  const letters = Array.from(text);
  return (
    <p className={className} aria-label={text}>
      {letters.map((ch, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: startDelay + i * speed, duration: 0.05 }}
          style={{ whiteSpace: "pre" }}
        >
          {ch}
        </motion.span>
      ))}
      <motion.span
        className="inline-block w-[2px] h-[1em] align-middle bg-[hsl(220_45%_12%)] ml-0.5"
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.9, repeat: Infinity }}
      />
    </p>
  );
};

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), 3000);
    const doneTimer = setTimeout(() => onComplete(), 3500);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background:
              "linear-gradient(160deg, hsl(45 88% 65%) 0%, hsl(43 80% 55%) 55%, hsl(40 75% 48%) 100%)",
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
            paddingLeft: "env(safe-area-inset-left)",
            paddingRight: "env(safe-area-inset-right)",
          }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Soft ambient highlights */}
          <motion.div
            className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-white/30 blur-3xl"
            animate={{ scale: [1, 1.15, 1], opacity: [0.45, 0.6, 0.45] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-white/20 blur-3xl"
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative z-10 flex flex-col items-center px-8">
            {/* Logo — animated entrance with rotation, float, and pulsing halo */}
            <motion.div
              initial={{ scale: 0.4, opacity: 0, rotate: -25 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 140, damping: 14 }}
              className="relative"
            >
              {/* Pulsing halo behind logo */}
              <motion.div
                className="absolute inset-0 -m-6 rounded-full bg-white/40 blur-2xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.img
                src={logo}
                alt="OverraPrep AI"
                className="relative w-36 h-36 md:w-44 md:h-44 object-contain"
                style={{ filter: "drop-shadow(0 14px 32px rgba(60,40,0,0.32))" }}
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Shimmer sweep */}
              <motion.div
                className="absolute inset-0 pointer-events-none overflow-hidden rounded-full"
                style={{
                  background:
                    "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)",
                  mixBlendMode: "overlay",
                }}
                initial={{ x: "-120%" }}
                animate={{ x: "120%" }}
                transition={{ delay: 0.7, duration: 1.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.2 }}
              />
            </motion.div>

            {/* Tagline — typewriter effect */}
            <Typewriter
              text="Study Smart, Not Hard."
              className="mt-10 text-lg md:text-2xl font-semibold text-[hsl(220_45%_12%)] tracking-wide text-center"
              startDelay={0.6}
              speed={0.06}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
