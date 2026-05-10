import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PlaylistItem = { id: string; label: string; topic_id?: string | null; done: boolean };

export type RemediationPlaylist = {
  id: string;
  user_id: string;
  attempt_id: string | null;
  exam_id: string | null;
  title: string;
  content: string;
  topic_breakdown: any[];
  items: PlaylistItem[];
  is_bookmarked: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

const TBL = "remediation_playlists" as const;

function parseItemsFromMarkdown(md: string, breakdown: any[] = []): PlaylistItem[] {
  // Look for bullet/numbered markdown lines and turn them into items.
  const lines = md.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const bullets = lines
    .filter(l => /^([-*]|\d+\.)\s+/.test(l))
    .map(l => l.replace(/^([-*]|\d+\.)\s+/, "").replace(/\*\*/g, "").trim())
    .filter(l => l.length > 6 && l.length < 220);

  const items: PlaylistItem[] = bullets.slice(0, 30).map((label, i) => ({
    id: `i${i}`, label, done: false,
    topic_id: breakdown.find(b => label.toLowerCase().includes(String(b.name ?? "").toLowerCase()))?.topic_id ?? null,
  }));
  if (items.length === 0) {
    return [{ id: "i0", label: "Review weak topics from this exam", done: false }];
  }
  return items;
}

export function useMyPlaylists() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["remediation-playlists", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from(TBL)
        .select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RemediationPlaylist[];
    },
  });
}

export function useBookmarkPlaylist() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string; content: string;
      attemptId?: string | null; examId?: string | null;
      topicBreakdown?: any[];
    }) => {
      if (!user?.id) throw new Error("not signed in");
      const items = parseItemsFromMarkdown(input.content, input.topicBreakdown ?? []);
      const { data, error } = await (supabase as any).from(TBL).insert({
        user_id: user.id,
        title: input.title || "Remediation Plan",
        content: input.content,
        attempt_id: input.attemptId ?? null,
        exam_id: input.examId ?? null,
        topic_breakdown: input.topicBreakdown ?? [],
        items,
      }).select("*").single();
      if (error) throw error;
      return data as RemediationPlaylist;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["remediation-playlists"] }),
  });
}

export function useUpdatePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; items?: PlaylistItem[]; is_bookmarked?: boolean }) => {
      const patch: any = { };
      if (input.items) {
        patch.items = input.items;
        const allDone = input.items.length > 0 && input.items.every(i => i.done);
        patch.completed_at = allDone ? new Date().toISOString() : null;
      }
      if (typeof input.is_bookmarked === "boolean") patch.is_bookmarked = input.is_bookmarked;
      const { error } = await (supabase as any).from(TBL).update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["remediation-playlists"] }),
  });
}

export function useDeletePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(TBL).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["remediation-playlists"] }),
  });
}

export function usePlaylistByAttempt(attemptId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["remediation-playlist-by-attempt", user?.id, attemptId],
    enabled: !!user?.id && !!attemptId,
    queryFn: async () => {
      const { data } = await (supabase as any).from(TBL)
        .select("*").eq("attempt_id", attemptId).maybeSingle();
      return (data ?? null) as RemediationPlaylist | null;
    },
  });
}
