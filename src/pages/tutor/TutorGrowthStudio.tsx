import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Plus, Copy, Trash2, TrendingUp, Tag, Package, Link as LinkIcon } from 'lucide-react';
import { nativeShare } from '@/lib/native';

interface Promo { id: string; code: string; discount_percent: number; uses: number; max_uses: number | null; active: boolean; expires_at: string | null }
interface Bundle { id: string; title: string; quantity: number; price_tokens: number; description: string | null; active: boolean }
interface Affiliate { id: string; slug: string; destination: string; clicks: number; conversions: number }

export default function TutorGrowthStudio() {
  const [uid, setUid] = useState<string | null>(null);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [aff, setAff] = useState<Affiliate[]>([]);
  const [stats, setStats] = useState({ revenue: 0, students: 0, sessions: 0 });
  const [loading, setLoading] = useState(true);

  // Forms
  const [pCode, setPCode] = useState(''); const [pDisc, setPDisc] = useState(10);
  const [bTitle, setBTitle] = useState(''); const [bQty, setBQty] = useState(5); const [bPrice, setBPrice] = useState(50);
  const [aSlug, setASlug] = useState(''); const [aDest, setADest] = useState('/');

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUid(user.id);
    const [p, b, a, payouts, bookings] = await Promise.all([
      supabase.from('promo_codes').select('*').eq('tutor_id', user.id).order('created_at', { ascending: false }),
      supabase.from('bundle_offers').select('*').eq('tutor_id', user.id).order('created_at', { ascending: false }),
      supabase.from('affiliate_links').select('*').eq('tutor_id', user.id).order('created_at', { ascending: false }),
      supabase.from('tutor_payouts').select('amount_tokens').eq('tutor_id', user.id),
      supabase.from('session_bookings').select('id, student_id, slot_id, tutor_session_slots!inner(tutor_id)').eq('tutor_session_slots.tutor_id', user.id),
    ]);
    setPromos((p.data as any) ?? []);
    setBundles((b.data as any) ?? []);
    setAff((a.data as any) ?? []);
    const revenue = ((payouts.data as any) ?? []).reduce((s: number, r: any) => s + (r.amount_tokens ?? 0), 0);
    const students = new Set(((bookings.data as any) ?? []).map((r: any) => r.student_id)).size;
    setStats({ revenue, students, sessions: ((bookings.data as any) ?? []).length });
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addPromo = async () => {
    if (!pCode.trim()) return;
    const { error } = await supabase.from('promo_codes').insert({
      tutor_id: uid, code: pCode.trim().toUpperCase(), discount_percent: pDisc,
    });
    if (error) toast.error(error.message); else { toast.success('Promo created'); setPCode(''); load(); }
  };
  const addBundle = async () => {
    if (!bTitle.trim()) return;
    const { error } = await supabase.from('bundle_offers').insert({
      tutor_id: uid, title: bTitle, quantity: bQty, price_tokens: bPrice,
    });
    if (error) toast.error(error.message); else { toast.success('Bundle created'); setBTitle(''); load(); }
  };
  const addAff = async () => {
    if (!aSlug.trim()) return;
    const { error } = await supabase.from('affiliate_links').insert({
      tutor_id: uid, slug: aSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'), destination: aDest,
    });
    if (error) toast.error(error.message); else { toast.success('Link created'); setASlug(''); load(); }
  };

  const del = async (table: 'promo_codes' | 'bundle_offers' | 'affiliate_links', id: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) toast.error(error.message); else load();
  };

  const shareAff = async (a: Affiliate) => {
    const url = `${window.location.origin}/r/${a.slug}`;
    const ok = await nativeShare({ title: 'Check this out', url });
    toast.success(ok ? 'Shared' : 'Copied to clipboard');
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied'); };

  return (
    <div className="container max-w-4xl py-6 px-4 space-y-4">
      <header className="flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Growth Studio</h1>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Revenue (tokens)" value={stats.revenue} />
        <StatTile label="Unique students" value={stats.students} />
        <StatTile label="Sessions booked" value={stats.sessions} />
      </div>

      <Tabs defaultValue="promos">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="promos"><Tag className="w-4 h-4 mr-1" />Promos</TabsTrigger>
          <TabsTrigger value="bundles"><Package className="w-4 h-4 mr-1" />Bundles</TabsTrigger>
          <TabsTrigger value="affiliates"><LinkIcon className="w-4 h-4 mr-1" />Affiliates</TabsTrigger>
        </TabsList>

        <TabsContent value="promos" className="space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">New promo code</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2"><Label>Code</Label><Input value={pCode} onChange={(e) => setPCode(e.target.value)} placeholder="LAUNCH20" /></div>
                <div><Label>% off</Label><Input type="number" min={1} max={100} value={pDisc} onChange={(e) => setPDisc(+e.target.value)} /></div>
              </div>
              <Button size="sm" onClick={addPromo} className="gap-1"><Plus className="w-4 h-4" />Create</Button>
            </CardContent>
          </Card>
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : promos.map(p => (
            <Card key={p.id}><CardContent className="p-3 flex items-center gap-2">
              <div className="flex-1">
                <p className="font-mono font-semibold">{p.code}</p>
                <p className="text-xs text-muted-foreground">{p.discount_percent}% off · {p.uses} use{p.uses === 1 ? '' : 's'}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copy(p.code)}><Copy className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => del('promo_codes', p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="bundles" className="space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">New bundle</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Label>Title</Label><Input value={bTitle} onChange={(e) => setBTitle(e.target.value)} placeholder="5-pack mock exams" />
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Quantity</Label><Input type="number" min={2} value={bQty} onChange={(e) => setBQty(+e.target.value)} /></div>
                <div><Label>Price (tokens)</Label><Input type="number" min={0} value={bPrice} onChange={(e) => setBPrice(+e.target.value)} /></div>
              </div>
              <Button size="sm" onClick={addBundle} className="gap-1"><Plus className="w-4 h-4" />Create</Button>
            </CardContent>
          </Card>
          {bundles.map(b => (
            <Card key={b.id}><CardContent className="p-3 flex items-center gap-2">
              <div className="flex-1">
                <p className="font-semibold">{b.title}</p>
                <p className="text-xs text-muted-foreground">{b.quantity} × · {b.price_tokens} tokens</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => del('bundle_offers', b.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="affiliates" className="space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">New affiliate link</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Slug</Label><Input value={aSlug} onChange={(e) => setASlug(e.target.value)} placeholder="my-promo" /></div>
                <div><Label>Destination</Label><Input value={aDest} onChange={(e) => setADest(e.target.value)} placeholder="/t/your-handle" /></div>
              </div>
              <Button size="sm" onClick={addAff} className="gap-1"><Plus className="w-4 h-4" />Create</Button>
            </CardContent>
          </Card>
          {aff.map(a => (
            <Card key={a.id}><CardContent className="p-3 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm truncate">/r/{a.slug}</p>
                <p className="text-xs text-muted-foreground">{a.clicks} clicks · {a.conversions} conv.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => shareAff(a)}><LinkIcon className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => del('affiliate_links', a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card><CardContent className="p-3 text-center">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </CardContent></Card>
  );
}
