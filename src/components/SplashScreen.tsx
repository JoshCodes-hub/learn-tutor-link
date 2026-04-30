import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), 2300);
    const doneTimer = setTimeout(() => onComplete(), 2800);
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
              "linear-gradient(160deg, hsl(43 82% 60%) 0%, hsl(43 78% 52%) 55%, hsl(40 72% 46%) 100%)",
          }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Subtle ambient highlights */}
          <motion.div
            className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-white/15 blur-3xl"
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.55, 0.4] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-[hsl(220_45%_18%)]/15 blur-3xl"
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.45, 0.3] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative z-10 flex flex-col items-center px-8">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 180, damping: 18 }}
              className="relative"
            >
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-3xl bg-white/95 shadow-2xl flex items-center justify-center">
                <img
                  src={logo}
                  alt="OverraPrep AI"
                  className="w-20 h-20 md:w-24 md:h-24 object-contain"
                />
              </div>
            </motion.div>

            {/* Wordmark */}
            <motion.h1
              className="mt-7 text-3xl md:text-4xl font-bold tracking-tight text-[hsl(220_50%_10%)]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
            >
              OverraPrep
            </motion.h1>

            {/* Tagline — slides down */}
            <motion.p
              className="mt-3 text-base md:text-lg font-medium text-[hsl(220_50%_10%)]/75 tracking-wide"
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              Read with Ease.
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
