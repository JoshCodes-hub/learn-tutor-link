import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

export function FollowTutorButton({ tutorId }: { tutorId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: isFollowing } = useQuery({
    queryKey: ['follow', user?.id, tutorId],
    enabled: !!user && !!tutorId,
    queryFn: async () => {
      const { data } = await supabase
        .from('tutor_follows')
        .select('id')
        .eq('follower_id', user!.id)
        .eq('tutor_id', tutorId)
        .maybeSingle();
      return !!data;
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sign in to follow');
      if (isFollowing) {
        const { error } = await supabase.from('tutor_follows').delete()
          .eq('follower_id', user.id).eq('tutor_id', tutorId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tutor_follows')
          .insert({ follower_id: user.id, tutor_id: tutorId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['follow', user?.id, tutorId] }),
    onError: (e: any) => toast.error(e.message ?? 'Failed'),
  });

  if (user?.id === tutorId) return null;
  return (
    <Button size="sm" variant={isFollowing ? 'outline' : 'default'} onClick={() => toggle.mutate()} disabled={toggle.isPending}>
      {isFollowing ? <><UserCheck className="w-4 h-4 mr-1"/>Following</> : <><UserPlus className="w-4 h-4 mr-1"/>Follow</>}
    </Button>
  );
}
