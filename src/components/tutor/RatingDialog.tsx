import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { useRateTutor } from '@/hooks/useTutorStorefront';

export function RatingDialog({ tutorId }: { tutorId: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const rate = useRateTutor();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm"><Star className="w-4 h-4 mr-1"/>Rate</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Rate this tutor</DialogTitle></DialogHeader>
        <div className="flex gap-1 justify-center">
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={() => setRating(n)}>
              <Star className={`w-8 h-8 ${n<=rating?'fill-primary text-primary':'text-muted'}`}/>
            </button>
          ))}
        </div>
        <Textarea placeholder="Optional review…" value={review} onChange={(e) => setReview(e.target.value)} />
        <Button
          disabled={rate.isPending}
          onClick={async () => { await rate.mutateAsync({ tutorId, rating, review }); setOpen(false); }}
        >
          {rate.isPending ? 'Submitting…' : 'Submit Rating'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
