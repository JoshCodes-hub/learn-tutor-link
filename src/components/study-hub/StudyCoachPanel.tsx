import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Loader2, Bot, User, Wand2, BookOpen, MessageSquarePlus, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Material {
  id?: string;
  title: string;
  description?: string | null;
  file_type?: string | null;
}

interface Msg { role: "user" | "assistant"; content: string }

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

export const StudyCoachPanel = ({ course, materials = [], mode = "study_hub", className }: Props) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: Msg = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
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
        body: JSON.stringify({ messages: next, course, materials, mode }),
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

  return (
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
            <RefreshCcw className="h-3.5 w-3.5" /> New chat
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
                Ask me to explain a topic, generate likely questions, or quiz you on this course.
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
                  <div className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:font-semibold prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-strong:text-amber-800">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || "…"}</ReactMarkdown>
                  </div>
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
  );
};

export default StudyCoachPanel;
