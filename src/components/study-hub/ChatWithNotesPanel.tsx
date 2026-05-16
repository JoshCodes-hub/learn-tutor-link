import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Bot, User as UserIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sanitizeAIText } from "@/lib/sanitizeAI";

interface Message { role: "user" | "assistant"; content: string }

interface Props {
  materialId: string;
  materialTitle: string;
  materialText: string | undefined | null;
}

/**
 * Streaming chat grounded in a study material.
 * Calls the `chat-with-notes` edge function via SSE.
 */
export const ChatWithNotesPanel = ({ materialTitle, materialText }: Props) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! Ask me anything about this material. I'll only answer based on what's in the document — not guesses.",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    if (!materialText?.trim()) {
      toast.error("Generate the Summary first so I have context");
      return;
    }
    const next: Message[] = [...messages, { role: "user", content: input.trim() }];
    setMessages(next);
    setInput("");
    setStreaming(true);

    try {
      const URL_BASE = import.meta.env.VITE_SUPABASE_URL;
      const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${URL_BASE}/functions/v1/chat-with-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          material_text: materialText,
          material_title: materialTitle,
        }),
      });

      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistant = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload);
            const delta = j?.choices?.[0]?.delta?.content || "";
            if (delta) {
              assistant += delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: assistant };
                return copy;
              });
            }
          } catch {
            /* swallow keepalives */
          }
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Chat failed");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-[480px] rounded-xl border border-border overflow-hidden bg-card">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-primary/15 grid place-items-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                  : "bg-muted text-foreground"
              }`}
            >
              {m.role === "assistant" ? (
                m.content ? (
                  <div className="ai-prose max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{sanitizeAIText(m.content)}</ReactMarkdown>
                  </div>
                ) : (
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                )
              ) : (
                m.content
              )}
            </div>
            {m.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-muted grid place-items-center shrink-0">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-border p-2.5 flex gap-2 bg-background">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Ask anything about this material..."
          disabled={streaming}
        />
        <Button onClick={send} disabled={streaming || !input.trim()} size="icon">
          {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};
