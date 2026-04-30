import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface Props {
  peerId: string;
  peerName?: string;
}

export default function DirectMessageThread({ peerId, peerName }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !peerId) return;
    let active = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true })
        .limit(200);
      if (!active) return;
      if (error) toast.error("Could not load messages");
      else setMessages(data as Message[]);
      setLoading(false);

      // Mark received as read
      await supabase
        .from("direct_messages")
        .update({ is_read: true })
        .eq("recipient_id", user.id)
        .eq("sender_id", peerId)
        .eq("is_read", false);
    };

    load();

    const channel = supabase
      .channel(`dm-${user.id}-${peerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const m = payload.new as Message;
          const isPair =
            (m.sender_id === user.id && m.recipient_id === peerId) ||
            (m.sender_id === peerId && m.recipient_id === user.id);
          if (isPair) setMessages((prev) => [...prev, m]);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user, peerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    if (!user || !text.trim()) return;
    setSending(true);
    const body = text.trim().slice(0, 2000);
    setText("");
    const { error } = await supabase.from("direct_messages").insert({
      sender_id: user.id,
      recipient_id: peerId,
      content: body,
    });
    setSending(false);
    if (error) {
      toast.error("Couldn't send message");
      setText(body);
    }
  };

  return (
    <div className="flex flex-col h-[60vh] md:h-[70vh] border rounded-2xl bg-white overflow-hidden">
      <div className="px-4 py-3 border-b bg-amber-50/40">
        <p className="font-semibold text-foreground">{peerName ?? "Conversation"}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex justify-center pt-10">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground pt-10">
            Say hello — start the conversation.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    mine
                      ? "bg-amber-500 text-white rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p className={`text-[10px] mt-1 ${mine ? "text-amber-50/80" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="p-3 border-t bg-white flex gap-2"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
          disabled={sending}
        />
        <Button type="submit" disabled={!text.trim() || sending} className="bg-amber-500 hover:bg-amber-600 text-white">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}
