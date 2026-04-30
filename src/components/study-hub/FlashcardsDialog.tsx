import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, RefreshCcw, Printer, Download } from "lucide-react";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";

export interface Flashcard { front: string; back: string; topic: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cards: Flashcard[];
  courseLabel?: string;
}

export const FlashcardsDialog = ({ open, onOpenChange, cards, courseLabel }: Props) => {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = cards[idx];

  const next = () => { setFlipped(false); setIdx(i => Math.min(i + 1, cards.length - 1)); };
  const prev = () => { setFlipped(false); setIdx(i => Math.max(i - 1, 0)); };

  const downloadPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 36;
    const cardW = (pageW - margin * 2 - 12) / 2;
    const cardH = (pageH - margin * 2 - 12) / 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`OverraPrep Flashcards${courseLabel ? ` — ${courseLabel}` : ""}`, margin, margin - 8);

    let perPage = 4;
    cards.forEach((c, i) => {
      const onPage = i % perPage;
      if (i > 0 && onPage === 0) {
        doc.addPage();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(`OverraPrep Flashcards${courseLabel ? ` — ${courseLabel}` : ""}`, margin, margin - 8);
      }
      const col = onPage % 2;
      const row = Math.floor(onPage / 2);
      const x = margin + col * (cardW + 12);
      const y = margin + row * (cardH + 12);

      // Front card
      doc.setDrawColor(217, 168, 50);
      doc.setLineWidth(1);
      doc.roundedRect(x, y, cardW, cardH, 10, 10, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(180, 130, 40);
      doc.text(`#${i + 1} · ${c.topic}`, x + 10, y + 16);
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text(doc.splitTextToSize(c.front, cardW - 20), x + 10, y + 36);

      // Back hint at bottom
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("— Answer on back —", x + 10, y + cardH - 10);
    });

    // Backs page
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text("Answers", margin, margin - 8);
    let yy = margin;
    cards.forEach((c, i) => {
      const block = doc.splitTextToSize(`#${i + 1} (${c.topic}): ${c.back}`, pageW - margin * 2);
      const blockH = block.length * 13 + 12;
      if (yy + blockH > pageH - margin) { doc.addPage(); yy = margin; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(180, 130, 40);
      doc.text(`#${i + 1} · ${c.topic}`, margin, yy + 10);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(30, 30, 30);
      doc.text(doc.splitTextToSize(c.back, pageW - margin * 2), margin, yy + 26);
      yy += blockH + 8;
    });

    doc.save(`flashcards-${(courseLabel ?? "session").replace(/\s+/g, "-")}.pdf`);
  };

  const printNow = () => window.print();

  if (!cards.length) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif">
            Flashcards <span className="text-sm font-normal text-muted-foreground">({cards.length} cards)</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div className="w-full perspective-[1200px]">
            <motion.div
              key={idx + (flipped ? "b" : "f")}
              initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.35 }}
              onClick={() => setFlipped(f => !f)}
              className={cn(
                "relative cursor-pointer rounded-3xl border-2 p-8 min-h-[280px] flex flex-col justify-center text-center shadow-lg transition-colors",
                flipped
                  ? "bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-300"
                  : "bg-white border-amber-200"
              )}
            >
              <Badge className="self-center mb-3 bg-amber-100 text-amber-800 border-amber-200">
                {flipped ? "Answer" : "Question"} · {card.topic}
              </Badge>
              <p className="font-serif text-xl leading-relaxed">
                {flipped ? card.back : card.front}
              </p>
              <p className="text-[11px] text-muted-foreground mt-4">Click card to flip</p>
            </motion.div>
          </div>

          <div className="flex items-center justify-between w-full">
            <Button size="sm" variant="outline" onClick={prev} disabled={idx === 0}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <span className="text-sm text-muted-foreground">{idx + 1} / {cards.length}</span>
            <Button size="sm" variant="outline" onClick={next} disabled={idx === cards.length - 1}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 justify-center pt-2 border-t border-amber-100/60 w-full">
            <Button size="sm" variant="outline" onClick={() => { setIdx(0); setFlipped(false); }}>
              <RefreshCcw className="h-3.5 w-3.5" /> Restart
            </Button>
            <Button size="sm" variant="outline" onClick={printNow}>
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
            <Button size="sm" onClick={downloadPdf} className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
              <Download className="h-3.5 w-3.5" /> Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FlashcardsDialog;
