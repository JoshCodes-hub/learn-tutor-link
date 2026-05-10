import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Flag, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export function QuizComments({ quizId }: { quizId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState('');

  const { data } = useQuery({
    queryKey: ['quiz-comments', quizId],
    queryFn: async () => {
      const { data } = await supabase
        .from('quiz_comments')
        .select('*, profiles!quiz_comments_author_id_fkey(full_name, avatar_url)')
        .eq('quiz_id', quizId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase.channel('qc-' + quizId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_comments', filter: `quiz_id=eq.${quizId}` },
        () => qc.invalidateQueries({ queryKey: ['quiz-comments', quizId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [quizId, qc]);

  const post = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sign in to comment');
      const { error } = await supabase.from('quiz_comments').insert({ quiz_id: quizId, author_id: user.id, content });
      if (error) throw error;
    },
    onSuccess: () => { setContent(''); qc.invalidateQueries({ queryKey: ['quiz-comments', quizId] }); },
    onError: (e: any) => toast.error(e.message ?? 'Failed'),
  });

  const report = async (commentId: string) => {
    if (!user) return toast.error('Sign in first');
    await supabase.from('moderation_queue').insert({
      content_type: 'comment', content_id: commentId, reason: 'user reported', reported_by: user.id,
    });
    toast.success('Reported. Admin will review.');
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="w-4 h-4"/>Discussion</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {user && (
          <div className="space-y-2">
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Share your thoughts…" rows={2}/>
            <Button size="sm" disabled={!content.trim() || post.isPending} onClick={() => post.mutate()}>Post</Button>
          </div>
        )}
        {(data ?? []).map((c: any) => (
          <div key={c.id} className="border-b pb-2 last:border-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6"><AvatarImage src={c.profiles?.avatar_url}/><AvatarFallback>{c.profiles?.full_name?.[0] ?? '?'}</AvatarFallback></Avatar>
                <span className="text-xs font-medium">{c.profiles?.full_name ?? 'Anon'}</span>
                <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
              <button onClick={() => report(c.id)} className="text-muted-foreground hover:text-destructive"><Flag className="w-3 h-3"/></button>
            </div>
            <p className="text-sm mt-1">{c.content}</p>
          </div>
        ))}
        {(data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
      </CardContent>
    </Card>
  );
}
