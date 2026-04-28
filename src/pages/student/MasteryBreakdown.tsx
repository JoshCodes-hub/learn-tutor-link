import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppScreen } from "@/components/app-shell/AppScreen";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useMasteryBreakdown, MasteryRow } from "@/hooks/useMasteryBreakdown";
import { Brain, Gauge, Play, Sparkles, Trophy, ArrowRight } from "lucide-react";

const GAP_META: Record<MasteryRow["gap_type"], { label: string; tone: string; icon: any; tip: string }> = {
  concept: { label: "Concept gap", tone: "bg-rose-500/15 text-rose-600 border-rose-500/30", icon: Brain, tip: "Review theory, then drill questions slowly." },
  speed: { label: "Speed gap", tone: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: Gauge, tip: "Practice timed sets to build pace." },
  balanced: { label: "Balanced", tone: "bg-primary/15 text-primary border-primary/30", icon: Sparkles, tip: "Keep practicing to push toward mastery." },
  mastered: { label: "Mastered", tone: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: Trophy, tip: "Maintain with a quick refresher weekly." },
};

export default function MasteryBreakdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { rows, loading } = useMasteryBreakdown(user?.id);

  return (
    <AppScreen back title="Mastery Breakdown" subtitle="AI-labeled gaps per course">
      <div className="max-w-3xl mx-auto space-y-3 pb-8">
        {loading && (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        )}

        {!loading && rows.length === 0 && (
          <Card className="p-8 text-center">
            <Brain className="w-10 h-10 mx-auto text-primary mb-2" />
            <p className="font-display text-lg">Not enough data yet</p>
            <p className="text-xs text-muted-foreground mt-1">Complete a few quizzes to unlock per-topic mastery insights.</p>
            <Button onClick={() => navigate("/study-hub")} className="mt-4">Browse quizzes</Button>
          </Card>
        )}

        {rows.map((r) => {
          const meta = GAP_META[r.gap_type];
          const Icon = meta.icon;
          return (
            <Card key={`${r.course_id}-${r.topic_id || "all"}`} className="p-4 space-y-3 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display font-semibold leading-tight truncate">{r.course_name}</h3>
                    <Badge variant="outline" className={`gap-1 ${meta.tone}`}>
                      <Icon className="w-3 h-3" /> {meta.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.attempted} questions · {Math.round(r.avg_time_sec)}s avg
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-2xl font-bold leading-none">{r.accuracy}%</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">accuracy</div>
                </div>
              </div>

              <Progress value={r.accuracy} className="h-1.5" />

              <p className="text-xs text-muted-foreground italic">💡 {meta.tip}</p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/student/weak/${encodeURIComponent(r.course_id)}`)}
                >
                  Review wrong answers
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/study-hub`)}
                >
                  <Play className="w-3.5 h-3.5 mr-1" /> Practice set
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </AppScreen>
  );
}
