import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTokenWallet, useWithdrawals, useRequestWithdrawal, useTutorEarnings } from '@/hooks/useTutorPayouts';
import { Wallet, ArrowDownToLine, TrendingUp } from 'lucide-react';

export default function TutorPayouts() {
  const wallet = useTokenWallet();
  const earnings = useTutorEarnings();
  const withdrawals = useWithdrawals();
  const request = useRequestWithdrawal();
  const [tokens, setTokens] = useState(100);
  const [email, setEmail] = useState('');

  const balance = wallet.data?.balance ?? 0;
  const totalEarned = (earnings.data ?? []).reduce((a, b: any) => a + (b.tutor_share ?? 0), 0);

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Payouts & Earnings</h1>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wallet className="w-4 h-4"/>Balance</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{balance}</div><p className="text-xs text-muted-foreground">tokens</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4"/>Total Earned</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalEarned}</div><p className="text-xs text-muted-foreground">tokens lifetime</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ArrowDownToLine className="w-5 h-5"/>Request Withdrawal</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Tokens (min 100)</Label>
            <Input type="number" min={100} max={balance} value={tokens} onChange={(e) => setTokens(Number(e.target.value))} />
          </div>
          <div>
            <Label>Payout email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="paypal/paddle email" />
          </div>
          <Button
            disabled={!email || tokens < 100 || tokens > balance || request.isPending}
            onClick={() => request.mutate({ tokens, payoutEmail: email })}
            className="w-full"
          >
            {request.isPending ? 'Submitting…' : 'Request Withdrawal'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(withdrawals.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No withdrawal requests yet.</p>}
          {(withdrawals.data ?? []).map((w: any) => (
            <div key={w.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">{w.amount} tokens</p>
                <p className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</p>
              </div>
              <Badge variant={w.status === 'paid' ? 'default' : w.status === 'rejected' ? 'destructive' : 'secondary'}>{w.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
