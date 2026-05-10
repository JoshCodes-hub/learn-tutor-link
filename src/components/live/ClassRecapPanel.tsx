import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ClassRecapPanel({ slotId }: { slotId: string }) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [recap, setRecap] = useState<{ summary: string; key_points: string[]; action_items: string[] } | null>(null);

  const generate = async () => {
    if (!notes.trim()) { toast.error('Paste class notes or transcript first'); return; }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('class-recap', {
      body: { slot_id: slotId, transcript: notes },
    });
    setLoading(false);
    if (error || (data as any)?.error) {
      const msg = (data as any)?.error ?? error?.message ?? 'Failed';
      if (String(msg).includes('429')) toast.error('Rate limited, retry shortly');
      else if (String(msg).includes('402')) toast.error('AI credits exhausted');
      else toast.error(msg);
      return;
    }
    setRecap((data as any).recap);
    toast.success('Recap generated and shared with attendees');
  };

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> AI class recap</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Textarea rows={5} placeholder="Paste your live notes, slide outline, or transcript here…"
          value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button onClick={generate} disabled={loading} className="w-full gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Generate recap
        </Button>
        {recap && (
          <div className="space-y-3 text-sm">
            <p>{recap.summary}</p>
            {recap.key_points?.length > 0 && (
              <div>
                <p className="font-semibold">Key points</p>
                <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">{recap.key_points.map((p, i) => <li key={i}>{p}</li>)}</ul>
              </div>
            )}
            {recap.action_items?.length > 0 && (
              <div>
                <p className="font-semibold">Action items</p>
                <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">{recap.action_items.map((p, i) => <li key={i}>{p}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
