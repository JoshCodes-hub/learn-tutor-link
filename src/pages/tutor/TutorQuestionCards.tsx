import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Sparkles,
  Loader2,
  Download,
  Image as ImageIcon,
  FileText,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import logoSrc from "@/assets/logo.png";

interface QCard {
  id: string;
  question: string;
  options: string[];
  correct: number; // index 0..3
  imageUrl?: string;
}

const newCard = (): QCard => ({
  id: crypto.randomUUID(),
  question: "",
  options: ["", "", "", ""],
  correct: 0,
});

const TutorQuestionCards = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [cards, setCards] = useState<QCard[]>([newCard()]);
  const [exporting, setExporting] = useState(false);
  const tutorName = profile?.full_name ?? "OverraPrep Tutor";
  const tutorCode = (profile as any)?.tutor_code ?? "";

  const addCard = () => setCards((c) => [...c, newCard()]);
  const removeCard = (id: string) =>
    setCards((c) => (c.length === 1 ? c : c.filter((x) => x.id !== id)));
  const updateCard = (id: string, patch: Partial<QCard>) =>
    setCards((c) => c.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const uploadCardImage = async (id: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be under 4MB");
      return;
    }
    try {
      const path = `cards/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage
        .from("question-images")
        .upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("question-images").getPublicUrl(path);
      updateCard(id, { imageUrl: data.publicUrl });
      toast.success("Image added");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    }
  };

  const generateWithAI = async () => {
    if (!topic.trim()) {
      toast.error("Enter a topic for the AI");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-explanation", {
        body: {
          mode: "generate-cards",
          topic: topic.trim(),
          count: Math.max(1, Math.min(10, count)),
        },
      });
      // ai-explanation may not support this mode; we fall back to a generic prompt format
      let generated: any[] = [];
      if (!error && Array.isArray(data?.cards)) {
        generated = data.cards;
      } else {
        // Fallback: call a more generic function we know exists (community-ask-ai)
        const fallback = await supabase.functions.invoke("community-ask-ai", {
          body: {
            question: `Generate ${count} multiple-choice questions on the topic "${topic}". Return STRICT JSON only as an array of objects with keys: question (string), options (array of 4 strings), correct (0..3 index). No prose.`,
          },
        });
        const raw = fallback.data?.answer ?? fallback.data?.response ?? "";
        const match = String(raw).match(/\[[\s\S]*\]/);
        if (match) {
          try {
            generated = JSON.parse(match[0]);
          } catch {
            /* ignore */
          }
        }
      }
      if (!generated.length) {
        toast.error("AI didn't return valid questions. Try a clearer topic.");
        return;
      }
      const mapped: QCard[] = generated.slice(0, 10).map((g: any) => ({
        id: crypto.randomUUID(),
        question: String(g.question ?? "").trim(),
        options: Array.isArray(g.options)
          ? g.options.slice(0, 4).map((o: any) => String(o))
          : ["", "", "", ""],
        correct: Number.isInteger(g.correct) ? Math.max(0, Math.min(3, g.correct)) : 0,
      }));
      setCards(mapped);
      toast.success(`Generated ${mapped.length} cards`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "AI generation failed");
    } finally {
      setGenerating(false);
    }
  };

  /** Render one card to a canvas. Returns the canvas. */
  const renderCardCanvas = async (card: QCard, index: number): Promise<HTMLCanvasElement> => {
    const W = 1080;
    const H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Background gradient (white → soft gold)
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#FFFFFF");
    grad.addColorStop(1, "#FFF6DC");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Top accent bar
    ctx.fillStyle = "#D4A017";
    ctx.fillRect(0, 0, W, 14);

    // Header
    ctx.fillStyle = "#7A5A00";
    ctx.font = "600 32px Inter, system-ui, sans-serif";
    ctx.fillText(`Question ${index + 1}`, 60, 110);

    ctx.fillStyle = "#1A1A1A";
    ctx.font = "700 44px Inter, system-ui, sans-serif";
    wrapText(ctx, card.question || "(empty question)", 60, 180, W - 120, 56);

    // Optional image
    let nextY = 180 + measureWrappedHeight(ctx, card.question || "x", W - 120, 56) + 40;
    if (card.imageUrl) {
      try {
        const img = await loadImage(card.imageUrl);
        const maxH = 360;
        const ratio = img.width / img.height;
        let drawW = W - 120;
        let drawH = drawW / ratio;
        if (drawH > maxH) {
          drawH = maxH;
          drawW = drawH * ratio;
        }
        ctx.drawImage(img, (W - drawW) / 2, nextY, drawW, drawH);
        nextY += drawH + 30;
      } catch {
        /* ignore */
      }
    }

    // Options
    ctx.font = "500 30px Inter, system-ui, sans-serif";
    const letters = ["A", "B", "C", "D"];
    card.options.forEach((opt, i) => {
      const isCorrect = i === card.correct;
      const y = nextY + i * 90;
      // Pill
      ctx.fillStyle = isCorrect ? "#FFF1B8" : "#FFFFFF";
      ctx.strokeStyle = isCorrect ? "#D4A017" : "#E5E7EB";
      ctx.lineWidth = 2;
      roundRect(ctx, 60, y, W - 120, 70, 16, true, true);
      // Letter
      ctx.fillStyle = isCorrect ? "#7A5A00" : "#6B7280";
      ctx.font = "700 28px Inter, system-ui, sans-serif";
      ctx.fillText(letters[i], 90, y + 46);
      // Option text
      ctx.fillStyle = "#1A1A1A";
      ctx.font = "500 28px Inter, system-ui, sans-serif";
      const text = opt || `(option ${letters[i]})`;
      ctx.fillText(text.length > 60 ? text.slice(0, 57) + "…" : text, 140, y + 46);
    });

    // Footer attribution
    ctx.fillStyle = "#7A5A00";
    ctx.font = "500 22px Inter, system-ui, sans-serif";
    ctx.fillText(`Created by ${tutorName}${tutorCode ? ` · ${tutorCode}` : ""}`, 60, H - 100);

    // Watermark — center (subtle)
    try {
      const logo = await loadImage(logoSrc);
      const cw = 360;
      const ch = (logo.height / logo.width) * cw;
      ctx.globalAlpha = 0.07;
      ctx.drawImage(logo, (W - cw) / 2, (H - ch) / 2, cw, ch);
      ctx.globalAlpha = 1;

      // Watermark — bottom right (visible)
      const bw = 110;
      const bh = (logo.height / logo.width) * bw;
      ctx.globalAlpha = 0.85;
      ctx.drawImage(logo, W - bw - 50, H - bh - 50, bw, bh);
      ctx.globalAlpha = 1;
    } catch {
      /* ignore */
    }

    // Wordmark next to corner watermark
    ctx.fillStyle = "#7A5A00";
    ctx.font = "700 22px Inter, system-ui, sans-serif";
    ctx.fillText("OverraPrep AI", W - 280, H - 60);

    return canvas;
  };

  const exportPNG = async () => {
    setExporting(true);
    try {
      for (let i = 0; i < cards.length; i++) {
        const c = await renderCardCanvas(cards[i], i);
        const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
        if (!blob) continue;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `overraprep-card-${i + 1}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
      toast.success(`Downloaded ${cards.length} PNG card(s)`);
    } catch (e: any) {
      toast.error(e?.message ?? "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const exportPDF = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "px", format: [1080, 1350], orientation: "portrait" });
      for (let i = 0; i < cards.length; i++) {
        const c = await renderCardCanvas(cards[i], i);
        const dataUrl = c.toDataURL("image/png");
        if (i > 0) pdf.addPage([1080, 1350], "portrait");
        pdf.addImage(dataUrl, "PNG", 0, 0, 1080, 1350);
      }
      pdf.save(`overraprep-question-cards-${Date.now()}.pdf`);
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e?.message ?? "PDF export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <SEO
        title="Question Cards — Tutor Studio"
        description="Create branded question cards manually or with AI. Download as PNG or PDF with the OverraPrep watermark."
        url="/tutor/question-cards"
      />
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur border-b border-border">
          <div className="container mx-auto px-4 h-14 flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Question Cards</span>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20 p-6"
          >
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
              Create Question Cards
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Build them manually, with AI, or upload your own images. Download as branded
              PNG or PDF — perfect for WhatsApp, X, and study groups.
            </p>
          </motion.div>

          {/* AI generation */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <Label className="font-semibold">Generate with AI</Label>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Input
                placeholder="Topic — e.g. Newton's Laws, Calculus limits, OOP basics"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
              <Input
                type="number"
                min={1}
                max={10}
                className="w-20"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 5)}
              />
            </div>
            <Button onClick={generateWithAI} disabled={generating} className="w-full">
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" /> Generate {count} cards
                </>
              )}
            </Button>
          </Card>

          {/* Cards */}
          <div className="space-y-4">
            {cards.map((card, idx) => (
              <Card key={card.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Card {idx + 1}</Label>
                  {cards.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCard(card.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <Textarea
                  placeholder="Question…"
                  value={card.question}
                  onChange={(e) => updateCard(card.id, { question: e.target.value })}
                  rows={2}
                />

                <div className="grid grid-cols-2 gap-2">
                  {card.options.map((opt, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-2 transition-colors",
                        card.correct === i
                          ? "border-primary bg-primary/5"
                          : "border-border",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => updateCard(card.id, { correct: i })}
                        className={cn(
                          "w-6 h-6 rounded-full text-xs font-bold shrink-0 transition-colors",
                          card.correct === i
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {["A", "B", "C", "D"][i]}
                      </button>
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const next = [...card.options];
                          next[i] = e.target.value;
                          updateCard(card.id, { options: next });
                        }}
                        placeholder={`Option ${["A", "B", "C", "D"][i]}`}
                        className="border-0 px-1 h-8 focus-visible:ring-0"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id={`img-${card.id}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadCardImage(card.id, f);
                    }}
                  />
                  <Label
                    htmlFor={`img-${card.id}`}
                    className="cursor-pointer text-xs flex items-center gap-1 text-muted-foreground hover:text-primary"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    {card.imageUrl ? "Change image" : "Add image (optional)"}
                  </Label>
                  {card.imageUrl && (
                    <button
                      onClick={() => updateCard(card.id, { imageUrl: undefined })}
                      className="text-xs text-destructive hover:underline"
                    >
                      remove
                    </button>
                  )}
                </div>
                {card.imageUrl && (
                  <img
                    src={card.imageUrl}
                    alt=""
                    className="rounded-lg max-h-32 object-contain border border-border"
                  />
                )}
              </Card>
            ))}

            <Button onClick={addCard} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Add another card
            </Button>
          </div>

          {/* Export */}
          <Card className="p-5 space-y-3 border-primary/30 bg-primary/5">
            <Label className="font-semibold flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" /> Export with watermark
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={exportPNG} disabled={exporting} variant="outline">
                {exporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ImageIcon className="w-4 h-4 mr-2" />
                )}
                PNG
              </Button>
              <Button onClick={exportPDF} disabled={exporting}>
                {exporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                PDF
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Each card includes the OverraPrep watermark (centre + bottom-right) and your tutor
              attribution.
            </p>
          </Card>
        </main>
      </div>
    </>
  );
};

/* ---------- canvas helpers ---------- */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + " ";
    if (ctx.measureText(test).width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, yy);
      line = words[n] + " ";
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, yy);
}

function measureWrappedHeight(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let lines = 1;
  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + " ";
    if (ctx.measureText(test).width > maxWidth && n > 0) {
      lines++;
      line = words[n] + " ";
    } else {
      line = test;
    }
  }
  return lines * lineHeight;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: boolean,
  stroke: boolean,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default TutorQuestionCards;
