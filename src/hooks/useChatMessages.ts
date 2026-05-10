import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ChatMessage {
  id: string;
  thread_id: string;
  author_id: string | null;
  is_ai: boolean;
  content: string;
  created_at: string;
}

export interface ChatProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export function useChatMessages(threadId: string | undefined) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ChatProfile>>({});
  const [loading, setLoading] = useState(true);
  const [aiTyping, setAiTyping] = useState(false);

  // Initial load
  useEffect(() => {
    if (!threadId) return;
    let cancel = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancel) return;
      const msgs = (data ?? []) as ChatMessage[];
      setMessages(msgs);
      await loadProfiles(msgs.map(m => m.author_id).filter(Boolean) as string[]);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [threadId]);

  const loadProfiles = useCallback(async (ids: string[]) => {
    const unique = Array.from(new Set(ids));
    if (unique.length === 0) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", unique);
    setProfiles(p => {
      const next = { ...p };
      for (const r of data ?? []) next[r.id] = r as ChatProfile;
      return next;
    });
  }, []);

  // Realtime
  useEffect(() => {
    if (!threadId) return;
    const ch = supabase
      .channel(`chat-${threadId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${threadId}` },
        async (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          if (msg.is_ai) setAiTyping(false);
          if (msg.author_id) loadProfiles([msg.author_id]);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId, loadProfiles]);

  const send = useCallback(async (content: string) => {
    if (!threadId || !user?.id || !content.trim()) return;
    const text = content.trim();
    const { error } = await supabase.from("chat_messages").insert({
      thread_id: threadId, author_id: user.id, is_ai: false, content: text,
    });
    if (error) throw error;

    // Detect @AI
    if (/@AI\b/i.test(text)) {
      setAiTyping(true);
      try {
        await supabase.functions.invoke("chat-ai-reply", {
          body: { thread_id: threadId, prompt: text },
        });
      } catch (e) {
        setAiTyping(false);
        console.error("AI reply failed", e);
      }
    }
  }, [threadId, user?.id]);

  return { messages, profiles, loading, send, aiTyping };
}
