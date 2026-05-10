import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useFeatureFlags = () =>
  useQuery({
    queryKey: ['feature-flags'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('feature_flags').select('*');
      const map: Record<string, { enabled: boolean; rollout: number }> = {};
      (data ?? []).forEach((f: any) => { map[f.key] = { enabled: f.enabled, rollout: f.rollout_percent }; });
      return map;
    },
  });

export const useIsFeatureEnabled = (key: string) => {
  const { data } = useFeatureFlags();
  return data?.[key]?.enabled ?? false;
};
