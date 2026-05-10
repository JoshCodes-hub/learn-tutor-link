import { useState } from "react";
import { Brain, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { addSrsCard, addSrsCardsBulk } from "@/hooks/useSRS";
import { toast } from "sonner";

type SingleProps = {
  front: string; back: string;
  sourceKind?: string; sourceId?: string | null;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default";
};

export function AddToReviewButton({ front, back, sourceKind = "manual", sourceId, variant = "outline", size = "sm" }: SingleProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <Button
      variant={variant}
      size={size}
      disabled={!user?.id || busy || done}
      onClick={async () => {
        if (!user?.id) return toast.error("Sign in first");
        setBusy(true);
        try {
          await addSrsCard({ userId: user.id, front, back, sourceKind, sourceId });
          setDone(true);
          toast.success("Added to your review queue");
        } catch (e: any) { toast.error(e.message); }
        finally { setBusy(false); }
      }}
    >
      {done ? <Check className="w-3.5 h-3.5 mr-1" /> :
       busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> :
       <Brain className="w-3.5 h-3.5 mr-1" />}
      {done ? "Added" : "Add to Review"}
    </Button>
  );
}

export function AddBulkToReviewButton({ cards, sourceKind = "summary", sourceId }: {
  cards: { front: string; back: string }[];
  sourceKind?: string; sourceId?: string | null;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="default"
      disabled={!user?.id || busy || done || cards.length === 0}
      onClick={async () => {
        if (!user?.id) return;
        setBusy(true);
        try {
          await addSrsCardsBulk(user.id, cards.map(c => ({ ...c, sourceKind, sourceId })));
          setDone(true);
          toast.success(`Added ${cards.length} cards to review queue`);
        } catch (e: any) { toast.error(e.message); }
        finally { setBusy(false); }
      }}
    >
      {done ? <Check className="w-4 h-4 mr-1.5" /> :
       busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> :
       <Brain className="w-4 h-4 mr-1.5" />}
      {done ? "Added to Review" : `Add ${cards.length} to Review`}
    </Button>
  );
}
