import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export type ChatThreadKind = "dm" | "group" | "brainstorm";
export type ChatContextKind = "study_pack" | "tutor_curriculum" | null;

export interface ChatThread {
  id: string;
  kind: ChatThreadKind;
  title: string | null;
  context_kind: ChatContextKind;
  context_id: string | null;
  invite_code: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message?: { content: string; created_at: string; is_ai: boolean } | null;
  unread?: number;
}

export function useMyThreads() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Realtime: invalidate on new message in any of my threads
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`my-threads-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" },
        () => qc.invalidateQueries({ queryKey: ["chat-threads", user.id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  return useQuery({
    queryKey: ["chat-threads", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from("chat_thread_members")
        .select("thread_id, last_read_at, chat_threads(*)")
        .eq("user_id", user!.id);
      if (error) throw error;

      const threads: (ChatThread & { last_read_at: string })[] = (members ?? [])
        .map((m: any) => ({ ...(m.chat_threads as ChatThread), last_read_at: m.last_read_at }))
        .filter(Boolean);

      // Fetch latest message + unread count per thread
      const ids = threads.map(t => t.id);
      if (ids.length === 0) return [] as ChatThread[];

      const { data: lastMsgs } = await supabase
        .from("chat_messages")
        .select("thread_id, content, created_at, is_ai")
        .in("thread_id", ids)
        .order("created_at", { ascending: false });

      const byThread: Record<string, any> = {};
      const unread: Record<string, number> = {};
      for (const m of lastMsgs ?? []) {
        if (!byThread[m.thread_id]) byThread[m.thread_id] = m;
        const t = threads.find(x => x.id === m.thread_id);
        if (t && new Date(m.created_at) > new Date(t.last_read_at)) {
          unread[m.thread_id] = (unread[m.thread_id] ?? 0) + 1;
        }
      }

      return threads.map(t => ({
        ...t,
        last_message: byThread[t.id] ?? null,
        unread: unread[t.id] ?? 0,
      })).sort((a, b) => {
        const ad = a.last_message?.created_at ?? a.updated_at;
        const bd = b.last_message?.created_at ?? b.updated_at;
        return new Date(bd).getTime() - new Date(ad).getTime();
      }) as ChatThread[];
    },
  });
}

export function useUnreadChatCount() {
  const { data } = useMyThreads();
  return (data ?? []).reduce((sum, t) => sum + (t.unread ?? 0), 0);
}

export function useCreateThread() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      kind: ChatThreadKind;
      title?: string;
      context_kind?: ChatContextKind;
      context_id?: string | null;
      member_ids?: string[];
    }) => {
      if (!user?.id) throw new Error("not authenticated");
      const { data: thread, error } = await supabase
        .from("chat_threads")
        .insert({
          kind: input.kind,
          title: input.title ?? null,
          context_kind: input.context_kind ?? null,
          context_id: input.context_id ?? null,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      // Add additional members
      if (input.member_ids && input.member_ids.length > 0) {
        const rows = input.member_ids
          .filter(id => id !== user.id)
          .map(id => ({ thread_id: thread.id, user_id: id, role: "member" }));
        if (rows.length) {
          await supabase.from("chat_thread_members").insert(rows);
        }
      }
      return thread as ChatThread;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-threads"] }),
  });
}

export async function findOrCreateContextThread(opts: {
  userId: string;
  context_kind: "study_pack" | "tutor_curriculum";
  context_id: string;
  title: string;
}): Promise<string> {
  // Look for existing brainstorm thread the user owns for this context
  const { data: existing } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("context_kind", opts.context_kind)
    .eq("context_id", opts.context_id)
    .eq("created_by", opts.userId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: thread, error } = await supabase
    .from("chat_threads")
    .insert({
      kind: "brainstorm",
      title: opts.title,
      context_kind: opts.context_kind,
      context_id: opts.context_id,
      created_by: opts.userId,
    })
    .select()
    .single();
  if (error) throw error;
  return thread.id;
}

export async function joinBrainstormByCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc("join_brainstorm_thread", { _code: code });
  if (error) throw error;
  return data as string;
}

export async function markThreadRead(threadId: string, userId: string) {
  await supabase
    .from("chat_thread_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .eq("user_id", userId);
}
