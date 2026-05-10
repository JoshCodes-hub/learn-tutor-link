import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useMyStorefront, useUpsertStorefront } from '@/hooks/useTutorStorefront';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TutorStorefrontEditor() {
  const { data, isLoading } = useMyStorefront();
  const upsert = useUpsertStorefront();
  const [slug, setSlug] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [published, setPublished] = useState(true);

  useEffect(() => {
    if (data) {
      setSlug(data.slug); setHeadline(data.headline ?? ''); setBio(data.bio ?? ''); setPublished(data.is_published);
    }
  }, [data]);

  if (isLoading) return <div className="p-8 text-center">Loading…</div>;

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Your Storefront</h1>
      {data && (
        <Link to={`/t/${data.slug}`} className="text-sm text-primary inline-flex items-center gap-1">
          View public page <ExternalLink className="w-3 h-3"/>
        </Link>
      )}
      <Card>
        <CardHeader><CardTitle>Edit details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>URL slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="e.g. dr-amaka" />
            <p className="text-xs text-muted-foreground mt-1">overraprep.app/t/{slug || '…'}</p>
          </div>
          <div><Label>Headline</Label><Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Pharmacology specialist • 10+ years" /></div>
          <div><Label>Bio</Label><Textarea rows={5} value={bio} onChange={(e) => setBio(e.target.value)} /></div>
          <div className="flex items-center justify-between">
            <Label>Published</Label>
            <Switch checked={published} onCheckedChange={setPublished} />
          </div>
          <Button
            className="w-full"
            disabled={!slug || upsert.isPending}
            onClick={() => upsert.mutate({ slug, headline, bio, is_published: published })}
          >
            {upsert.isPending ? 'Saving…' : 'Save Storefront'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
