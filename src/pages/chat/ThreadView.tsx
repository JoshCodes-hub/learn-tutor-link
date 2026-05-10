import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Send, Sparkles, Share2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useChatMessages } from "@/hooks/useChatMessages";
import { markThreadRead } from "@/hooks/useChatThreads";
import MessageBubble from "@/components/chat/MessageBubble";
import AiTypingDots from "@/components/chat/AiTypingDots";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/seo/SEO";

export default function ThreadView() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messages, profiles, loading, send, aiTyping } = useChatMessages(threadId);
  const [text, setText] = useState("");
  const [thread, setThread] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!threadId) return;
    supabase.from("chat_threads").select("*").eq("id", threadId).maybeSingle()
      .then(({ data }) => setThread(data));
  }, [threadId]);

  useEffect(() => {
    if (threadId && user?.id) markThreadRead(threadId, user.id);
  }, [threadId, user?.id, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, aiTyping]);

  useEffect(() => { inputRef.current?.focus(); }, [threadId]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await send(text);
      setText("");
      inputRef.current?.focus();
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertAi = () => {
    setText(t => (t.trim() ? `${t} @AI ` : "@AI "));
    inputRef.current?.focus();
  };

  const copyInvite = async () => {
    if (!thread?.invite_code) return;
    const url = `${window.location.origin}/chat/join/${thread.invite_code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Invite link copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background pb-16 md:pb-0">
      <SEO title={thread?.title ?? "Chat"} description="OverraPrep chat" />

      {/* Header */}
      <header className="flex items-center gap-3 px-3 py-3 border-b border-border/60 bg-background/95 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate("/chat")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold truncate">{thread?.title ?? "Chat"}</h1>
          <p className="text-xs text-muted-foreground capitalize">
            {thread?.kind === "brainstorm" ? "Brainstorm room" : thread?.kind ?? "Loading..."}
            {thread?.invite_code && ` · ${thread.invite_code}`}
          </p>
        </div>
        {thread?.kind === "brainstorm" && (
          <Button variant="ghost" size="icon" onClick={copyInvite} title="Copy invite link">
            {copied ? <Check className="w-5 h-5 text-primary" /> : <Share2 className="w-5 h-5" />}
          </Button>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-3">
            <Sparkles className="w-10 h-10 text-primary" />
            <h2 className="font-semibold">No messages yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Type <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">@AI</code> to bring in OverraPrep AI as a tutor in this chat.
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const showAuthor = !prev || prev.author_id !== m.author_id || prev.is_ai !== m.is_ai;
            return (
              <MessageBubble
                key={m.id}
                message={m}
                isOwn={m.author_id === user?.id}
                author={m.author_id ? profiles[m.author_id] : undefined}
                showAuthor={showAuthor}
              />
            );
          })
        )}
        {aiTyping && <AiTypingDots />}
      </div>

      {/* Composer */}
      <div className="border-t border-border/60 bg-background p-2" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" onClick={insertAi} title="Mention @AI" className="shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </Button>
          <Textarea
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message... use @AI for help"
            rows={1}
            className="flex-1 min-h-[40px] max-h-32 resize-none"
          />
          <Button onClick={handleSend} disabled={!text.trim() || sending} size="icon" className="shrink-0">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
