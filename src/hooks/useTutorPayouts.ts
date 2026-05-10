import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useTutorEarnings = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['tutor-earnings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tutor_earnings')
        .select('*')
        .eq('tutor_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useWithdrawals = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['withdrawals', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('tutor_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useTokenWallet = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['wallet', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('token_wallets')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
  });
};

export const useRequestWithdrawal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tokens, payoutEmail }: { tokens: number; payoutEmail: string }) => {
      const { data, error } = await supabase.rpc('request_withdrawal', {
        _tokens: tokens,
        _payout_email: payoutEmail,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['withdrawals'] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Withdrawal requested');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed'),
  });
};
