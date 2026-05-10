import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Download } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  title: string;
  score: number;
  total: number;
  subtitle?: string;
  shareUrl?: string;
}

async function makeCard({ title, score, total, subtitle }: Props): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = 1080; c.height = 1350;
  const ctx = c.getContext('2d')!;
  // gold gradient bg
  const g = ctx.createLinearGradient(0, 0, 0, 1350);
  g.addColorStop(0, '#FFF4D2'); g.addColorStop(1, '#E5B92E');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1350);

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(60, 200, 960, 950);

  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 56px Inter, sans-serif';
  ctx.fillText('OverraPrep', 100, 130);
  ctx.font = '600 32px Inter, sans-serif';
  ctx.fillStyle = '#7a5a00';
  ctx.fillText('Study Smart, Not Hard.', 100, 175);

  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 64px Inter, sans-serif';
  wrapText(ctx, title, 110, 320, 880, 76);

  ctx.font = 'bold 220px Inter, sans-serif';
  ctx.fillStyle = '#B8860B';
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  ctx.textAlign = 'center';
  ctx.fillText(`${pct}%`, 540, 760);

  ctx.font = '500 44px Inter, sans-serif';
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText(`${score} / ${total}`, 540, 830);

  if (subtitle) {
    ctx.font = '400 32px Inter, sans-serif';
    ctx.fillStyle = '#5a5a5a';
    ctx.fillText(subtitle, 540, 900);
  }

  ctx.textAlign = 'left';
  ctx.font = '600 28px Inter, sans-serif';
  ctx.fillStyle = '#5a5a5a';
  ctx.fillText('overraprep.app · join me 🏆', 100, 1100);

  return new Promise((res) => c.toBlob((b) => res(b!), 'image/png'));
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y); line = w + ' '; y += lineHeight;
    } else line = test;
  }
  ctx.fillText(line, x, y);
}

export function ShareScoreCard(props: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const share = async () => {
    try {
      const blob = await makeCard(props);
      const file = new File([blob], 'overraprep-score.png', { type: 'image/png' });
      if ((navigator as any).canShare?.({ files: [file] })) {
        await (navigator as any).share({ files: [file], title: props.title, text: `I scored ${props.score}/${props.total} on OverraPrep!`, url: props.shareUrl });
      } else {
        download(blob);
        toast.success('Image downloaded — share it anywhere');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast.error('Could not share');
    }
  };

  const dl = async () => {
    const blob = await makeCard(props);
    download(blob);
  };

  function download(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'overraprep-score.png'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div ref={ref} className="flex gap-2">
      <Button onClick={share} variant="default" size="sm"><Share2 className="w-4 h-4 mr-1" /> Share</Button>
      <Button onClick={dl} variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Save image</Button>
    </div>
  );
}
