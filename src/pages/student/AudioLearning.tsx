import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  FileText,
  Loader2,
  Play,
  Download,
  Sparkles,
  Headphones,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import { cn } from "@/lib/utils";

interface Voice {
  id: string;
  name: string;
  description: string;
  accent: string;
}

// 4 voice presets — students can pick the one they vibe with.
// Voice IDs are Noiz placeholders; tutors can swap from admin later.
const VOICES: Voice[] = [
  { id: "95814add", name: "Sarah", description: "Clear, warm female narrator", accent: "Neutral" },
  { id: "brian-01", name: "Brian", description: "Calm, deep male storyteller", accent: "British" },
  { id: "charlie-01", name: "Charlie", description: "Friendly conversational tone", accent: "American" },
  { id: "lily-01", name: "Lily", description: "Soft, soothing for late-night study", accent: "Neutral" },
];

const MAX_CHARS = 12000;

const AudioLearning = () => {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState(VOICES[0].id);
  const [extracting, setExtracting] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = text.length;
  const overLimit = charCount > MAX_CHARS;

  const onFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setExtracting(true);
    setAudioUrl(null);
    try {
      let extracted = "";
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const pdfjs: any = await import("pdfjs-dist");
        // worker URL via CDN to avoid bundler config issues
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        const buf = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buf }).promise;
        const parts: string[] = [];
        const maxPages = Math.min(pdf.numPages, 30);
        for (let p = 1; p <= maxPages; p++) {
          const page = await pdf.getPage(p);
          const content = await page.getTextContent();
          parts.push(content.items.map((it: any) => it.str).join(" "));
        }
        extracted = parts.join("\n\n");
        if (pdf.numPages > 30) {
          toast.info(`Long PDF: only first 30 pages were read.`);
        }
      } else if (
        file.name.toLowerCase().endsWith(".docx") ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const mammoth: any = await import("mammoth");
        const buf = await file.arrayBuffer();
        const res = await mammoth.extractRawText({ arrayBuffer: buf });
        extracted = res.value || "";
      } else if (file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt")) {
        extracted = await file.text();
      } else {
        toast.error("Unsupported file. Use PDF, DOCX, or TXT.");
        return;
      }
      const cleaned = extracted.replace(/\s+/g, " ").trim();
      if (!cleaned) {
        toast.error("Could not extract any readable text from this file.");
        return;
      }
      setText(cleaned.slice(0, MAX_CHARS));
      toast.success(`Extracted ${cleaned.length.toLocaleString()} characters`);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to read file: " + (e?.message ?? "unknown error"));
    } finally {
      setExtracting(false);
    }
  };

  const synthesize = async () => {
    if (!text.trim()) {
      toast.error("Add some text or upload a document first");
      return;
    }
    if (overLimit) {
      toast.error(`Text is too long. Trim to ${MAX_CHARS} chars.`);
      return;
    }
    setSynthesizing(true);
    setAudioUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke("text-to-speech", {
        body: { text, voice_id: voiceId, output_format: "mp3" },
      });
      if (error) throw error;
      if (!data?.audio) throw new Error("No audio returned");
      // base64 -> blob URL
      const binary = atob(data.audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: data.mime || "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      toast.success("Audio ready — press play or download");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to generate audio");
    } finally {
      setSynthesizing(false);
    }
  };

  const downloadName = useMemo(() => {
    const base = fileName ? fileName.replace(/\.[^.]+$/, "") : "overraprep-audio";
    const voice = VOICES.find((v) => v.id === voiceId)?.name ?? "voice";
    return `${base}-${voice}.mp3`;
  }, [fileName, voiceId]);

  return (
    <>
      <SEO
        title="Audio Learning — Listen to your notes"
        description="Upload your study documents and listen on the go. AI-powered text-to-speech with natural voices."
        url="/audio-learning"
      />
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur border-b border-border">
          <div className="container mx-auto px-4 h-14 flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Headphones className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Audio Learning</span>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20 p-6 md:p-8"
          >
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 mb-3">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-[11px] font-bold tracking-wider uppercase text-primary">
                New
              </span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
              Turn your notes into audio
            </h1>
            <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-xl">
              Upload a PDF, Word doc, or paste text. Pick a voice. Listen while you walk,
              relax or commute. Clear English, simple to follow.
            </p>
          </motion.div>

          {/* Upload */}
          <Card className="p-5 space-y-4">
            <Label className="font-semibold">1. Add your content</Label>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={extracting}
              className={cn(
                "w-full flex items-center justify-center gap-3 p-5 rounded-xl border-2 border-dashed",
                "border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-colors",
                "disabled:opacity-60",
              )}
            >
              {extracting ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <Upload className="w-5 h-5 text-primary" />
              )}
              <div className="text-left">
                <p className="font-semibold text-sm">
                  {extracting
                    ? "Reading your file…"
                    : fileName
                    ? fileName
                    : "Upload PDF, DOCX or TXT"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Max ~30 pages. We'll extract the text for you.
                </p>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Or paste / edit text</Label>
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    overLimit ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                </span>
              </div>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS + 200))}
                rows={8}
                placeholder="Paste lecture notes, a chapter, or any study text here…"
                className="resize-y font-sans text-sm leading-relaxed"
              />
            </div>
          </Card>

          {/* Voice picker */}
          <Card className="p-5 space-y-4">
            <Label className="font-semibold">2. Pick a voice</Label>
            <div className="grid grid-cols-2 gap-3">
              {VOICES.map((v) => {
                const active = voiceId === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setVoiceId(v.id)}
                    className={cn(
                      "text-left rounded-xl p-3 border-2 transition-all",
                      active
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/50 hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{v.name}</p>
                        <p className="text-[11px] text-muted-foreground">{v.accent}</p>
                      </div>
                      <Volume2
                        className={cn(
                          "w-4 h-4 shrink-0",
                          active ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                      {v.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Synthesize */}
          <Card className="p-5 space-y-4">
            <Label className="font-semibold">3. Generate audio</Label>
            <Button
              onClick={synthesize}
              disabled={synthesizing || !text.trim() || overLimit}
              className="w-full h-12 text-base font-semibold"
            >
              {synthesizing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating audio…
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Generate Audio
                </>
              )}
            </Button>

            {audioUrl && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 pt-2"
              >
                <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-primary" />
                    <p className="font-semibold text-sm truncate">{downloadName}</p>
                  </div>
                  <audio src={audioUrl} controls className="w-full" />
                </div>
                <a href={audioUrl} download={downloadName} className="block">
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download MP3
                  </Button>
                </a>
              </motion.div>
            )}
          </Card>

          <p className="text-center text-[11px] text-muted-foreground pb-6">
            Powered by Noiz AI · OverraPrep — Read with Ease.
          </p>
        </main>
      </div>
    </>
  );
};

export default AudioLearning;
