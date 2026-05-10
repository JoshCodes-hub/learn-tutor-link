import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useActiveCampaigns, useDismissCampaign } from '@/hooks/useCampaigns';

export function CampaignBanner() {
  const { data: campaigns } = useActiveCampaigns();
  const dismiss = useDismissCampaign();
  const nav = useNavigate();
  const c = campaigns?.[0];
  if (!c) return null;

  const goCta = () => {
    if (!c.cta_url) return;
    if (c.cta_url.startsWith('http')) window.open(c.cta_url, '_blank');
    else nav(c.cta_url);
  };

  return (
    <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-r from-primary/10 via-background to-background p-3">
      <button
        onClick={() => dismiss.mutate(c.id)}
        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex gap-3 items-start pr-6">
        {c.image_url ? (
          <img src={c.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{c.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.body}</p>
          {c.cta_label && c.cta_url && (
            <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={goCta}>
              {c.cta_label}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
