import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";

interface SplashScreenProps {
  onComplete: () => void;
}

const loadingSteps = [
  "Warming up the AI tutor…",
  "Loading your study plan…",
  "Syncing past questions…",
  "Almost there…",
];

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [stage, setStage] = useState<"logo" | "text" | "exit">("logo");
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const logoTimer = setTimeout(() => setStage("text"), 700);
    const textTimer = setTimeout(() => setStage("exit"), 2400);
    const exitTimer = setTimeout(() => onComplete(), 2900);

    // Simulated progress (eases to 100%)
    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) return 100;
        const remaining = 100 - p;
        return Math.min(100, p + Math.max(1.5, remaining * 0.08));
      });
    }, 70);

    // Rotating loading steps
    const stepInterval = setInterval(() => {
      setStepIndex((i) => (i + 1) % loadingSteps.length);
    }, 650);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(textTimer);
      clearTimeout(exitTimer);
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {stage !== "exit" && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-hero overflow-hidden">
            <motion.div
              className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/15 rounded-full blur-3xl"
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.2, 0.4] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <div className="relative z-10 flex flex-col items-center px-8 w-full max-w-sm">
            {/* Logo with glow */}
            <motion.div
              className="relative"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
            >
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-primary blur-xl"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{ transform: "scale(1.5)" }}
              />
              <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-card shadow-2xl flex items-center justify-center overflow-hidden border-2 border-primary/30">
                <motion.img
                  src={logo}
                  alt="OverraPrep AI"
                  className="w-16 h-16 md:w-20 md:h-20 object-contain"
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </motion.div>

            {/* Brand name */}
            <motion.div
              className="mt-7 flex flex-col items-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                Overra<span className="text-gradient-primary">Prep</span>
              </h1>
              <p className="text-muted-foreground mt-1 text-xs md:text-sm">
                AI-Powered Exam Preparation
              </p>
            </motion.div>

            {/* Realistic progress bar */}
            <motion.div
              className="w-full mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <div className="relative h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-accent rounded-full"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut" }}
                />
                <motion.div
                  className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  animate={{ x: ["-3rem", "20rem"] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>

              {/* Rotating step + percent */}
              <div className="flex items-center justify-between mt-2.5 text-[11px]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={stepIndex}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.3 }}
                    className="text-muted-foreground"
                  >
                    {loadingSteps[stepIndex]}
                  </motion.span>
                </AnimatePresence>
                <span className="font-mono font-semibold text-primary tabular-nums">
                  {Math.round(progress)}%
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
