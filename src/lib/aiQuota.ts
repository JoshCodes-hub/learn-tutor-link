import { supabase } from "@/integrations/supabase/client";

export type AIQuotaKind = "ai_study_pack" | "audio" | "advanced_quiz" | "ai_summary" | "flashcards";

export const FREE_LIMITS: Record<AIQuotaKind, number> = {
  ai_study_pack: 5,
  audio: 2,
  advanced_quiz: 3,
  ai_summary: 5,
  flashcards: 5,
};

export interface QuotaResult { allowed: boolean; used: number; remaining: number; }

/** Atomically increments daily counter; returns allowed=false when over the free limit. */
export async function checkAndIncrementAIUsage(kind: AIQuotaKind): Promise<QuotaResult> {
  const limit = FREE_LIMITS[kind];
  const { data, error } = await (supabase as any).rpc("increment_ai_usage", {
    _kind: kind,
    _limit: limit,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: !!row?.allowed,
    used: Number(row?.used ?? 0),
    remaining: Number(row?.remaining ?? 0),
  };
}
