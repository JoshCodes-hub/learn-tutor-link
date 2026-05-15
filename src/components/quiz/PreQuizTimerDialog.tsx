import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Clock, Sparkles, Infinity as InfinityIcon } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Tutor's recommended duration in minutes (0/falsy = none set) */
  tutorMinutes?: number;
  /** Called with chosen minutes; 0 means untimed. */
  onConfirm: (minutes: number) => void;
}

type Mode = "tutor" | "custom" | "none";

export const PreQuizTimerDialog = ({ open, onOpenChange, tutorMinutes = 0, onConfirm }: Props) => {
  const [mode, setMode] = useState<Mode>(tutorMinutes > 0 ? "tutor" : "custom");
  const [custom, setCustom] = useState<string>(String(tutorMinutes || 15));

  useEffect(() => {
    if (open) {
      setMode(tutorMinutes > 0 ? "tutor" : "custom");
      setCustom(String(tutorMinutes || 15));
    }
  }, [open, tutorMinutes]);

  const confirm = () => {
    let mins = 0;
    if (mode === "tutor") mins = tutorMinutes;
    else if (mode === "custom") mins = Math.max(1, Math.min(300, Number(custom) || 0));
    else mins = 0;
    onConfirm(mins);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Set your timer
          </DialogTitle>
          <DialogDescription>
            Pick how long you want to take. You can also go untimed for relaxed practice.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="space-y-2">
          {tutorMinutes > 0 && (
            <Label htmlFor="t-tutor" className="flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="tutor" id="t-tutor" />
              <Sparkles className="w-4 h-4 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Use tutor's time</p>
                <p className="text-xs text-muted-foreground">{tutorMinutes} minutes — recommended by your tutor</p>
              </div>
            </Label>
          )}
          <Label htmlFor="t-custom" className="flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/50">
            <RadioGroupItem value="custom" id="t-custom" />
            <Clock className="w-4 h-4 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Set my own time</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Input
                  type="number" min={1} max={300} value={custom}
                  onChange={(e) => { setCustom(e.target.value); setMode("custom"); }}
                  className="h-8 w-20"
                />
                <span className="text-xs text-muted-foreground">minutes</span>
              </div>
            </div>
          </Label>
          <Label htmlFor="t-none" className="flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/50">
            <RadioGroupItem value="none" id="t-none" />
            <InfinityIcon className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-semibold">No timer</p>
              <p className="text-xs text-muted-foreground">Take as long as you need.</p>
            </div>
          </Label>
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={confirm}>Start quiz</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreQuizTimerDialog;