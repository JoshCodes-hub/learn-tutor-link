import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CalendarDays, Flag, Target } from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import type { ExamGoal } from "@/hooks/useExamGoal";

interface Props {
  goal: ExamGoal | null;
  currentScore: number;
  weeklyCompleted: number; // attempts in last 7 days
  onSetGoal: () => void;
}

export function WeeklyPlanCard({ goal, currentScore, weeklyCompleted, onSetGoal }: Props) {
  const computed = useMemo(() => {
    if (!goal) return null;
    const target = new Date(goal.target_date);
    const daysLeft = Math.max(0, differenceInCalendarDays(target, new Date()));
    const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7));
    const gap = Math.max(0, goal.target_score - currentScore);
    const recWeekly = Math.max(goal.weekly_quiz_target, Math.ceil(gap / 4) + 3); // +3 baseline, +1 quiz per 4pt gap
    const dailyMinutes = Math.round((recWeekly * 25) / 7);
    const onTrack = weeklyCompleted >= goal.weekly_quiz_target;
    return { daysLeft, weeksLeft, gap, recWeekly, dailyMinutes, onTrack, target };
  }, [goal, currentScore, weeklyCompleted]);

  if (!goal || !computed) {
    return (
      <Card className="p-5 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-semibold leading-tight">Set your exam goal</h3>
            <p className="text-xs text-muted-foreground mt-1">Pick a target date and we'll build a weekly CBT plan to get you there.</p>
            <Button onClick={onSetGoal} size="sm" className="mt-3">
              <Flag className="w-3.5 h-3.5 mr-1.5" /> Pick a target
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const progress = Math.min(100, Math.round((weeklyCompleted / computed.recWeekly) * 100));

  return (
    <Card className="p-5 bg-gradient-to-br from-primary/8 via-card to-accent/8 border-primary/20">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h3 className="font-display font-semibold">Your Weekly Plan</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {goal.exam_label || "Exam"} · {format(computed.target, "MMM d")} · {computed.daysLeft}d left
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onSetGoal} className="text-xs">Edit</Button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label="Target" value={`${goal.target_score}%`} />
        <Stat label="Now" value={`${currentScore}%`} accent={currentScore >= goal.target_score ? "text-emerald-500" : undefined} />
        <Stat label="Gap" value={`${computed.gap}pt`} accent={computed.gap === 0 ? "text-emerald-500" : "text-amber-500"} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">This week's CBT progress</span>
          <span className="font-semibold">{weeklyCompleted} / {computed.recWeekly}</span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-[11px] text-muted-foreground mt-2">
          AI plan: <span className="font-medium text-foreground">{computed.recWeekly} quizzes/week</span> · ~{computed.dailyMinutes} min/day · {computed.weeksLeft} weeks to exam
        </p>
      </div>
    </Card>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-background/60 rounded-xl p-2 text-center">
      <div className={`font-display text-lg font-bold leading-none ${accent || ""}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
