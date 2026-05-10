import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Campaign {
  id: string;
  title: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  audience: 'all' | 'students' | 'tutors' | 'inactive';
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
  created_by: string;
}

export function useActiveCampaigns() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['campaigns-active', user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const [{ data: campaigns }, { data: dismissed }] = await Promise.all([
        supabase.from('campaigns').select('*').order('starts_at', { ascending: false }),
        supabase.from('campaign_dismissals').select('campaign_id').eq('user_id', user!.id),
      ]);
      const dismissedIds = new Set((dismissed ?? []).map((d: any) => d.campaign_id));
      return ((campaigns ?? []) as Campaign[]).filter(c => !dismissedIds.has(c.id));
    },
  });
}

export function useDismissCampaign() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      if (!user) throw new Error('not authenticated');
      await supabase.from('campaign_dismissals').upsert({ campaign_id: campaignId, user_id: user.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns-active'] }),
  });
}

export function useAdminCampaigns() {
  return useQuery({
    queryKey: ['admin-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Campaign[];
    },
  });
}

export function useUpsertCampaign() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Campaign> & { title: string; body: string }) => {
      if (!user) throw new Error('not authenticated');
      const { id, ...rest } = input;
      if (id) {
        const { error } = await supabase.from('campaigns').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('campaigns').insert({ ...rest, created_by: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-campaigns'] }),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-campaigns'] }),
  });
}
