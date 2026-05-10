import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { sm2 } from "@/lib/srs";
import {
  cacheDueCards, getCachedAt, getCachedDueCards,
  queueReview, getQueuedReviews, removeQueuedById,
  type CachedCard,
} from "@/lib/offlineSrsCache";

export type SrsCard = CachedCard;

export function useDueCards() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["srs-due", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("srs_cards")
          .select("*")
          .lte("due_at", new Date().toISOString())
          .order("due_at", { ascending: true })
          .limit(50);
        if (error) throw error;
        const cards = (data ?? []) as SrsCard[];
        // cache for offline
        cacheDueCards(cards).catch(() => {});
        return cards;
      } catch (e) {
        // network fail -> fall back to cache
        const cached = await getCachedDueCards();
        if (cached.length === 0) throw e;
        const now = Date.now();
        return cached.filter(c => new Date(c.due_at).getTime() <= now)
                     .sort((a, b) => a.due_at.localeCompare(b.due_at));
      }
    },
  });
}

export function useUpcomingCards(days = 14) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["srs-upcoming", user?.id, days],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const from = new Date(); from.setHours(0, 0, 0, 0);
      const to = new Date(from.getTime() + days * 86_400_000);
      const { data, error } = await supabase
        .from("srs_cards")
        .select("id, due_at")
        .gte("due_at", from.toISOString())
        .lte("due_at", to.toISOString())
        .order("due_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; due_at: string }[];
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
      const cachedAt = await getCachedAt();
      return { due: due ?? 0, total: total ?? 0, cachedAt };
    },
  });
}

export function useReviewCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ card, quality }: { card: SrsCard; quality: number }) => {
      const next = sm2(card, quality);
      const tryRemote = async () => {
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
      };
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        await queueReview({ cardId: card.id, quality, next, prevIntervalDays: card.interval_days, userId: user?.id ?? "" });
        return { offline: true };
      }
      try {
        await tryRemote();
        return { offline: false };
      } catch (e) {
        await queueReview({ cardId: card.id, quality, next, prevIntervalDays: card.interval_days, userId: user?.id ?? "" });
        return { offline: true };
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["srs-due"] });
      qc.invalidateQueries({ queryKey: ["srs-stats"] });
      qc.invalidateQueries({ queryKey: ["srs-upcoming"] });
    },
  });
}

/** Flush queued offline reviews to the server. Returns count flushed. */
export async function flushReviewQueue(userId: string | undefined): Promise<number> {
  const queued = await getQueuedReviews();
  if (queued.length === 0) return 0;
  let n = 0;
  for (const item of queued) {
    try {
      const { error } = await supabase
        .from("srs_cards")
        .update({
          ease_factor: item.next.ease_factor,
          interval_days: item.next.interval_days,
          repetitions: item.next.repetitions,
          due_at: item.next.due_at,
          last_reviewed_at: new Date(item.ts).toISOString(),
        })
        .eq("id", item.cardId);
      if (error) throw error;
      if (userId) {
        await supabase.from("srs_reviews").insert({
          card_id: item.cardId, user_id: userId, quality: item.quality,
          prev_interval_days: item.prevIntervalDays,
          new_interval_days: item.next.interval_days,
        });
      }
      await removeQueuedById(item.id);
      n++;
    } catch { /* leave for next attempt */ }
  }
  return n;
}

export function useFlushQueueOnReconnect() {
  const { user } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    const tryFlush = async () => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      const n = await flushReviewQueue(user?.id);
      if (n > 0) {
        qc.invalidateQueries({ queryKey: ["srs-due"] });
        qc.invalidateQueries({ queryKey: ["srs-stats"] });
      }
    };
    tryFlush();
    window.addEventListener("online", tryFlush);
    return () => window.removeEventListener("online", tryFlush);
  }, [user?.id, qc]);
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
