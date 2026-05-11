import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Upload, Loader2, Play, Pause, Square, Sparkles, Headphones,
  ListMusic, FileText, Volume2, WifiOff, Smartphone, RotateCcw, Star, Pencil,
  Check, X, Pin, Download as DownloadIcon, Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { SEO } from "@/components/seo/SEO";
import { cn } from "@/lib/utils";
import { BrowserTts, isTtsSupported, listVoices, type TtsState, type TtsVoice } from "@/lib/browserTts";

const MAX_CHARS = 50000;
const SPEEDS = [0.85, 1, 1.25, 1.5, 2];
const SECTION_SPEEDS = [1, 1.25, 1.5, 2];

interface Section { title: string; text: string }
interface PinnedVoice { uri: string; name: string; lang: string }

// localStorage keys
const LS_PINNED = "audio.pinnedVoices.v1";
const LS_LAST_VOICE = "audio.lastVoice.v1";
const LS_GLOBAL_RATE = "audio.globalRate.v1";
const sectionSpeedKey = (doc: string) => `audio.sectionSpeed.${doc}`;
const transcriptKey = (doc: string) => `audio.transcript.${doc}`;

const safe = <T,>(fn: () => T, fallback: T): T => { try { return fn(); } catch { return fallback; } };
const docKey = (name: string, len: number) =>
  (name || "untitled").replace(/[^a-z0-9]/gi, "_").slice(0, 40) + "_" + len;

const AudioLearning = () => {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState<{ done: number; total: number; label: string } | null>(null);

  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const [pinned, setPinned] = useState<PinnedVoice[]>(() => safe(() => JSON.parse(localStorage.getItem(LS_PINNED) || "[]"), []));
  const [rate, setRate] = useState<number>(() => safe(() => Number(localStorage.getItem(LS_GLOBAL_RATE)) || 1, 1));

  const [state, setState] = useState<TtsState>("idle");
  const [progress, setProgress] = useState(0);
  const [chunkInfo, setChunkInfo] = useState({ chunk: 0, total: 0 });
  const ttsRef = useRef<BrowserTts | null>(null);

  const [sections, setSections] = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [sectionSpeeds, setSectionSpeeds] = useState<Record<number, number>>({});
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supported = isTtsSupported();
  const docId = useMemo(() => docKey(fileName, text.length), [fileName, text.length]);

  /* ---------- Voices ---------- */
  useEffect(() => {
    if (!supported) return;
    listVoices().then((vs) => {
      setVoices(vs);
      const lastUri = localStorage.getItem(LS_LAST_VOICE);
      const stored = vs.find((v) => v.id === lastUri);
      if (stored) { setVoiceURI(stored.id); return; }
      // Resolve a pinned voice by uri OR by name+lang fallback
      const pins: PinnedVoice[] = safe(() => JSON.parse(localStorage.getItem(LS_PINNED) || "[]"), []);
      for (const p of pins) {
        const match = vs.find((v) => v.id === p.uri) ||
                      vs.find((v) => v.name === p.name && v.lang === p.lang) ||
                      vs.find((v) => v.name === p.name);
        if (match) { setVoiceURI(match.id); return; }
      }
      const preferred =
        vs.find((v) => v.default && v.lang.startsWith("en")) ||
        vs.find((v) => v.localService && v.lang.startsWith("en")) ||
        vs.find((v) => v.lang.startsWith("en")) || vs[0];
      if (preferred) setVoiceURI(preferred.id);
    });
  }, [supported]);

  useEffect(() => () => ttsRef.current?.destroy(), []);

  /* ---------- Persisted per-doc settings ---------- */
  useEffect(() => {
    if (!docId) return;
    const speeds = safe(() => JSON.parse(localStorage.getItem(sectionSpeedKey(docId)) || "{}"), {});
    setSectionSpeeds(speeds);
    // Hydrate edited transcript if user previously corrected it
    const saved = safe(() => JSON.parse(localStorage.getItem(transcriptKey(docId)) || "null"), null);
    if (saved && Array.isArray(saved.sections)) setSections(saved.sections);
  }, [docId]);

  const persistSectionSpeeds = (next: Record<number, number>) => {
    setSectionSpeeds(next);
    localStorage.setItem(sectionSpeedKey(docId), JSON.stringify(next));
  };
  const persistTranscript = (next: Section[]) => {
    setSections(next);
    localStorage.setItem(transcriptKey(docId), JSON.stringify({ sections: next, savedAt: Date.now() }));
  };

  /* ---------- File extraction with live progress ---------- */
  const onFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setExtracting(true);
    setExtractProgress({ done: 0, total: 1, label: "Opening file…" });
    ttsRef.current?.stop();
    try {
      let extracted = "";
      const lower = file.name.toLowerCase();
      if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
        const pdfjs: any = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        setExtractProgress({ done: 0, total: 1, label: "Loading PDF…" });
        const buf = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buf }).promise;
        const maxPages = Math.min(pdf.numPages, 50);
        const parts: string[] = [];
        for (let p = 1; p <= maxPages; p++) {
          setExtractProgress({ done: p - 1, total: maxPages, label: `Reading page ${p} of ${maxPages}…` });
          const page = await pdf.getPage(p);
          const content = await page.getTextContent();
          // Preserve line breaks using y-coordinates → rebuilds paragraphs cleanly
          let lastY: number | null = null;
          let line = "";
          const lines: string[] = [];
          for (const it of content.items as any[]) {
            const y = it.transform?.[5];
            if (lastY !== null && Math.abs(y - lastY) > 4) { lines.push(line.trim()); line = ""; }
            line += (line && !line.endsWith(" ") ? " " : "") + (it.str || "");
            lastY = y;
          }
          if (line.trim()) lines.push(line.trim());
          parts.push(lines.join("\n"));
          await new Promise((r) => setTimeout(r, 0)); // yield to UI
        }
        extracted = parts.join("\n\n");
        setExtractProgress({ done: maxPages, total: maxPages, label: "Cleaning text…" });
        if (pdf.numPages > 50) toast.info("Long PDF — first 50 pages were read.");
      } else if (lower.endsWith(".docx")) {
        setExtractProgress({ done: 0, total: 1, label: "Reading Word document…" });
        const mammoth: any = await import("mammoth");
        const buf = await file.arrayBuffer();
        const res = await mammoth.extractRawText({ arrayBuffer: buf });
        extracted = res.value || "";
        setExtractProgress({ done: 1, total: 1, label: "Cleaning text…" });
      } else if (file.type.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".md")) {
        setExtractProgress({ done: 0, total: 1, label: "Reading text…" });
        extracted = await file.text();
        setExtractProgress({ done: 1, total: 1, label: "Cleaning text…" });
      } else {
        toast.error("Unsupported file. Use PDF, DOCX, TXT or MD.");
        return;
      }
      // Smarter cleaning: collapse runs of spaces but preserve paragraph breaks
      const cleaned = extracted
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
      if (!cleaned) { toast.error("No readable text found."); return; }
      setText(cleaned.slice(0, MAX_CHARS));
      // Reset prior saved transcript for this new file
      localStorage.removeItem(transcriptKey(docKey(file.name, cleaned.slice(0, MAX_CHARS).length)));
      setSections([]);
      toast.success(`Extracted ${cleaned.length.toLocaleString()} characters`);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to read file: " + (e?.message ?? "unknown"));
    } finally {
      setExtracting(false);
      setExtractProgress(null);
    }
  };

  /* ---------- TTS controller helpers ---------- */
  const ensureTts = (forText: string, useRate?: number) => {
    if (ttsRef.current) ttsRef.current.destroy();
    const inst = new BrowserTts(forText);
    inst.voiceURI = voiceURI;
    inst.rate = useRate ?? rate;
    inst.on(({ state, progress, chunk, total }) => {
      setState(state); setProgress(progress); setChunkInfo({ chunk, total });
    });
    ttsRef.current = inst;
    return inst;
  };

  const handlePlay = () => {
    if (!supported) return toast.error("Your browser doesn't support on-device speech.");
    if (!text.trim()) return toast.error("Add text or upload a document first.");
    setActiveSection(null);
    if (ttsRef.current && state === "paused") return ttsRef.current.play();
    if (ttsRef.current && state === "playing") return ttsRef.current.pause();
    ensureTts(text).play();
  };

  const handleStop = () => ttsRef.current?.stop();

  const handleRate = (r: number) => {
    setRate(r);
    localStorage.setItem(LS_GLOBAL_RATE, String(r));
    if (ttsRef.current && activeSection === null) ttsRef.current.setRate(r);
  };

  const handleVoice = (id: string) => {
    setVoiceURI(id);
    localStorage.setItem(LS_LAST_VOICE, id);
    if (ttsRef.current) ttsRef.current.setVoice(id);
  };

  const togglePin = (v: TtsVoice) => {
    const exists = pinned.some((p) => p.uri === v.id);
    const next = exists
      ? pinned.filter((p) => p.uri !== v.id)
      : [...pinned, { uri: v.id, name: v.name, lang: v.lang }];
    setPinned(next);
    localStorage.setItem(LS_PINNED, JSON.stringify(next));
    toast.success(exists ? `Unpinned ${v.name}` : `Pinned ${v.name} for next time`);
  };

  /* ---------- Sections ---------- */
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
    persistTranscript(next);
    persistSectionSpeeds({});
    toast.success(`Transcript generated — ${next.length} sections`);
  };

  const playSection = (idx: number) => {
    const sec = sections[idx];
    if (!sec) return;
    if (activeSection === idx && state === "playing") return ttsRef.current?.pause();
    if (activeSection === idx && state === "paused") return ttsRef.current?.play();
    setActiveSection(idx);
    const r = sectionSpeeds[idx] ?? rate;
    ensureTts(sec.text, r).play();
  };

  const setSectionSpeed = (idx: number, r: number) => {
    const next = { ...sectionSpeeds, [idx]: r };
    persistSectionSpeeds(next);
    if (activeSection === idx && ttsRef.current) ttsRef.current.setRate(r);
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditDraft(sections[idx].text);
  };
  const saveEdit = () => {
    if (editingIdx === null) return;
    const next = sections.map((s, i) => (i === editingIdx ? { ...s, text: editDraft.trim() } : s));
    persistTranscript(next);
    setEditingIdx(null);
    toast.success("Section updated and saved");
  };
  const cancelEdit = () => { setEditingIdx(null); setEditDraft(""); };

  const exportPinnedVoices = () => {
    const blob = new Blob([JSON.stringify({ pinned, exportedAt: new Date().toISOString() }, null, 2)],
      { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "overraprep-pinned-voices.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const saveTranscript = () => {
    if (!text.trim()) return;
    const body = sections.length
      ? sections.map((s, i) => `## ${i + 1}. ${s.title}\n\n${s.text}`).join("\n\n")
      : text;
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(fileName || "narration").replace(/\.[^.]+$/, "")}-transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Transcript saved");
  };

  /* ---------- Voice grouping (pinned first) ---------- */
  const orderedVoices = useMemo(() => {
    const pinSet = new Set(pinned.map((p) => p.uri));
    const pinnedFirst = voices.filter((v) => pinSet.has(v.id));
    const en = voices.filter((v) => !pinSet.has(v.id) && v.lang.toLowerCase().startsWith("en"));
    const others = voices.filter((v) => !pinSet.has(v.id) && !v.lang.toLowerCase().startsWith("en"));
    return [...pinnedFirst, ...en, ...others].slice(0, 16);
  }, [voices, pinned]);

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
          {/* Hero player card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
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

            <div className="relative mt-5">
              <div className="h-1.5 rounded-full bg-white/25 overflow-hidden">
                <motion.div className="h-full bg-white rounded-full"
                  animate={{ width: `${Math.round(progress * 100)}%` }} transition={{ duration: 0.3 }} />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[11px] opacity-90 font-mono">
                <span>{chunkInfo.total ? `Chunk ${Math.min(chunkInfo.chunk + (isPlaying ? 1 : 0), chunkInfo.total)} / ${chunkInfo.total}` : "—"}</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
            </div>

            <div className="relative mt-4 flex items-center justify-center gap-4">
              <button onClick={handleStop} disabled={state === "idle"}
                className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-40 flex items-center justify-center transition-all active:scale-95"
                aria-label="Stop"><Square className="w-4 h-4" /></button>
              <button onClick={handlePlay} disabled={!text.trim() || extracting}
                className="w-16 h-16 rounded-full bg-white text-primary shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 translate-x-0.5" />}
              </button>
              <button onClick={() => { ttsRef.current?.stop(); setTimeout(handlePlay, 50); }}
                disabled={state === "idle"}
                className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-40 flex items-center justify-center transition-all active:scale-95"
                aria-label="Restart"><RotateCcw className="w-4 h-4" /></button>
            </div>

            <div className="relative mt-4">
              <p className="text-[11px] opacity-80 mb-1.5 font-medium flex items-center gap-1">
                <Gauge className="w-3 h-3" /> Default playback speed
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {SPEEDS.map((s) => (
                  <button key={s} onClick={() => handleRate(s)}
                    className={cn("px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                      rate === s ? "bg-white text-primary shadow" : "bg-white/15 hover:bg-white/25")}>
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
              <Smartphone className="w-3 h-3" /> Phone voice
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
                  {extracting ? (extractProgress?.label ?? "Reading…") : fileName || "Upload PDF, DOCX, TXT or MD"}
                </p>
                <p className="text-xs text-muted-foreground">Up to 50 pages • text extracted on your device</p>
              </div>
            </button>

            {/* Per-page extraction progress */}
            <AnimatePresence>
              {extracting && extractProgress && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="rounded-xl bg-primary/5 border border-primary/20 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-primary">{extractProgress.label}</span>
                    <span className="text-muted-foreground font-mono">
                      {extractProgress.done}/{extractProgress.total}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-primary/15 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full relative"
                      animate={{ width: `${Math.round((extractProgress.done / Math.max(1, extractProgress.total)) * 100)}%` }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="absolute inset-0 bg-white/30 animate-pulse" />
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                  {text.length.toLocaleString()} chars
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

          {/* Voice picker with pinning */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="font-semibold flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-primary" /> Voices
                {pinned.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    {pinned.length} pinned
                  </span>
                )}
              </Label>
              <Button size="sm" variant="ghost" onClick={exportPinnedVoices} disabled={!pinned.length}
                className="h-7 px-2 text-[11px]">
                <DownloadIcon className="w-3 h-3 mr-1" /> Backup
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Pin your favourites — we'll fall back to a matching voice automatically if your device updates.
            </p>
            {orderedVoices.length === 0 ? (
              <p className="text-xs text-muted-foreground">Loading your phone's voices…</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {orderedVoices.map((v) => {
                  const active = voiceURI === v.id;
                  const isPinned = pinned.some((p) => p.uri === v.id);
                  return (
                    <div key={v.id}
                      className={cn(
                        "relative rounded-xl p-3 border-2 transition-all min-w-0",
                        active ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/50 hover:bg-muted/40",
                      )}
                    >
                      <button onClick={() => handleVoice(v.id)} className="text-left w-full pr-7">
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
                      <button onClick={() => togglePin(v)}
                        aria-label={isPinned ? "Unpin voice" : "Pin voice"}
                        className={cn(
                          "absolute top-2 right-2 p-1 rounded-md transition-colors",
                          isPinned ? "text-primary" : "text-muted-foreground/40 hover:text-primary",
                        )}>
                        {isPinned ? <Star className="w-3.5 h-3.5 fill-current" /> : <Pin className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Sections with edit + per-section speed */}
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
              <p className="text-xs text-muted-foreground">Split your document into sections, edit any mistakes, and play each part on its own.</p>
            ) : (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {sections.map((s, i) => {
                    const isActive = activeSection === i;
                    const playing = isActive && isPlaying;
                    const speed = sectionSpeeds[i] ?? rate;
                    const isEditing = editingIdx === i;
                    return (
                      <motion.li
                        key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        className={cn("rounded-xl border p-3 transition-colors",
                          isActive ? "border-primary bg-primary/5" : "border-border bg-card")}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="shrink-0 mt-0.5 inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{s.title}</p>
                            {!isEditing && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2">{s.text.slice(0, 160)}…</p>
                            )}
                            {isActive && !isEditing && (
                              <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                                <motion.div className="h-full bg-primary" animate={{ width: `${Math.round(progress * 100)}%` }} />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {!isEditing && (
                              <Button size="icon" variant="ghost" onClick={() => startEdit(i)} aria-label="Edit section" className="h-8 w-8">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant={playing ? "default" : "outline"}
                              onClick={() => playSection(i)}
                              aria-label={playing ? "Pause" : "Play"}
                              disabled={isEditing}
                            >
                              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* Edit mode */}
                        {isEditing && (
                          <div className="mt-3 space-y-2">
                            <Textarea
                              value={editDraft} onChange={(e) => setEditDraft(e.target.value)}
                              rows={6} className="text-sm leading-relaxed"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                <X className="w-3.5 h-3.5 mr-1" /> Cancel
                              </Button>
                              <Button size="sm" onClick={saveEdit}>
                                <Check className="w-3.5 h-3.5 mr-1" /> Save
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Per-section speed */}
                        {!isEditing && (
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mr-1">
                              Speed
                            </span>
                            {SECTION_SPEEDS.map((r) => (
                              <button key={r} onClick={() => setSectionSpeed(i, r)}
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold transition-all",
                                  speed === r
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary",
                                )}>
                                {r}x
                              </button>
                            ))}
                            {sectionSpeeds[i] !== undefined && (
                              <span className="text-[9px] text-primary font-semibold ml-1">saved</span>
                            )}
                          </div>
                        )}
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </Card>

          {/* Action row */}
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
