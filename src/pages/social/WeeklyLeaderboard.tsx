import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Coins } from 'lucide-react';

function weekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().slice(0, 10);
}

export default function WeeklyLeaderboard() {
  const ws = weekStart();
  const { data } = useQuery({
    queryKey: ['weekly-lb', ws],
    queryFn: async () => {
      const { data } = await supabase
        .from('weekly_leaderboards')
        .select('*, profiles!weekly_leaderboards_user_id_fkey(full_name, avatar_url)')
        .eq('week_start', ws)
        .order('rank', { ascending: true })
        .limit(50);
      return data ?? [];
    },
  });

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-4">
      <header className="text-center space-y-1">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2"><Trophy className="w-6 h-6 text-primary"/>Weekly Champions</h1>
        <p className="text-sm text-muted-foreground">Top scorers earn token prizes every Monday.</p>
      </header>
      <Card>
        <CardHeader><CardTitle>Week of {new Date(ws).toLocaleDateString()}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(data ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Leaderboard not yet computed for this week.</p>}
          {(data ?? []).map((row: any) => (
            <div key={row.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent">
              <span className="font-bold w-6 text-center text-primary">{row.rank}</span>
              <Avatar className="w-9 h-9"><AvatarImage src={row.profiles?.avatar_url}/><AvatarFallback>{row.profiles?.full_name?.[0] ?? '?'}</AvatarFallback></Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{row.profiles?.full_name ?? 'Student'}</p>
                <p className="text-xs text-muted-foreground">{row.score} pts</p>
              </div>
              {row.prize_tokens > 0 && (
                <Badge variant="secondary" className="gap-1"><Coins className="w-3 h-3"/>{row.prize_tokens}</Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
