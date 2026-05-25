import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reason?: string | null;
}

const PERKS = [
  "Unlimited AI Study Packs",
  "Unlimited Audio Lessons",
  "Advanced Quizzes & Analytics",
  "Premium Tutor Content",
  "Offline Smart Storage",
];

export const UpgradeModal = ({ open, onOpenChange, reason }: Props) => {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Unlock Premium
          </DialogTitle>
          <DialogDescription>
            {reason || "You've reached today's free limit. Upgrade to keep learning without interruptions."}
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 my-2">
          {PERKS.map((p) => (
            <li key={p} className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700"
            onClick={() => { onOpenChange(false); navigate("/subscription"); }}
          >
            View plans
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
