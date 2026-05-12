import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Message {
  id: string;
  course_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface Profile {
  full_name: string | null;
  profile_image_url: string | null;
  avatar_url: string | null;
}

interface Props {
  courseId: string;
  courseCode?: string;
}

/**
 * Open course chat: any enrolled student or course tutor can post.
 * Backed by `public.course_chat_messages` with RLS via `is_course_participant`.
 */
export const CourseChat = ({ courseId, courseCode }: Props) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [canPost, setCanPost] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadProfiles = async (userIds: string[]) => {
    const need = userIds.filter((id) => !profiles[id]);
    if (need.length === 0) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, profile_image_url, avatar_url")
      .in("id", need);
    if (data) {
      const map: Record<string, Profile> = {};
      data.forEach((p: any) => (map[p.id] = p));
      setProfiles((prev) => ({ ...prev, ...map }));
    }
  };

  useEffect(() => {
    if (!courseId) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("course_chat_messages")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!active) return;
      if (error) {
        // RLS will block non-participants — show friendly message.
        setCanPost(false);
        setLoading(false);
        return;
      }
      const msgs = (data as Message[]) || [];
      setMessages(msgs);
      const ids = [...new Set(msgs.map((m) => m.user_id))];
      if (ids.length > 0) loadProfiles(ids);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`course-chat-${courseId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "course_chat_messages", filter: `course_id=eq.${courseId}` },
        async (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (!profiles[m.user_id]) loadProfiles([m.user_id]);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !text.trim()) return;
    setSending(true);
    const body = text.trim().slice(0, 2000);
    setText("");
    const { error } = await supabase
      .from("course_chat_messages")
      .insert({ course_id: courseId, user_id: user.id, content: body });
    setSending(false);
    if (error) {
      toast.error("You need to enroll in this course (or be its tutor) to chat here.");
      setText(body);
    }
  };

  return (
    <Card className="border-amber-100/60 bg-gradient-to-br from-white to-amber-50/20">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-base flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-600" />
          Course Chat {courseCode && <span className="text-xs font-normal text-muted-foreground">· {courseCode}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="h-72 pr-3" ref={scrollRef as any}>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-amber-600" /></div>
          ) : messages.length === 0 ? (
            <div className="py-10 text-center">
              <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-semibold">Start the conversation</p>
              <p className="text-xs text-muted-foreground mt-1">
                Brainstorm with classmates and the tutor — no one's posted yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => {
                const mine = m.user_id === user?.id;
                const p = profiles[m.user_id];
                return (
                  <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                    <Avatar className="w-7 h-7 shrink-0">
                      <AvatarImage src={p?.profile_image_url || p?.avatar_url || undefined} />
                      <AvatarFallback className="bg-amber-100 text-amber-800 text-[10px] font-bold">
                        {p?.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[78%] ${mine ? "text-right" : ""}`}>
                      <div className={`flex items-center gap-2 mb-0.5 ${mine ? "justify-end" : ""}`}>
                        <span className="text-[11px] font-semibold">{p?.full_name || "Member"}</span>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(m.created_at), "HH:mm")}</span>
                      </div>
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words shadow-sm ${
                          mine
                            ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-br-sm"
                            : "bg-white border border-amber-100 text-foreground rounded-bl-sm"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {canPost ? (
          <form onSubmit={send} className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Brainstorm with classmates & the tutor…"
              maxLength={2000}
              disabled={sending}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!text.trim() || sending} className="bg-amber-500 hover:bg-amber-600 text-white">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        ) : (
          <p className="text-xs text-center text-muted-foreground py-2">
            Enroll in this course (or be its tutor) to join the chat.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CourseChat;