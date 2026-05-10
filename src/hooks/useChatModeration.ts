import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Returns Set of blocked user IDs for the current user. */
export function useUserBlocks() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["user-blocks", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_blocks")
        .select("blocked_id")
        .eq("blocker_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r: any) => r.blocked_id as string));
    },
  });

  const block = useMutation({
    mutationFn: async (blocked_id: string) => {
      if (!user?.id) throw new Error("not authenticated");
      const { error } = await supabase
        .from("user_blocks")
        .insert({ blocker_id: user.id, blocked_id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-blocks", user?.id] }),
  });

  const unblock = useMutation({
    mutationFn: async (blocked_id: string) => {
      if (!user?.id) throw new Error("not authenticated");
      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", blocked_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-blocks", user?.id] }),
  });

  return { blocked: q.data ?? new Set<string>(), block, unblock, isLoading: q.isLoading };
}

export async function reportMessage(message_id: string, reason: string) {
  const { error } = await supabase
    .from("chat_message_reports")
    .insert({ message_id, reason });
  if (error) throw error;
}
