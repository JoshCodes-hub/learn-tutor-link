import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, Building2, Heart, ChevronRight } from "lucide-react";

interface Slide {
  icon: any;
  title: string;
  body: string;
  accent: string;
}

const SLIDES: Slide[] = [
  {
    icon: Sparkles,
    title: "Ace your CBT exams",
    body: "AI-powered practice questions, instant explanations, and a study plan tuned to your weak areas.",
    accent: "from-primary/30 to-accent/20",
  },
  {
    icon: Building2,
    title: "Run your school, end-to-end",
    body: "Attendance, results, fees, announcements — everything Nigerian schools need, in one beautiful app.",
    accent: "from-accent/30 to-primary/20",
  },
  {
    icon: Heart,
    title: "Free to start. Built in Nigeria.",
    body: "Join thousands of FUTA students and schools already learning, teaching, and growing with OverraPrep.",
    accent: "from-primary/20 to-accent/30",
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
      className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <header className="flex justify-end px-6 pt-4">
        <button
          onClick={onFinish}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-col items-center max-w-sm"
          >
            <div
              className={`relative w-40 h-40 rounded-[2rem] bg-gradient-to-br ${slide.accent} flex items-center justify-center mb-10 shadow-2xl`}
            >
              <div className="absolute inset-2 rounded-[1.6rem] bg-card/60 backdrop-blur-sm flex items-center justify-center">
                <slide.icon className="w-16 h-16 text-primary" strokeWidth={1.5} />
              </div>
            </div>

            <h2 className="font-display text-2xl font-bold tracking-tight mb-3">{slide.title}</h2>
            <p className="text-muted-foreground leading-relaxed">{slide.body}</p>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="px-8 pb-8 pt-4 space-y-6">
        <div className="flex items-center justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-8 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
        <Button size="lg" className="w-full h-12 rounded-2xl" onClick={next}>
          {isLast ? "Get started" : "Next"}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </footer>
    </div>
  );
};

export default WelcomeCarousel;
