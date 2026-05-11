import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  Loader2,
  Play,
  Pause,
  Square,
  Sparkles,
  Headphones,
  ListMusic,
  Save,
  FileText,
  Volume2,
  WifiOff,
  Smartphone,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { SEO } from "@/components/seo/SEO";
import { cn } from "@/lib/utils";
import { BrowserTts, isTtsSupported, listVoices, type TtsState, type TtsVoice } from "@/lib/browserTts";

const MAX_CHARS = 50000; // on-device, no upstream limit

interface Section { title: string; text: string }

const SPEEDS = [0.85, 1, 1.25, 1.5, 2];

const AudioLearning = () => {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [extracting, setExtracting] = useState(false);

  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const [rate, setRate] = useState(1);

  const [state, setState] = useState<TtsState>("idle");
  const [progress, setProgress] = useState(0);
  const [chunkInfo, setChunkInfo] = useState({ chunk: 0, total: 0 });
  const ttsRef = useRef<BrowserTts | null>(null);

  const [sections, setSections] = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supported = isTtsSupported();

  // Load voices once
  useEffect(() => {
    if (!supported) return;
    listVoices().then((vs) => {
      setVoices(vs);
      // Prefer English, local, default
      const preferred =
        vs.find((v) => v.default && v.lang.startsWith("en")) ||
        vs.find((v) => v.localService && v.lang.startsWith("en")) ||
        vs.find((v) => v.lang.startsWith("en")) ||
        vs[0];
      if (preferred) setVoiceURI(preferred.id);
    });
  }, [supported]);

  // Cleanup on unmount
  useEffect(() => () => ttsRef.current?.destroy(), []);

  const charCount = text.length;

  const onFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setExtracting(true);
    ttsRef.current?.stop();
    try {
      let extracted = "";
      const lower = file.name.toLowerCase();
      if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
        const pdfjs: any = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        const buf = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buf }).promise;
        const parts: string[] = [];
        const maxPages = Math.min(pdf.numPages, 50);
        for (let p = 1; p <= maxPages; p++) {
          const page = await pdf.getPage(p);
          const content = await page.getTextContent();
          parts.push(content.items.map((it: any) => it.str).join(" "));
        }
        extracted = parts.join("\n\n");
        if (pdf.numPages > 50) toast.info("Long PDF — first 50 pages were read.");
      } else if (lower.endsWith(".docx")) {
        const mammoth: any = await import("mammoth");
        const buf = await file.arrayBuffer();
        const res = await mammoth.extractRawText({ arrayBuffer: buf });
        extracted = res.value || "";
      } else if (file.type.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".md")) {
        extracted = await file.text();
      } else {
        toast.error("Unsupported file. Use PDF, DOCX, TXT or MD.");
        return;
      }
      const cleaned = extracted.replace(/\s+/g, " ").trim();
      if (!cleaned) { toast.error("No readable text found."); return; }
      setText(cleaned.slice(0, MAX_CHARS));
      toast.success(`Extracted ${cleaned.length.toLocaleString()} characters`);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to read file: " + (e?.message ?? "unknown"));
    } finally {
      setExtracting(false);
    }
  };

  const ensureTts = (forText: string) => {
    if (ttsRef.current) ttsRef.current.destroy();
    const inst = new BrowserTts(forText);
    inst.voiceURI = voiceURI;
    inst.rate = rate;
    inst.on(({ state, progress, chunk, total }) => {
      setState(state);
      setProgress(progress);
      setChunkInfo({ chunk, total });
    });
    ttsRef.current = inst;
    return inst;
  };

  const handlePlay = () => {
    if (!supported) { toast.error("Your browser doesn't support on-device speech."); return; }
    if (!text.trim()) { toast.error("Add text or upload a document first."); return; }
    setActiveSection(null);
    if (ttsRef.current && state === "paused") { ttsRef.current.play(); return; }
    if (ttsRef.current && state === "playing") { ttsRef.current.pause(); return; }
    const inst = ensureTts(text);
    inst.play();
  };

  const handleStop = () => ttsRef.current?.stop();

  const handleRate = (r: number) => {
    setRate(r);
    if (ttsRef.current) ttsRef.current.setRate(r);
  };

  const handleVoice = (id: string) => {
    setVoiceURI(id);
    if (ttsRef.current) ttsRef.current.setVoice(id);
  };

  // Section splitter
  const splitIntoSections = (raw: string): Section[] => {
    const clean = raw.replace(/\r\n/g, "\n").trim();
    if (!clean) return [];
    const headingRe = /\n(?=(?:Chapter\s+\d+|Section\s+\d+|\d+\.\s+[A-Z]|[A-Z][A-Z\s]{4,}\n))/g;
    let parts = clean.split(headingRe).map((p) => p.trim()).filter(Boolean);
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
    if (!text.trim()) return toast.error("Add some text first.");
    const next = splitIntoSections(text);
    if (!next.length) return toast.error("Could not split text.");
    setSections(next);
    toast.success(`Transcript generated — ${next.length} sections`);
  };

  const playSection = (idx: number) => {
    const sec = sections[idx];
    if (!sec) return;
    if (activeSection === idx && state === "playing") { ttsRef.current?.pause(); return; }
    if (activeSection === idx && state === "paused") { ttsRef.current?.play(); return; }
    setActiveSection(idx);
    const inst = ensureTts(sec.text);
    inst.play();
  };

  const saveTranscript = () => {
    if (!text.trim()) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(fileName || "narration").replace(/\.[^.]+$/, "")}-transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Transcript saved");
  };

  // Group voices: English first, then localService
  const groupedVoices = useMemo(() => {
    const en = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
    const others = voices.filter((v) => !v.lang.toLowerCase().startsWith("en"));
    return [...en, ...others].slice(0, 12);
  }, [voices]);

  const isPlaying = state === "playing";
  const isPaused = state === "paused";

  return (
    <>
      <SEO
        title="AI Narration — Listen to your notes offline"
        description="Turn notes into audio using your phone's built-in voice. No internet, no API keys."
        url="/audio-learning"
      />
      <div className="min-h-screen bg-background pb-12">
        <header className="sticky top-0 z-40 bg-card/85 backdrop-blur border-b border-border">
          <div className="container mx-auto px-4 h-14 flex items-center gap-2 max-w-3xl">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Headphones className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">AI Narration</span>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-5 max-w-3xl space-y-5">
          {/* Hero player card — matches mockup */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 p-6 text-primary-foreground shadow-xl"
          >
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -left-6 bottom-0 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-start gap-4">
              <div className="shrink-0 w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-1 ring-white/20">
                <Headphones className="w-8 h-8" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 mb-1.5">
                  <Sparkles className="w-3 h-3" />
                  <span className="text-[10px] font-bold tracking-wider uppercase">On-device</span>
                </div>
                <h1 className="font-display text-xl font-bold tracking-tight">AI Narration</h1>
                <p className="text-xs opacity-90 mt-0.5">Listen to your document — no internet needed.</p>
              </div>
            </div>

            {/* Progress + transport */}
            <div className="relative mt-5">
              <div className="h-1.5 rounded-full bg-white/25 overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  animate={{ width: `${Math.round(progress * 100)}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[11px] opacity-90 font-mono">
                <span>{chunkInfo.total ? `Chunk ${Math.min(chunkInfo.chunk + (isPlaying ? 1 : 0), chunkInfo.total)} / ${chunkInfo.total}` : "—"}</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
            </div>

            <div className="relative mt-4 flex items-center justify-center gap-4">
              <button
                onClick={handleStop}
                disabled={state === "idle"}
                className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-40 flex items-center justify-center transition-all active:scale-95"
                aria-label="Stop"
              >
                <Square className="w-4 h-4" />
              </button>
              <button
                onClick={handlePlay}
                disabled={!text.trim() || extracting}
                className="w-16 h-16 rounded-full bg-white text-primary shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 translate-x-0.5" />}
              </button>
              <button
                onClick={() => { ttsRef.current?.stop(); setTimeout(handlePlay, 50); }}
                disabled={state === "idle"}
                className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-40 flex items-center justify-center transition-all active:scale-95"
                aria-label="Restart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Speed chips */}
            <div className="relative mt-4">
              <p className="text-[11px] opacity-80 mb-1.5 font-medium">Playback Speed</p>
              <div className="flex gap-1.5 flex-wrap">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleRate(s)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                      rate === s
                        ? "bg-white text-primary shadow"
                        : "bg-white/15 hover:bg-white/25",
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Capability badges */}
          <div className="flex flex-wrap gap-2 -mt-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
              <WifiOff className="w-3 h-3" /> Works offline
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
              <Smartphone className="w-3 h-3" /> Uses your phone's voice
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold">
              No API key
            </span>
          </div>

          {!supported && (
            <Card className="p-4 border-destructive/30 bg-destructive/5 text-sm">
              Your browser doesn't expose the on-device speech engine. Try Chrome, Safari or Edge.
            </Card>
          )}

          {/* Upload + paste */}
          <Card className="p-5 space-y-4">
            <Label className="font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Add your content
            </Label>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={extracting}
              className={cn(
                "w-full flex items-center justify-center gap-3 p-5 rounded-xl border-2 border-dashed",
                "border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-colors disabled:opacity-60",
              )}
            >
              {extracting ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Upload className="w-5 h-5 text-primary" />}
              <div className="text-left min-w-0">
                <p className="font-semibold text-sm truncate">
                  {extracting ? "Reading your file…" : fileName || "Upload PDF, DOCX, TXT or MD"}
                </p>
                <p className="text-xs text-muted-foreground">Up to 50 pages • text extracted on your device</p>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Or paste / edit text</Label>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {charCount.toLocaleString()} chars
                </span>
              </div>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                rows={6}
                placeholder="Paste lecture notes, a chapter, or any study text…"
                className="resize-y font-sans text-sm leading-relaxed"
              />
            </div>
          </Card>

          {/* Voice picker */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-primary" /> Pick a voice
              </Label>
              <span className="text-[11px] text-muted-foreground">{groupedVoices.length} available</span>
            </div>
            {groupedVoices.length === 0 ? (
              <p className="text-xs text-muted-foreground">Loading your phone's voices…</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {groupedVoices.map((v) => {
                  const active = voiceURI === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => handleVoice(v.id)}
                      className={cn(
                        "text-left rounded-xl p-3 border-2 transition-all min-w-0",
                        active ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/50 hover:bg-muted/40",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-[13px] truncate">{v.name}</p>
                        {v.localService && (
                          <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                            OFFLINE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{v.lang}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Sections */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Label className="font-semibold flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-primary" /> Section transcript
              </Label>
              <Button size="sm" variant="outline" onClick={generateTranscript} disabled={!text.trim()}>
                {sections.length ? "Regenerate" : "Generate"}
              </Button>
            </div>
            {sections.length === 0 ? (
              <p className="text-xs text-muted-foreground">Split your document into sections and play each part on its own.</p>
            ) : (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {sections.map((s, i) => {
                    const isActive = activeSection === i;
                    const playing = isActive && isPlaying;
                    return (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "rounded-xl border p-3 transition-colors",
                          isActive ? "border-primary bg-primary/5" : "border-border bg-card",
                        )}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="shrink-0 mt-0.5 inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{s.title}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-2">{s.text.slice(0, 160)}…</p>
                            {isActive && (
                              <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                                <motion.div className="h-full bg-primary" animate={{ width: `${Math.round(progress * 100)}%` }} />
                              </div>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant={playing ? "default" : "outline"}
                            onClick={() => playSection(i)}
                            className="shrink-0"
                            aria-label={playing ? "Pause" : "Play"}
                          >
                            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </Card>

          {/* Action row — mirrors mockup */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={saveTranscript} disabled={!text.trim()} className="h-12">
              <FileText className="w-4 h-4 mr-2" /> Save Transcript
            </Button>
            <Button onClick={handlePlay} disabled={!text.trim() || extracting} className="h-12">
              {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isPlaying ? "Pause" : isPaused ? "Resume" : "Listen"}
            </Button>
          </div>

          <p className="text-center text-[11px] text-muted-foreground pt-2">
            Powered by your device's built-in speech engine · No data leaves your phone.
          </p>
        </main>
      </div>
    </>
  );
};

export default AudioLearning;
