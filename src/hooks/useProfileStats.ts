import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProfileStats {
  quizzes_taken: number;
  quiz_accuracy: number;
  cards_reviewed: number;
  current_streak: number;
  longest_streak: number;
  ai_activity: number;
  engagement: number;
  uploads_count: number;
  students_impacted: number;
  followers_count: number;
  avg_rating: number | null;
}

export function useProfileStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile-stats", userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_public_profile_stats", { _user_id: userId });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as ProfileStats | null;
    },
  });
}