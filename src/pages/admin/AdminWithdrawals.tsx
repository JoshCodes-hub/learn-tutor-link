import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminWithdrawals() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('withdrawal_requests')
        .select('*, profiles!withdrawal_requests_tutor_id_fkey(full_name, tutor_code, email)')
        .order('created_at', { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('withdrawal_requests')
        .update({ status, processed_by: user!.id, processed_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-withdrawals'] }); toast.success('Updated'); },
    onError: (e: any) => toast.error(e.message ?? 'Failed'),
  });

  return (
    <div className="container mx-auto p-4 max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Withdrawal Requests</h1>
      {(data ?? []).map((w: any) => (
        <Card key={w.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{w.profiles?.full_name ?? '—'} • {w.amount} tokens</CardTitle>
              <Badge variant={w.status === 'paid' ? 'default' : w.status === 'rejected' ? 'destructive' : 'secondary'}>{w.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{w.payout_email ?? w.profiles?.email} • {new Date(w.created_at).toLocaleString()}</p>
          </CardHeader>
          {w.status === 'pending' && (
            <CardContent className="flex gap-2">
              <Button size="sm" onClick={() => update.mutate({ id: w.id, status: 'approved' })}>Approve</Button>
              <Button size="sm" variant="default" onClick={() => update.mutate({ id: w.id, status: 'paid' })}>Mark Paid</Button>
              <Button size="sm" variant="destructive" onClick={() => update.mutate({ id: w.id, status: 'rejected' })}>Reject</Button>
            </CardContent>
          )}
        </Card>
      ))}
      {(data ?? []).length === 0 && <Card><CardContent className="p-6 text-center text-muted-foreground">No withdrawals yet.</CardContent></Card>}
    </div>
  );
}
