import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useTodayCoachPlan = () => {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ['coach-plan', user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('coach_plans')
        .select('*')
        .eq('user_id', user!.id)
        .eq('plan_date', today)
        .maybeSingle();
      return data;
    },
  });
};

export const useGenerateCoachPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('study-coach', { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coach-plan'] });
      toast.success('New plan ready!');
    },
    onError: (e: any) => toast.error(e.message ?? 'Coach unavailable'),
  });
};

export const useTopicMastery = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['mastery', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('topic_mastery')
        .select('*')
        .eq('user_id', user!.id)
        .order('mastery_score', { ascending: true });
      return data ?? [];
    },
  });
};
