import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Snapshot {
  readiness_score: number;
  weak_topics: any;
  strong_topics: any;
}

export const ReadinessRing = () => {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Try latest stored snapshot first
      const { data: existing } = await supabase
        .from("user_performance_snapshots")
        .select("readiness_score, weak_topics, strong_topics, snapshot_date")
        .eq("user_id", user.id)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        setSnapshot(existing as Snapshot);
        setLoading(false);
        return;
      }

      // Compute from recent attempts on the fly
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("score, total_questions, correct_answers")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(20);

      const avg = attempts && attempts.length
        ? Math.round(attempts.reduce((s, a) => s + (a.score || 0), 0) / attempts.length)
        : 0;
      setSnapshot({ readiness_score: avg, weak_topics: [], strong_topics: [] });
      setLoading(false);
    })();
  }, [user]);

  if (loading || !snapshot) return null;

  const score = snapshot.readiness_score;
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 75 ? "hsl(var(--primary))" :
    score >= 50 ? "hsl(45 90% 55%)" :
    "hsl(0 80% 60%)";

  return (
    <Card className="p-6 bg-card border-border/50">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-display font-semibold">Readiness Score</h3>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative w-32 h-32 shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="52" stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
            <circle
              cx="60" cy="60" r="52"
              stroke={color}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-bold">{score}</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>
        <div className="flex-1 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">
              {score >= 75 ? "On track for success" : score >= 50 ? "Building momentum" : "Needs more practice"}
            </span>
          </div>
          {Array.isArray(snapshot.weak_topics) && snapshot.weak_topics.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {snapshot.weak_topics.slice(0, 3).map((t: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ReadinessRing;
