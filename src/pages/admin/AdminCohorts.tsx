import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminCohorts() {
  const { data: cohorts } = useQuery({
    queryKey: ['cohorts'],
    queryFn: async () => {
      const { data } = await supabase.from('cohort_snapshots').select('*').order('signup_week', { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const { data: revenue } = useQuery({
    queryKey: ['revenue'],
    queryFn: async () => {
      const { data } = await supabase.from('token_purchases')
        .select('amount_cents, currency, created_at, status')
        .eq('status', 'completed')
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
      const total = (data ?? []).reduce((a, b: any) => a + (b.amount_cents ?? 0), 0);
      return { total_cents: total, count: data?.length ?? 0 };
    },
  });

  return (
    <div className="container mx-auto p-4 max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Cohort Retention & Revenue</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Last 30 days revenue</CardTitle></CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">${((revenue?.total_cents ?? 0) / 100).toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">{revenue?.count ?? 0} purchases</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Weekly cohorts</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr><th className="p-2 text-left">Week</th><th className="p-2">Size</th><th className="p-2">W1</th><th className="p-2">W2</th><th className="p-2">W4</th></tr></thead>
            <tbody>
              {(cohorts ?? []).map((c: any) => (
                <tr key={c.id} className="border-t">
                  <td className="p-2">{new Date(c.signup_week).toLocaleDateString()}</td>
                  <td className="p-2 text-center">{c.cohort_size}</td>
                  <td className="p-2 text-center">{c.cohort_size ? Math.round((c.active_w1 / c.cohort_size) * 100) : 0}%</td>
                  <td className="p-2 text-center">{c.cohort_size ? Math.round((c.active_w2 / c.cohort_size) * 100) : 0}%</td>
                  <td className="p-2 text-center">{c.cohort_size ? Math.round((c.active_w4 / c.cohort_size) * 100) : 0}%</td>
                </tr>
              ))}
              {(cohorts ?? []).length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No snapshots yet. Schedule a job to populate.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
