import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';

export default function AdminTutorScorecards() {
  const { data } = useQuery({
    queryKey: ['scorecards'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tutor_scorecards')
        .select('*, profiles!tutor_scorecards_tutor_id_fkey(full_name, tutor_code)')
        .order('avg_rating', { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  return (
    <div className="container mx-auto p-4 max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Tutor Scorecards</h1>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr><th className="p-2 text-left">Tutor</th><th className="p-2">Rating</th><th className="p-2">Quizzes</th><th className="p-2">Earnings</th></tr>
            </thead>
            <tbody>
              {(data ?? []).map((s: any) => (
                <tr key={s.tutor_id} className="border-t">
                  <td className="p-2"><div className="font-medium">{s.profiles?.full_name ?? '—'}</div><div className="text-xs text-muted-foreground">{s.profiles?.tutor_code}</div></td>
                  <td className="p-2 text-center"><span className="inline-flex items-center gap-1"><Star className="w-3 h-3 fill-primary text-primary"/>{Number(s.avg_rating).toFixed(2)}</span></td>
                  <td className="p-2 text-center">{s.total_quizzes}</td>
                  <td className="p-2 text-center">{s.total_earnings}</td>
                </tr>
              ))}
              {(data ?? []).length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No scorecards yet.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
