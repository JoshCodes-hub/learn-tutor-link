import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  FileText,
  Loader2,
  Play,
  Pause,
  Download,
  Sparkles,
  Headphones,
  Volume2,
  ListMusic,
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

// Calls the Overra TTS edge function (HF Space proxy). Auto-retries while warming up.
async function overraTts(text: string, onWarming?: () => void): Promise<Blob> {
  const payload = { text: text.slice(0, 5000), voice: "nigerian", beat_type: "afro_lofi" };
  const MAX_RETRIES = 6;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const { data, error } = await supabase.functions.invoke("overra-tts", { body: payload });
    if (!error && data instanceof Blob && data.type.startsWith("audio/")) return data;

    let warming = false;
    let message = "TTS failed";
    if (error) {
      message = error.message || message;
      const ctx: any = (error as any).context;
      try {
        const txt = await ctx?.text?.();
        if (txt) {
          const j = JSON.parse(txt);
          warming = !!j.warming_up;
          message = j.message || j.error || message;
        }
      } catch {}
      if (/wak|warm|load|503|starting/i.test(message)) warming = true;
    } else if (data && typeof data === "object" && "warming_up" in (data as any)) {
      warming = !!(data as any).warming_up;
      message = (data as any).message || message;
    }

    if (warming && attempt < MAX_RETRIES) {
      onWarming?.();
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    throw new Error(message);
  }
  throw new Error("Engine still warming up — please retry");
}

interface Section {
  title: string;
  text: string;
  audioUrl?: string;
  loading?: boolean;
}

const AudioLearning = () => {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState(VOICES[0].id);
  const [extracting, setExtracting] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [sections, setSections] = useState<Section[]>([]);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const audioRefs = useRef<Record<number, HTMLAudioElement | null>>({});
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

  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // Split text into ~1800-char chunks at sentence/paragraph boundaries.
  const chunkText = (raw: string, max = 1800): string[] => {
    const clean = raw.replace(/\s+/g, " ").trim();
    if (clean.length <= max) return [clean];
    const sentences = clean.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let buf = "";
    for (const s of sentences) {
      if ((buf + " " + s).trim().length > max) {
        if (buf) chunks.push(buf.trim());
        if (s.length > max) {
          for (let i = 0; i < s.length; i += max) chunks.push(s.slice(i, i + max));
          buf = "";
        } else buf = s;
      } else buf = (buf ? buf + " " : "") + s;
    }
    if (buf.trim()) chunks.push(buf.trim());
    return chunks;
  };

  // Merge multiple WAV blobs into one playable WAV (strip headers from chunks 2+).
  const mergeWavBlobs = async (blobs: Blob[]): Promise<Blob> => {
    if (blobs.length === 1) return blobs[0];
    const buffers = await Promise.all(blobs.map((b) => b.arrayBuffer()));
    const HEADER = 44;
    const dataParts = buffers.map((buf, i) => new Uint8Array(buf, i === 0 ? 0 : HEADER));
    const totalLen = dataParts.reduce((s, p) => s + p.length, 0);
    const merged = new Uint8Array(totalLen);
    let offset = 0;
    for (const p of dataParts) { merged.set(p, offset); offset += p.length; }
    // Patch RIFF chunk size (offset 4) and data chunk size (offset 40) in header
    const view = new DataView(merged.buffer);
    view.setUint32(4, totalLen - 8, true);
    view.setUint32(40, totalLen - HEADER, true);
    return new Blob([merged], { type: "audio/wav" });
  };

  const synthesize = async () => {
    if (!text.trim()) {
      toast.error("Add some text or upload a document first");
      return;
    }
    setSynthesizing(true);
    setAudioUrl(null);
    setProgress(null);
    try {
      const chunks = chunkText(text);
      setProgress({ done: 0, total: chunks.length });
      const blobs: Blob[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const blob = await overraTts(chunks[i], () =>
          toast.message("Engine waking up… retrying in 5s"),
        );
        blobs.push(blob);
        setProgress({ done: i + 1, total: chunks.length });
      }
      const merged = blobs.length === 1 ? blobs[0] : new Blob(blobs, { type: "audio/mpeg" });
      const url = URL.createObjectURL(merged);
      setAudioUrl(url);
      toast.success("Narration ready — press play or download");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to generate audio");
    } finally {
      setSynthesizing(false);
      setProgress(null);
    }
  };

  const downloadName = useMemo(() => {
    const base = fileName ? fileName.replace(/\.[^.]+$/, "") : "overraprep-narration";
    return `${base}.wav`;
  }, [fileName]);

  // Split text into sections by headings or paragraph groups (~1500 chars each).
  const splitIntoSections = (raw: string): Section[] => {
    const clean = raw.replace(/\r\n/g, "\n").trim();
    if (!clean) return [];

    // 1) Try heading-style splits (lines like "1.", "Chapter X", "SECTION", ALL CAPS lines).
    const headingRe = /\n(?=(?:Chapter\s+\d+|Section\s+\d+|\d+\.\s+[A-Z]|[A-Z][A-Z\s]{4,}\n))/g;
    let parts = clean.split(headingRe).map((p) => p.trim()).filter(Boolean);

    // 2) If no headings found, group paragraphs into ~1500-char sections.
    if (parts.length < 2) {
      const paras = clean.split(/\n{2,}|(?<=\.)\s{2,}/).map((p) => p.trim()).filter(Boolean);
      parts = [];
      let buf = "";
      for (const p of paras) {
        if ((buf + " " + p).length > 1500 && buf) { parts.push(buf.trim()); buf = p; }
        else buf = buf ? `${buf}\n\n${p}` : p;
      }
      if (buf.trim()) parts.push(buf.trim());
    }

    return parts.map((body, i) => {
      const firstLine = body.split("\n")[0].trim();
      const title = firstLine.length > 0 && firstLine.length <= 80
        ? firstLine.replace(/[:.\-—]+$/, "")
        : `Section ${i + 1}`;
      return { title, text: body };
    });
  };

  const generateTranscript = () => {
    if (!text.trim()) {
      toast.error("Add some text or upload a document first");
      return;
    }
    const next = splitIntoSections(text);
    if (!next.length) {
      toast.error("Could not split text into sections");
      return;
    }
    setSections(next);
    setPlayingIdx(null);
    toast.success(`Transcript generated — ${next.length} sections`);
  };

  const synthSection = async (idx: number) => {
    const sec = sections[idx];
    if (!sec) return;
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, loading: true } : s)));
    try {
      const chunks = chunkText(sec.text);
      const blobs: Blob[] = [];
      for (const c of chunks) {
        const res = await fetch(
          `https://urgency-company-bonfire.ngrok-free.dev/tts?text=${encodeURIComponent(c)}`,
          { method: "GET", headers: { "ngrok-skip-browser-warning": "true" } },
        );
        if (!res.ok) throw new Error(`Section ${idx + 1} failed (${res.status})`);
        blobs.push(await res.blob());
      }
      const merged = blobs.length === 1 ? blobs[0] : new Blob(blobs, { type: "audio/mpeg" });
      const url = URL.createObjectURL(merged);
      setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, audioUrl: url, loading: false } : s)));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to narrate section");
      setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, loading: false } : s)));
    }
  };

  const togglePlay = async (idx: number) => {
    const sec = sections[idx];
    if (!sec) return;
    if (!sec.audioUrl) { await synthSection(idx); return; }
    // Pause others
    Object.entries(audioRefs.current).forEach(([k, el]) => {
      if (Number(k) !== idx && el) el.pause();
    });
    const el = audioRefs.current[idx];
    if (!el) return;
    if (playingIdx === idx && !el.paused) { el.pause(); setPlayingIdx(null); }
    else { el.play(); setPlayingIdx(idx); }
  };


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
              disabled={synthesizing || !text.trim()}
              className="w-full h-12 text-base font-semibold"
            >
              {synthesizing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {progress ? `Narrating ${progress.done}/${progress.total}…` : "Preparing…"}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Read Document
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
                    Download Narration
                  </Button>
                </a>
              </motion.div>
            )}
          </Card>

          {/* Section-by-section transcript */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-semibold flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-primary" />
                Section-by-section transcript
              </Label>
              <Button size="sm" variant="outline" onClick={generateTranscript} disabled={!text.trim()}>
                {sections.length ? "Regenerate" : "Generate"}
              </Button>
            </div>

            {sections.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Split your document into sections and play each part on its own.
              </p>
            ) : (
              <ul className="space-y-3">
                {sections.map((s, i) => {
                  const isPlaying = playingIdx === i;
                  return (
                    <li key={i} className="rounded-xl border border-border bg-card p-3 space-y-2">
                      <div className="flex items-start gap-3">
                        <span className="shrink-0 mt-0.5 inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{s.title}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {s.text.slice(0, 140)}…
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant={isPlaying ? "default" : "outline"}
                          onClick={() => togglePlay(i)}
                          disabled={s.loading}
                          className="shrink-0"
                          aria-label={isPlaying ? "Pause" : "Play"}
                        >
                          {s.loading ? <Loader2 className="w-4 h-4 animate-spin" />
                            : isPlaying ? <Pause className="w-4 h-4" />
                            : <Play className="w-4 h-4" />}
                        </Button>
                      </div>

                      {s.audioUrl && (
                        <div className="flex items-center gap-2">
                          <audio
                            ref={(el) => { audioRefs.current[i] = el; }}
                            src={s.audioUrl}
                            controls
                            onEnded={() => setPlayingIdx(null)}
                            onPause={() => { if (playingIdx === i) setPlayingIdx(null); }}
                            className="w-full h-9"
                          />
                          <a href={s.audioUrl} download={`${fileName.replace(/\.[^.]+$/, "") || "section"}-${i + 1}.wav`}>
                            <Button size="icon" variant="ghost" aria-label="Download section">
                              <Download className="w-4 h-4" />
                            </Button>
                          </a>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
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
