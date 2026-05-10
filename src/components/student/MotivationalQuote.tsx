import { useMemo } from "react";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const QUOTES: { text: string; author: string }[] = [
  { text: "Small progress every day leads to big results.", author: "Keep going! 🚀" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Stay consistent ✨" },
  { text: "Discipline beats motivation. Show up daily.", author: "One quiz at a time 💪" },
  { text: "Knowledge compounds. So does effort.", author: "Trust the process 🌱" },
  { text: "The expert in anything was once a beginner.", author: "Keep learning 📚" },
];

export const MotivationalQuote = () => {
  const q = useMemo(() => {
    const idx = Math.floor((Date.now() / (1000 * 60 * 60 * 12)) % QUOTES.length);
    return QUOTES[idx];
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Daily motivation"
      className="relative overflow-hidden rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-amber-100/60 px-5 py-5 sm:px-6 sm:py-6 mb-6 shadow-[0_8px_24px_-14px_rgba(180,140,40,0.35)]"
    >
      <div className="pointer-events-none absolute -right-6 -top-6 text-7xl">🏆</div>
      <Quote className="absolute left-4 top-4 w-5 h-5 text-amber-400" />
      <div className="relative pl-6 max-w-[80%]">
        <p className="font-display text-base sm:text-lg font-semibold text-amber-900 leading-snug">
          {q.text}
        </p>
        <p className="text-xs sm:text-sm text-amber-700/80 mt-1.5">— {q.author}</p>
      </div>
    </motion.section>
  );
};

export default MotivationalQuote;
