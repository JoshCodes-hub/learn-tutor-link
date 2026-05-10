import { useState } from 'react';
import { useAdminCampaigns, useUpsertCampaign, useDeleteCampaign, type Campaign } from '@/hooks/useCampaigns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

const empty: Partial<Campaign> = { title: '', body: '', audience: 'all', is_active: true };

export default function AdminCampaigns() {
  const { data, isLoading } = useAdminCampaigns();
  const upsert = useUpsertCampaign();
  const remove = useDeleteCampaign();
  const [editing, setEditing] = useState<Partial<Campaign> | null>(null);

  const save = async () => {
    if (!editing?.title || !editing.body) { toast.error('Title and body required'); return; }
    try {
      await upsert.mutateAsync(editing as any);
      toast.success('Saved');
      setEditing(null);
    } catch (e: any) { toast.error(e?.message ?? 'Save failed'); }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Button onClick={() => setEditing({ ...empty })}><Plus className="w-4 h-4 mr-1" /> New</Button>
      </header>

      {editing && (
        <Card className="p-4 space-y-3">
          <div><Label>Title</Label><Input value={editing.title ?? ''} onChange={e => setEditing({ ...editing, title: e.target.value })} /></div>
          <div><Label>Body</Label><Textarea rows={3} value={editing.body ?? ''} onChange={e => setEditing({ ...editing, body: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>CTA label</Label><Input value={editing.cta_label ?? ''} onChange={e => setEditing({ ...editing, cta_label: e.target.value })} /></div>
            <div><Label>CTA URL</Label><Input value={editing.cta_url ?? ''} onChange={e => setEditing({ ...editing, cta_url: e.target.value })} placeholder="/pricing or https://..." /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Audience</Label>
              <Select value={editing.audience ?? 'all'} onValueChange={(v: any) => setEditing({ ...editing, audience: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="students">Students</SelectItem>
                  <SelectItem value="tutors">Tutors</SelectItem>
                  <SelectItem value="inactive">Inactive (7d+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={editing.is_active ?? true} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
              <span className="text-sm">Active</span>
            </div>
          </div>
          <div><Label>Image URL (optional)</Label><Input value={editing.image_url ?? ''} onChange={e => setEditing({ ...editing, image_url: e.target.value })} /></div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={upsert.isPending}>Save</Button>
          </div>
        </Card>
      )}

      {isLoading ? <p>Loading…</p> : (
        <div className="space-y-2">
          {(data ?? []).map(c => (
            <Card key={c.id} className="p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{c.title} <span className="text-xs text-muted-foreground">· {c.audience}{!c.is_active && ' · paused'}</span></p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{c.body}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setEditing(c)}><Edit className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm('Delete?')) remove.mutate(c.id); }}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
