import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";

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
            {/* Logo — no background plate, direct on gold with soft glow */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 160, damping: 16 }}
              className="relative"
            >
              <motion.img
                src={logo}
                alt="OverraPrep AI"
                className="w-32 h-32 md:w-40 md:h-40 object-contain"
                style={{ filter: "drop-shadow(0 12px 28px rgba(60,40,0,0.28))" }}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Subtle shimmer sweep */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)",
                  mixBlendMode: "overlay",
                }}
                initial={{ x: "-100%" }}
                animate={{ x: "120%" }}
                transition={{ delay: 0.8, duration: 1.4, ease: "easeInOut" }}
              />
            </motion.div>

            {/* Wordmark */}
            <motion.h1
              className="mt-7 text-3xl md:text-4xl font-bold tracking-tight text-[hsl(220_45%_12%)]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              OverraPrep
            </motion.h1>

            {/* Tagline — slides DOWN from above */}
            <motion.p
              className="mt-3 text-base md:text-lg font-medium text-[hsl(220_45%_12%)]/80 tracking-wide"
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              Study Smart, Not Hard.
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
