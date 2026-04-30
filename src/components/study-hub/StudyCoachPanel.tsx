import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Loader2, Bot, User, Wand2, BookOpen, MessageSquarePlus, RefreshCcw, FileDown, Layers, FileText, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { FlashcardsDialog, Flashcard } from "./FlashcardsDialog";

interface Material { id?: string; title: string; description?: string | null; file_type?: string | null }
interface Msg { role: "user" | "assistant"; content: string; sources?: number[] }

interface Props {
  course?: { code?: string; name?: string };
  materials?: Material[];
  mode?: "study_hub" | "theory";
  className?: string;
}

const QUICK_PROMPTS: { label: string; icon: typeof Wand2; prompt: string }[] = [
  { label: "Summarize this course", icon: BookOpen, prompt: "Give me a 5-bullet summary of the key topics in this course based on the materials available." },
  { label: "Likely exam questions", icon: Sparkles, prompt: "Generate 5 likely exam questions for this course with brief model answers." },
  { label: "Quiz me", icon: MessageSquarePlus, prompt: "Quiz me with 3 short questions on this course. Hide the answers behind <details> tags." },
  { label: "Explain a hard concept", icon: Wand2, prompt: "Pick what looks like the hardest topic in this course and explain it simply with an example." },
];

const SOURCES_REGEX = /<<SOURCES>>(.*?)<<END>>/s;

function parseSourcesFromContent(raw: string): { clean: string; sources: number[] } {
  const m = raw.match(SOURCES_REGEX);
  if (!m) return { clean: raw, sources: [] };
  let used: number[] = [];
  try {
    const parsed = JSON.parse(m[1].trim());
    if (Array.isArray(parsed?.used)) used = parsed.used.filter((n: any) => typeof n === "number");
  } catch { /* ignore */ }
  return { clean: raw.replace(SOURCES_REGEX, "").trim(), sources: used };
}

export const StudyCoachPanel = ({ course, materials = [], mode = "study_hub", className }: Props) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingCards, setGeneratingCards] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [cardsOpen, setCardsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: Msg = { role: "user", content: trimmed };
    const next: Msg[] = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      const { clean, sources } = parseSourcesFromContent(assistantSoFar);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: clean, sources } : m));
        }
        return [...prev, { role: "assistant", content: clean, sources }];
      });
    };

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/study-coach`;
      const resp = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next, course, materials, mode, action: "chat" }),
      });

      if (resp.status === 429) { toast.error("Rate limit hit. Try again shortly."); throw new Error("429"); }
      if (resp.status === 402) { toast.error("AI credits exhausted."); throw new Error("402"); }
      if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const r = await reader.read();
        if (r.done) break;
        buf += decoder.decode(r.value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError" && !["429", "402"].includes(e.message)) {
        toast.error("Coach is unavailable right now.");
        setMessages(prev => prev.filter(m => m !== userMsg));
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
  };

  const exportPdf = () => {
    if (messages.length === 0) { toast.info("Have a chat first, then export."); return; }
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    let y = margin;

    // Header
    doc.setFillColor(217, 168, 50);
    doc.rect(0, 0, pageW, 54, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("OverraPrep AI · Study Session", margin, 34);
    y = 80;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(40, 40, 40);
    const courseLine = `${course?.code ?? ""}${course?.name ? " — " + course.name : ""}`.trim() || "Study Session";
    doc.text(courseLine, margin, y); y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Exported ${new Date().toLocaleString()} · ${messages.length} messages`, margin, y); y += 24;

    const writeLine = (text: string, opts: { bold?: boolean; size?: number; color?: [number, number, number]; indent?: number } = {}) => {
      const { bold, size = 10, color = [40, 40, 40], indent = 0 } = opts;
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
      const lines = doc.splitTextToSize(text, pageW - margin * 2 - indent);
      lines.forEach((ln: string) => {
        if (y > pageH - margin) { doc.addPage(); y = margin; }
        doc.text(ln, margin + indent, y);
        y += size + 3;
      });
    };

    messages.forEach((m, i) => {
      if (y > pageH - margin - 60) { doc.addPage(); y = margin; }
      writeLine(m.role === "user" ? "You" : "AI Coach", { bold: true, size: 11, color: m.role === "user" ? [40, 40, 40] : [180, 130, 40] });
      // Strip markdown lightly for PDF
      const plain = m.content
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/^#+\s/gm, "")
        .replace(/<details[^>]*>/g, "")
        .replace(/<\/details>/g, "")
        .replace(/<summary[^>]*>(.*?)<\/summary>/g, "Q: $1");
      writeLine(plain, { size: 10, indent: 8 });
      if (m.role === "assistant" && m.sources && m.sources.length > 0) {
        const cited = m.sources.map(n => materials[n - 1]?.title).filter(Boolean);
        if (cited.length) {
          writeLine(`Sources: ${cited.map((t, idx) => `[${idx + 1}] ${t}`).join("  ")}`, { size: 9, color: [120, 120, 120], indent: 8 });
        }
      }
      y += 8;
    });

    doc.save(`study-session-${(course?.code ?? "session").replace(/\s+/g, "-")}.pdf`);
    toast.success("PDF downloaded");
  };

  const generateFlashcards = async () => {
    if (messages.length === 0) { toast.info("Have a chat first."); return; }
    setGeneratingCards(true);
    try {
      const { data, error } = await supabase.functions.invoke("study-coach", {
        body: { messages, course, materials, mode, action: "flashcards" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const list = (data?.cards ?? []) as Flashcard[];
      if (!list.length) { toast.error("Couldn't generate flashcards."); return; }
      setCards(list);
      setCardsOpen(true);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate flashcards");
    } finally {
      setGeneratingCards(false);
    }
  };

  return (
    <TooltipProvider>
      <div className={cn(
        "relative overflow-hidden rounded-3xl border border-amber-100/60",
        "bg-gradient-to-br from-white via-amber-50/30 to-white",
        "shadow-[0_8px_40px_-16px_rgba(180,140,40,0.30)]",
        className
      )}>
        <div className="pointer-events-none absolute -top-24 -right-16 h-48 w-48 rounded-full bg-gradient-to-br from-amber-300/30 via-amber-400/10 to-transparent blur-3xl" />

        <div className="relative flex items-center justify-between gap-3 px-5 pt-5 pb-3 border-b border-amber-100/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shrink-0">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-semibold tracking-tight">AI Study Coach</h3>
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">BETA</Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {mode === "theory" ? "Coaching for written/theory exams" : "Ask anything about this course"}
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={reset} className="text-xs">
              <RefreshCcw className="h-3.5 w-3.5" /> New
            </Button>
          )}
        </div>

        <div ref={scrollRef} className="relative max-h-[440px] min-h-[260px] overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-4">
              <div className="text-center py-6">
                <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="font-display font-semibold">Your private exam tutor</p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  Ask me to explain a topic, generate likely questions, or quiz you on this course. I'll cite which materials I used.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => send(q.prompt)}
                    className="group text-left px-3 py-2.5 rounded-xl border border-amber-100 bg-white/70 hover:border-amber-300 hover:shadow-sm transition-all"
                  >
                    <q.icon className="h-4 w-4 text-amber-600 mb-1" />
                    <p className="text-xs font-medium leading-snug group-hover:text-amber-800">{q.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={cn("flex gap-2.5", m.role === "user" ? "flex-row-reverse" : "flex-row")}
              >
                <div className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  m.role === "user"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gradient-to-br from-amber-400 to-amber-600 text-white"
                )}>
                  {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>
                <div className={cn(
                  "rounded-2xl px-3.5 py-2.5 max-w-[85%] text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white"
                    : "bg-white border border-amber-100/80 shadow-sm"
                )}>
                  {m.role === "assistant" ? (
                    <>
                      <div className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:font-semibold prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-strong:text-amber-800">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || "…"}</ReactMarkdown>
                      </div>
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-amber-100 flex flex-wrap items-center gap-1.5">
                          <FileText className="h-3 w-3 text-amber-700" />
                          <span className="text-[10px] uppercase tracking-wider text-amber-800 font-semibold">Sources</span>
                          {m.sources.map(n => {
                            const mat = materials[n - 1];
                            if (!mat) return null;
                            return (
                              <Tooltip key={n}>
                                <TooltipTrigger asChild>
                                  <Badge className="bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 cursor-default text-[10px]">
                                    [{n}] {mat.title.length > 24 ? mat.title.slice(0, 22) + "…" : mat.title}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="font-semibold">{mat.title}</p>
                                  {mat.description && <p className="text-xs">{mat.description}</p>}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-2.5">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-2xl px-3.5 py-2.5 bg-white border border-amber-100/80">
                <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
              </div>
            </div>
          )}
        </div>

        {messages.length > 0 && (
          <div className="relative px-4 py-2 border-t border-amber-100/60 flex flex-wrap gap-2 bg-amber-50/30">
            <Button size="sm" variant="outline" onClick={generateFlashcards} disabled={generatingCards} className="border-amber-200 hover:bg-amber-50 text-xs">
              {generatingCards ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-3.5 w-3.5" />}
              Flashcards
            </Button>
            <Button size="sm" variant="outline" onClick={exportPdf} className="border-amber-200 hover:bg-amber-50 text-xs">
              <FileDown className="h-3.5 w-3.5" /> Export PDF
            </Button>
          </div>
        )}

        <div className="relative px-4 pb-4 pt-2 border-t border-amber-100/60 bg-white/40">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={`Ask about ${course?.code ?? "this course"}…`}
              rows={1}
              className="resize-none min-h-[44px] max-h-32 rounded-xl bg-white border-amber-100 focus-visible:ring-amber-300"
              disabled={loading}
            />
            <Button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="h-11 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Coach uses uploaded material titles for context. Always verify critical answers.
          </p>
        </div>
      </div>

      <FlashcardsDialog
        open={cardsOpen}
        onOpenChange={setCardsOpen}
        cards={cards}
        courseLabel={course?.code}
      />
    </TooltipProvider>
  );
};

export default StudyCoachPanel;
