import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function AdminTutorScorecards() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['scorecards'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tutor_scorecards')
        .select('*, profiles!tutor_scorecards_tutor_id_fkey(full_name, tutor_code, tutor_status)')
        .order('avg_rating', { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: 'active'|'warned'|'suspended'; reason?: string }) => {
      const { error } = await (supabase as any).rpc('admin_set_tutor_status', { _user_id: id, _status: status, _reason: reason ?? null });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['scorecards'] }); toast.success('Status updated'); },
    onError: (e: any) => toast.error(e.message ?? 'Failed'),
  });

  return (
    <div className="container mx-auto p-4 max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Tutor Scorecards</h1>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr><th className="p-2 text-left">Tutor</th><th className="p-2">Rating</th><th className="p-2">Quizzes</th><th className="p-2">Earnings</th><th className="p-2">Actions</th></tr>
            </thead>
            <tbody>
              {(data ?? []).map((s: any) => (
                <tr key={s.tutor_id} className="border-t">
                  <td className="p-2">
                    <div className="font-medium">{s.profiles?.full_name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{s.profiles?.tutor_code} · {s.profiles?.tutor_status ?? 'active'}</div>
                  </td>
                  <td className="p-2 text-center"><span className="inline-flex items-center gap-1"><Star className="w-3 h-3 fill-primary text-primary"/>{Number(s.avg_rating).toFixed(2)}</span></td>
                  <td className="p-2 text-center">{s.total_quizzes}</td>
                  <td className="p-2 text-center">{s.total_earnings}</td>
                  <td className="p-2 text-center">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: s.tutor_id, status: 'warned', reason: 'Performance review' })}>Warn</Button>
                      <Button size="sm" variant="destructive" onClick={() => setStatus.mutate({ id: s.tutor_id, status: 'suspended', reason: 'Policy violation' })}>Suspend</Button>
                      <Button size="sm" onClick={() => setStatus.mutate({ id: s.tutor_id, status: 'active' })}>Reinstate</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(data ?? []).length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No scorecards yet.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
