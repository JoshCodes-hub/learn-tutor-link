import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCw, Check, X } from "lucide-react";

export interface Flashcard {
  front: string;
  back: string;
  hint?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cards: Flashcard[];
  title?: string;
}

export const FlashcardStudyDialog = ({ open, onOpenChange, cards, title }: Props) => {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knew, setKnew] = useState(0);
  const [review, setReview] = useState(0);

  const card = cards[idx];
  const total = cards.length;
  const done = idx >= total;

  const next = (mark?: "knew" | "review") => {
    if (mark === "knew") setKnew((n) => n + 1);
    if (mark === "review") setReview((n) => n + 1);
    setFlipped(false);
    setIdx((i) => i + 1);
  };

  const prev = () => {
    if (idx === 0) return;
    setFlipped(false);
    setIdx((i) => i - 1);
  };

  const reset = () => { setIdx(0); setFlipped(false); setKnew(0); setReview(0); };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base truncate">
            {title || "Flashcards"} {!done && <span className="text-muted-foreground font-normal text-sm">— {idx + 1}/{total}</span>}
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="text-center py-6 space-y-3">
            <div className="text-4xl">🎉</div>
            <p className="font-semibold">Session complete!</p>
            <div className="flex justify-center gap-4 text-sm">
              <span className="text-emerald-600 font-medium">✓ Knew: {knew}</span>
              <span className="text-amber-600 font-medium">↻ Review: {review}</span>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" onClick={reset}><RotateCw className="w-4 h-4 mr-1.5" /> Restart</Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress */}
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(idx / total) * 100}%` }}
              />
            </div>

            {/* Card */}
            <button
              onClick={() => setFlipped((f) => !f)}
              className="w-full min-h-[220px] rounded-2xl border-2 border-border bg-gradient-to-br from-background to-muted/30 p-5 text-left hover:border-primary/40 transition-colors relative"
            >
              <span className="absolute top-2 right-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {flipped ? "Answer" : "Tap to flip"}
              </span>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${idx}-${flipped}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="pt-6"
                >
                  <p className="text-base sm:text-lg font-medium leading-snug whitespace-pre-wrap">
                    {flipped ? card.back : card.front}
                  </p>
                  {!flipped && card.hint && (
                    <p className="text-xs text-muted-foreground mt-3 italic">💡 {card.hint}</p>
                  )}
                </motion.div>
              </AnimatePresence>
            </button>

            {/* Controls */}
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={prev} disabled={idx === 0}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {flipped ? (
                <div className="flex gap-2 flex-1">
                  <Button variant="outline" size="sm" className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => next("review")}>
                    <X className="w-4 h-4 mr-1.5" /> Review again
                  </Button>
                  <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => next("knew")}>
                    <Check className="w-4 h-4 mr-1.5" /> I knew it
                  </Button>
                </div>
              ) : (
                <Button size="sm" className="flex-1" onClick={() => setFlipped(true)}>
                  Show answer
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => next()} disabled={idx >= total - 1 && !flipped}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FlashcardStudyDialog;