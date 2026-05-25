import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TrustScore {
  score: number;
  profile_pct: number;
  age_days: number;
  study_days: number;
  has_subscription: boolean;
}

export function useTrustScore() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["trust-score", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<TrustScore> => {
      const { data, error } = await (supabase as any).rpc("get_trust_score");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        score: Number(row?.score ?? 0),
        profile_pct: Number(row?.profile_pct ?? 0),
        age_days: Number(row?.age_days ?? 0),
        study_days: Number(row?.study_days ?? 0),
        has_subscription: !!row?.has_subscription,
      };
    },
  });
}

export function trustTier(score: number): { label: string; tone: string } {
  if (score >= 80) return { label: "Trusted", tone: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  if (score >= 50) return { label: "Established", tone: "text-amber-700 bg-amber-50 border-amber-200" };
  return { label: "New", tone: "text-slate-700 bg-slate-50 border-slate-200" };
}