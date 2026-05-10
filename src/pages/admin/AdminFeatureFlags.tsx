import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

export default function AdminFeatureFlags() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['admin-flags'],
    queryFn: async () => {
      const { data } = await supabase.from('feature_flags').select('*').order('key');
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async ({ key, patch }: { key: string; patch: any }) => {
      const { error } = await supabase.from('feature_flags').update({ ...patch, updated_at: new Date().toISOString() }).eq('key', key);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-flags'] }); qc.invalidateQueries({ queryKey: ['feature-flags'] }); toast.success('Flag updated'); },
    onError: (e: any) => toast.error(e.message ?? 'Failed'),
  });

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Feature Flags</h1>
      <div className="space-y-3">
        {(data ?? []).map((f: any) => (
          <Card key={f.key}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{f.key}</CardTitle>
                <Switch checked={f.enabled} onCheckedChange={(v) => update.mutate({ key: f.key, patch: { enabled: v } })}/>
              </div>
              <p className="text-xs text-muted-foreground">{f.description}</p>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-1">Rollout: {f.rollout_percent}%</p>
              <Slider value={[f.rollout_percent]} max={100} step={10}
                onValueCommit={(v) => update.mutate({ key: f.key, patch: { rollout_percent: v[0] } })}/>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
