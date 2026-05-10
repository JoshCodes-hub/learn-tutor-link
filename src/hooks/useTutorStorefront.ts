import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useMyStorefront = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['storefront', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('tutor_storefronts')
        .select('*')
        .eq('tutor_id', user!.id)
        .maybeSingle();
      return data;
    },
  });
};

export const useStorefrontBySlug = (slug?: string) =>
  useQuery({
    queryKey: ['storefront-slug', slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tutor_storefronts')
        .select('*, profiles!tutor_storefronts_tutor_id_fkey(full_name, avatar_url, tutor_code, bio)')
        .eq('slug', slug!)
        .eq('is_published', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useUpsertStorefront = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { slug: string; headline?: string; bio?: string; banner_url?: string; is_published?: boolean }) => {
      const { error } = await supabase
        .from('tutor_storefronts')
        .upsert({ tutor_id: user!.id, ...payload }, { onConflict: 'tutor_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['storefront'] });
      toast.success('Storefront saved');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed'),
  });
};

export const useTutorRatings = (tutorId?: string) =>
  useQuery({
    queryKey: ['tutor-ratings', tutorId],
    enabled: !!tutorId,
    queryFn: async () => {
      const { data } = await supabase
        .from('tutor_ratings')
        .select('*, profiles!tutor_ratings_student_id_fkey(full_name, avatar_url)')
        .eq('tutor_id', tutorId!)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

export const useRateTutor = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tutorId, rating, review }: { tutorId: string; rating: number; review?: string }) => {
      const { error } = await supabase
        .from('tutor_ratings')
        .upsert({ tutor_id: tutorId, student_id: user!.id, rating, review }, { onConflict: 'tutor_id,student_id' });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['tutor-ratings', v.tutorId] });
      toast.success('Thanks for your rating!');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed'),
  });
};
