import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Feed() {
  const { user } = useAuth();

  // Activity feed: latest published quizzes from tutors the user follows + popular ones
  const { data } = useQuery({
    queryKey: ['feed', user?.id],
    queryFn: async () => {
      let followedIds: string[] = [];
      if (user) {
        const { data: f } = await supabase.from('tutor_follows').select('tutor_id').eq('follower_id', user.id);
        followedIds = (f ?? []).map((x: any) => x.tutor_id);
      }
      let q: any = supabase
        .from('quizzes')
        .select('id, title, subject, created_at, created_by, profiles!quizzes_created_by_fkey(full_name, avatar_url, tutor_code)')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(30);
      if (followedIds.length > 0) q = q.in('created_by', followedIds);
      const { data } = await q;
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="w-6 h-6 text-primary"/>Study Feed</h1>
      {(data ?? []).length === 0 && (
        <Card><CardContent className="p-6 text-center text-muted-foreground">Follow tutors to see their fresh quizzes here.</CardContent></Card>
      )}
      {(data ?? []).map((q: any) => (
        <Card key={q.id}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10"><AvatarImage src={q.profiles?.avatar_url}/><AvatarFallback>{q.profiles?.full_name?.[0] ?? 'T'}</AvatarFallback></Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{q.profiles?.full_name ?? 'Tutor'} <span className="text-muted-foreground">{q.profiles?.tutor_code}</span></p>
                <p className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link to={`/quiz/${q.id}`}>
              <CardTitle className="text-lg hover:text-primary">{q.title}</CardTitle>
            </Link>
            {q.subject && <p className="text-sm text-muted-foreground mt-1">{q.subject}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
