import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Target, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useExamGoal } from "@/hooks/useExamGoal";
import { useToast } from "@/hooks/use-toast";

export function ExamGoalDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { goal, saveGoal } = useExamGoal();
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(goal ? new Date(goal.target_date) : undefined);
  const [score, setScore] = useState(goal?.target_score ?? 80);
  const [weekly, setWeekly] = useState(goal?.weekly_quiz_target ?? 5);
  const [label, setLabel] = useState(goal?.exam_label ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!date) {
      toast({ title: "Pick a target date", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await saveGoal({
        target_date: date.toISOString().slice(0, 10),
        target_score: score,
        weekly_quiz_target: weekly,
        exam_label: label,
      });
      toast({ title: "Goal locked in 🎯", description: `Targeting ${score}% by ${format(date, "PPP")}` });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Target className="w-5 h-5 text-primary" /> Set Your Exam Goal
          </DialogTitle>
          <DialogDescription>
            We'll build a weekly CBT plan to hit your readiness score on time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Exam name (optional)</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. PHY 101 Final, FUTA Mid-sem" />
          </div>

          <div className="space-y-2">
            <Label>Target date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Target score</Label>
              <div className="relative">
                <Trophy className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                <Input type="number" min={40} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quizzes / week</Label>
              <Input type="number" min={1} max={30} value={weekly} onChange={(e) => setWeekly(Number(e.target.value))} />
            </div>
          </div>

          <Button onClick={submit} disabled={saving} className="w-full">
            {saving ? "Saving…" : goal ? "Update Goal" : "Create My Plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
