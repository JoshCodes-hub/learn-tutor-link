import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { sm2 } from "@/lib/srs";

export type SrsCard = {
  id: string; user_id: string; front: string; back: string;
  source_kind: string; source_id: string | null; tag: string | null;
  ease_factor: number; interval_days: number; repetitions: number;
  due_at: string; last_reviewed_at: string | null;
};

export function useDueCards() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["srs-due", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("srs_cards")
        .select("*")
        .lte("due_at", new Date().toISOString())
        .order("due_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as SrsCard[];
    },
  });
}

export function useSrsStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["srs-stats", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const now = new Date().toISOString();
      const [{ count: due }, { count: total }] = await Promise.all([
        supabase.from("srs_cards").select("*", { count: "exact", head: true }).lte("due_at", now),
        supabase.from("srs_cards").select("*", { count: "exact", head: true }),
      ]);
      return { due: due ?? 0, total: total ?? 0 };
    },
  });
}

export function useReviewCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ card, quality }: { card: SrsCard; quality: number }) => {
      const next = sm2(card, quality);
      const { error: e1 } = await supabase
        .from("srs_cards")
        .update({
          ease_factor: next.ease_factor,
          interval_days: next.interval_days,
          repetitions: next.repetitions,
          due_at: next.due_at,
          last_reviewed_at: new Date().toISOString(),
        })
        .eq("id", card.id);
      if (e1) throw e1;
      if (user?.id) {
        await supabase.from("srs_reviews").insert({
          card_id: card.id, user_id: user.id, quality,
          prev_interval_days: card.interval_days,
          new_interval_days: next.interval_days,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["srs-due"] });
      qc.invalidateQueries({ queryKey: ["srs-stats"] });
    },
  });
}

export async function addSrsCard(args: {
  userId: string; front: string; back: string;
  sourceKind?: string; sourceId?: string | null; tag?: string | null;
}) {
  const { error } = await supabase.from("srs_cards").insert({
    user_id: args.userId,
    front: args.front,
    back: args.back,
    source_kind: args.sourceKind ?? "manual",
    source_id: args.sourceId ?? null,
    tag: args.tag ?? null,
  });
  if (error) throw error;
}

export async function addSrsCardsBulk(userId: string, cards: { front: string; back: string; sourceKind?: string; sourceId?: string | null }[]) {
  if (cards.length === 0) return;
  const rows = cards.map(c => ({
    user_id: userId,
    front: c.front, back: c.back,
    source_kind: c.sourceKind ?? "manual",
    source_id: c.sourceId ?? null,
  }));
  const { error } = await supabase.from("srs_cards").insert(rows);
  if (error) throw error;
}
