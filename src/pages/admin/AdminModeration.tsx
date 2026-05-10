import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';

export default function AdminModeration() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['mod-queue'],
    queryFn: async () => {
      const { data } = await supabase.from('moderation_queue').select('*').order('created_at', { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, status, action }: { id: string; status: string; action: 'remove' | 'approve'; row: any }) => {
      const target = (await supabase.from('moderation_queue').select('*').eq('id', id).single()).data;
      if (action === 'remove' && target) {
        const tableMap: Record<string, string> = { comment: 'quiz_comments', message: 'chat_messages', post: 'community_posts', quiz: 'quizzes' };
        const tbl = tableMap[target.content_type];
        if (tbl) {
          // soft hide if column exists, else delete
          if (tbl === 'quiz_comments' || tbl === 'community_posts') {
            await supabase.from(tbl).update({ is_hidden: true } as any).eq('id', target.content_id);
          } else {
            await supabase.from(tbl as any).delete().eq('id', target.content_id);
          }
        }
      }
      const { error } = await supabase.from('moderation_queue')
        .update({ status, reviewed_by: user!.id, reviewed_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mod-queue'] }); toast.success('Reviewed'); },
    onError: (e: any) => toast.error(e.message ?? 'Failed'),
  });

  return (
    <div className="container mx-auto p-4 max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6"/>Moderation Queue</h1>
      {(data ?? []).length === 0 && <Card><CardContent className="p-6 text-center text-muted-foreground">Queue is empty.</CardContent></Card>}
      {(data ?? []).map((r: any) => (
        <Card key={r.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base capitalize">{r.content_type}</CardTitle>
              <Badge variant={r.status === 'pending' ? 'secondary' : r.status === 'removed' ? 'destructive' : 'default'}>{r.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{r.reason} • {new Date(r.created_at).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">ID: {r.content_id}</p>
          </CardHeader>
          {r.status === 'pending' && (
            <CardContent className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={() => review.mutate({ id: r.id, status: 'removed', action: 'remove', row: r })}>Remove content</Button>
              <Button size="sm" variant="outline" onClick={() => review.mutate({ id: r.id, status: 'approved', action: 'approve', row: r })}>Keep</Button>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
