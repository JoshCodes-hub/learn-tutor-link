import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDueCards, useReviewCard, useSrsStats } from "@/hooks/useSRS";
import { SEO } from "@/components/seo/SEO";

const GRADES = [
  { q: 0, label: "Again", desc: "Forgot", color: "bg-red-500 hover:bg-red-600" },
  { q: 3, label: "Hard",  desc: "Tough",  color: "bg-orange-500 hover:bg-orange-600" },
  { q: 4, label: "Good",  desc: "OK",     color: "bg-emerald-500 hover:bg-emerald-600" },
  { q: 5, label: "Easy",  desc: "Easy",   color: "bg-primary hover:bg-primary/90" },
];

export default function Review() {
  const nav = useNavigate();
  const { data: cards = [], isLoading } = useDueCards();
  const { data: stats } = useSrsStats();
  const review = useReviewCard();
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const card = cards[idx];

  const grade = async (q: number) => {
    if (!card) return;
    await review.mutateAsync({ card, quality: q });
    setRevealed(false);
    setIdx(i => i + 1);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO title="Daily Review" description="Spaced repetition queue" />
      <header className="flex items-center gap-2 px-3 py-3 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <h1 className="text-base font-semibold">Daily Review</h1>
          <p className="text-xs text-muted-foreground">
            {stats ? `${Math.max(0, stats.due - idx)} due · ${stats.total} total` : "Loading..."}
          </p>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : !card ? (
          <div className="text-center py-20">
            <Sparkles className="w-14 h-14 text-primary mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">All caught up! 🎉</h2>
            <p className="text-sm text-muted-foreground mb-5">No cards due right now. Check back tomorrow.</p>
            <Button onClick={() => nav("/library")}>Add more from Library</Button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="rounded-2xl border-2 border-primary/20 bg-card p-6 min-h-[260px] flex flex-col items-center justify-center text-center shadow-sm">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Question</p>
                <p className="text-lg font-semibold whitespace-pre-wrap">{card.front}</p>
                {revealed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="w-full mt-6 pt-6 border-t border-border/60"
                  >
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Answer</p>
                    <p className="text-base whitespace-pre-wrap">{card.back}</p>
                  </motion.div>
                )}
              </div>

              {!revealed ? (
                <Button onClick={() => setRevealed(true)} className="w-full" size="lg">
                  Show Answer
                </Button>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {GRADES.map(g => (
                    <Button
                      key={g.q}
                      onClick={() => grade(g.q)}
                      disabled={review.isPending}
                      className={`${g.color} text-white flex flex-col h-auto py-3`}
                    >
                      <span className="font-semibold text-sm">{g.label}</span>
                      <span className="text-[10px] opacity-90">{g.desc}</span>
                    </Button>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
