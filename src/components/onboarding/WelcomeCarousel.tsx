import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, Building2, Heart, ChevronRight, Star } from "lucide-react";

interface Slide {
  icon: any;
  eyebrow: string;
  title: string;
  highlight: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: Sparkles,
    eyebrow: "AI Exam Prep",
    title: "Ace your CBT",
    highlight: "with AI on your side",
    body: "Practice past questions, get instant explanations, and follow a study plan tuned to your weak areas.",
  },
  {
    icon: Building2,
    eyebrow: "School Management",
    title: "Run your school",
    highlight: "end-to-end",
    body: "Attendance, results, fees, announcements — everything Nigerian schools need, in one beautiful app.",
  },
  {
    icon: Heart,
    eyebrow: "Made in Nigeria 🇳🇬",
    title: "Free to start.",
    highlight: "Loved by thousands.",
    body: "Join FUTA students, tutors and schools already learning, teaching and growing with OverraPrep.",
  },
];

interface Props {
  onFinish: () => void;
}

const WelcomeCarousel = ({ onFinish }: Props) => {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const next = () => {
    if (isLast) onFinish();
    else setIndex((i) => i + 1);
  };

  return (
    <div
      className="relative min-h-screen flex flex-col bg-background overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Luxury ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-primary/25 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.75, 0.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -left-32 w-[32rem] h-[32rem] rounded-full bg-accent/20 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.45, 0.7, 0.45] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.12),transparent_60%)]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 pt-5">
        <span className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
          Overra<span className="text-primary">Prep</span>
        </span>
        <button
          onClick={onFinish}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip
        </button>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center max-w-md"
          >
            {/* Premium icon medallion */}
            <div className="relative mb-10">
              <motion.div
                className="absolute inset-0 rounded-[2.25rem] bg-gradient-to-br from-primary/40 via-primary/20 to-accent/30 blur-2xl"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="relative w-44 h-44 rounded-[2.25rem] bg-gradient-to-br from-primary/30 via-primary/10 to-accent/20 p-[1.5px] shadow-2xl">
                <div className="w-full h-full rounded-[2.15rem] bg-card/90 backdrop-blur-xl flex items-center justify-center border border-primary/20">
                  <slide.icon className="w-20 h-20 text-primary" strokeWidth={1.25} />
                </div>
              </div>
              {/* sparkle */}
              <motion.div
                className="absolute -top-2 -right-2 text-primary"
                animate={{ rotate: [0, 15, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                <Star className="w-5 h-5 fill-primary" />
              </motion.div>
            </div>

            <span className="text-[11px] font-bold tracking-[0.25em] text-primary uppercase mb-3">
              {slide.eyebrow}
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] mb-4">
              {slide.title}
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {slide.highlight}
              </span>
            </h2>
            <p className="text-muted-foreground leading-relaxed text-[15px] max-w-sm">{slide.body}</p>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="relative z-10 px-8 pb-10 pt-4 space-y-6">
        <div className="flex items-center justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-10 bg-gradient-to-r from-primary to-accent" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
        <Button
          size="lg"
          className="w-full h-14 rounded-2xl text-base font-semibold shadow-xl shadow-primary/30 bg-gradient-to-r from-primary to-accent hover:opacity-95"
          onClick={next}
        >
          {isLast ? "Get started" : "Continue"}
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </footer>
    </div>
  );
};

export default WelcomeCarousel;
