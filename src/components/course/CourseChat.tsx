import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Loader2, Sparkles, Pin, Plus, X, SmilePlus } from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  course_id: string;
  user_id: string;
  content: string;
  created_at: string;
}
interface Reaction { id: string; message_id: string; user_id: string; emoji: string }
interface PinnedPrompt { id: string; course_id: string; content: string; created_by: string; created_at: string }
interface Profile { full_name: string | null; profile_image_url: string | null; avatar_url: string | null }

interface Props { courseId: string; courseCode?: string }

const QUICK_EMOJIS = ["👍", "❤️", "🔥", "💡", "🎯", "🤔"];

const formatStamp = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return `Yesterday · ${format(d, "HH:mm")}`;
  return format(d, "MMM d · HH:mm");
};

export const CourseChat = ({ courseId, courseCode }: Props) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [pins, setPins] = useState<PinnedPrompt[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [canPost, setCanPost] = useState(true);
  const [isTutorOrAdmin, setIsTutorOrAdmin] = useState(false);
  const [reactingFor, setReactingFor] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");
  const [showPinForm, setShowPinForm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadProfiles = async (userIds: string[]) => {
    const need = userIds.filter((id) => !profiles[id]);
    if (need.length === 0) return;
    const { data } = await supabase
      .from("profiles").select("id, full_name, profile_image_url, avatar_url").in("id", need);
    if (data) {
      const map: Record<string, Profile> = {};
      data.forEach((p: any) => (map[p.id] = p));
      setProfiles((prev) => ({ ...prev, ...map }));
    }
  };

  // Detect if current user is the course tutor or an admin (for pin permissions)
  useEffect(() => {
    if (!user || !courseId) return;
    (async () => {
      const [{ data: q }, { data: roles }] = await Promise.all([
        supabase.from("quizzes").select("id").eq("course_id", courseId).eq("tutor_id", user.id).limit(1),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      const admin = (roles ?? []).some((r: any) => r.role === "admin");
      setIsTutorOrAdmin((q?.length ?? 0) > 0 || admin);
    })();
  }, [user, courseId]);

  useEffect(() => {
    if (!courseId) return;
    let active = true;
    (async () => {
      const [msgRes, pinRes] = await Promise.all([
        supabase.from("course_chat_messages").select("*").eq("course_id", courseId).order("created_at", { ascending: true }).limit(200),
        supabase.from("course_pinned_prompts").select("*").eq("course_id", courseId).order("created_at", { ascending: false }).limit(20),
      ]);
      if (!active) return;
      if (msgRes.error) { setCanPost(false); setLoading(false); return; }
      const msgs = (msgRes.data as Message[]) || [];
      setMessages(msgs);
      setPins((pinRes.data as PinnedPrompt[]) || []);

      // Reactions
      if (msgs.length > 0) {
        const { data: reactsData } = await supabase
          .from("course_chat_reactions").select("*").in("message_id", msgs.map((m) => m.id));
        if (reactsData) setReactions(reactsData as Reaction[]);
      }

      const ids = [...new Set([...msgs.map((m) => m.user_id), ...((pinRes.data as PinnedPrompt[]) ?? []).map((p) => p.created_by)])];
      if (ids.length > 0) loadProfiles(ids);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`course-chat-${courseId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "course_chat_messages", filter: `course_id=eq.${courseId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (!profiles[m.user_id]) loadProfiles([m.user_id]);
        },
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "course_chat_reactions" },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const r = payload.new as Reaction;
            setReactions((prev) => (prev.some((x) => x.id === r.id) ? prev : [...prev, r]));
          } else if (payload.eventType === "DELETE") {
            const r = payload.old as Reaction;
            setReactions((prev) => prev.filter((x) => x.id !== r.id));
          }
        },
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "course_pinned_prompts", filter: `course_id=eq.${courseId}` },
        (payload: any) => {
          if (payload.eventType === "INSERT") setPins((prev) => [payload.new as PinnedPrompt, ...prev]);
          else if (payload.eventType === "DELETE") setPins((prev) => prev.filter((p) => p.id !== payload.old.id));
        },
      )
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
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
      .from("course_chat_messages").insert({ course_id: courseId, user_id: user.id, content: body });
    setSending(false);
    if (error) {
      toast.error("You need to enroll in this course (or be its tutor) to chat here.");
      setText(body);
    }
  };

  const useAsPrompt = (content: string) => {
    setText((t) => (t ? `${t} ${content}` : content));
  };

  const addPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPin.trim()) return;
    const body = newPin.trim().slice(0, 500);
    const { error } = await supabase
      .from("course_pinned_prompts").insert({ course_id: courseId, content: body, created_by: user.id });
    if (error) {
      toast.error("Only the course tutor or an admin can pin prompts.");
      return;
    }
    setNewPin(""); setShowPinForm(false);
  };

  const removePin = async (id: string) => {
    const { error } = await supabase.from("course_pinned_prompts").delete().eq("id", id);
    if (error) toast.error("Couldn't remove pin.");
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const existing = reactions.find((r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji);
    if (existing) {
      await supabase.from("course_chat_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("course_chat_reactions").insert({ message_id: messageId, user_id: user.id, emoji });
    }
    setReactingFor(null);
  };

  // Group reactions by message+emoji
  const reactionMap = useMemo(() => {
    const map: Record<string, Record<string, { count: number; mine: boolean }>> = {};
    for (const r of reactions) {
      map[r.message_id] = map[r.message_id] || {};
      const slot = map[r.message_id][r.emoji] || { count: 0, mine: false };
      slot.count += 1;
      if (r.user_id === user?.id) slot.mine = true;
      map[r.message_id][r.emoji] = slot;
    }
    return map;
  }, [reactions, user?.id]);

  return (
    <Card className="border-amber-100/60 bg-gradient-to-br from-white to-amber-50/20">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-base flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-600" />
          Course Chat {courseCode && <span className="text-xs font-normal text-muted-foreground">· {courseCode}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Pinned brainstorming prompts */}
        <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-2.5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1">
              <Pin className="w-3 h-3" /> Brainstorm prompts
            </p>
            {isTutorOrAdmin && (
              <button
                type="button"
                onClick={() => setShowPinForm((v) => !v)}
                className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> {showPinForm ? "Cancel" : "Add"}
              </button>
            )}
          </div>
          {showPinForm && isTutorOrAdmin && (
            <form onSubmit={addPin} className="flex gap-1.5 mb-2">
              <Input
                value={newPin} onChange={(e) => setNewPin(e.target.value)}
                placeholder="e.g. What surprised you about today's topic?"
                maxLength={500}
                className="flex-1 h-8 text-xs"
              />
              <Button type="submit" size="sm" className="h-8 bg-amber-500 hover:bg-amber-600 text-white">Pin</Button>
            </form>
          )}
          {pins.length === 0 ? (
            <p className="text-[11px] text-amber-700/70 italic">
              {isTutorOrAdmin ? "Pin a question to spark discussion." : "No pinned prompts yet — start brainstorming below."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {pins.map((p) => (
                <div key={p.id} className="group inline-flex items-center gap-1 bg-white border border-amber-200 rounded-full pl-2.5 pr-1 py-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => useAsPrompt(p.content)}
                    className="text-[11px] font-medium text-amber-900 hover:text-amber-700 max-w-[260px] truncate"
                    title={p.content}
                  >
                    {p.content}
                  </button>
                  {(isTutorOrAdmin || p.created_by === user?.id) && (
                    <button
                      type="button"
                      onClick={() => removePin(p.id)}
                      aria-label="Remove pinned prompt"
                      className="text-amber-700/60 hover:text-rose-600 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

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
                const rx = reactionMap[m.id] || {};
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
                        <span
                          className="text-[10px] text-muted-foreground"
                          title={`${format(new Date(m.created_at), "PPpp")} · ${formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}`}
                        >
                          {formatStamp(m.created_at)}
                        </span>
                      </div>
                      <div className="relative group">
                        <div
                          className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words shadow-sm ${
                            mine
                              ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-br-sm"
                              : "bg-white border border-amber-100 text-foreground rounded-bl-sm"
                          }`}
                        >
                          {m.content}
                        </div>
                        <button
                          type="button"
                          onClick={() => setReactingFor(reactingFor === m.id ? null : m.id)}
                          aria-label="Add reaction"
                          className={cn(
                            "absolute -bottom-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition",
                            "h-6 w-6 rounded-full bg-white border border-amber-200 shadow flex items-center justify-center text-amber-700",
                            mine ? "-left-2" : "-right-2",
                          )}
                        >
                          <SmilePlus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {reactingFor === m.id && (
                        <div className={`mt-1 inline-flex gap-1 bg-white border border-amber-200 rounded-full px-1.5 py-1 shadow ${mine ? "" : ""}`}>
                          {QUICK_EMOJIS.map((emo) => (
                            <button
                              key={emo} type="button"
                              onClick={() => toggleReaction(m.id, emo)}
                              className="text-base hover:scale-125 transition"
                              aria-label={`React with ${emo}`}
                            >
                              {emo}
                            </button>
                          ))}
                        </div>
                      )}
                      {Object.keys(rx).length > 0 && (
                        <div className={`mt-1 flex flex-wrap gap-1 ${mine ? "justify-end" : ""}`}>
                          {Object.entries(rx).map(([emo, info]) => (
                            <button
                              key={emo}
                              type="button"
                              onClick={() => toggleReaction(m.id, emo)}
                              className={cn(
                                "inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full border transition",
                                info.mine
                                  ? "bg-amber-100 border-amber-300 text-amber-900"
                                  : "bg-white border-amber-100 text-foreground hover:bg-amber-50",
                              )}
                            >
                              <span>{emo}</span>
                              <span className="font-semibold tabular-nums">{info.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
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
