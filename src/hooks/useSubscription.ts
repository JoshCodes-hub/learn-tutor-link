import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useSubscriptionPlans = () =>
  useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_cents', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useMySubscription = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-sub', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
};

export const useIsPro = () => {
  const { data } = useMySubscription();
  return !!data && data.plan_id !== 'free' && (!data.expires_at || new Date(data.expires_at) > new Date());
};
