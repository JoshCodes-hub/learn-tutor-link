import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppScreen } from "@/components/app-shell/AppScreen";
import { ReadinessRing } from "@/components/student/ReadinessRing";
import { AIQuizRecommendations } from "@/components/student/AIQuizRecommendations";
import { ExamGoalDialog } from "@/components/student/ExamGoalDialog";
import { WeeklyPlanCard } from "@/components/student/WeeklyPlanCard";
import { useExamGoal } from "@/hooks/useExamGoal";
import { saveOfflineSet } from "@/lib/offlineQuizStore";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Download,
  Flame,
  Gauge,
  Loader2,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Zap,
} from "lucide-react";

interface AttemptRow {
  id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  completed_at: string | null;
  started_at: string;
  quiz_id: string;
}

interface CourseAccuracy {
  course: string;
  attempted: number;
  correct: number;
  accuracy: number;
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export default function ExamReadiness() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [courseStats, setCourseStats] = useState<CourseAccuracy[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [goalOpen, setGoalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { goal } = useExamGoal();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const [{ data: atts }, { data: streakRow }] = await Promise.all([
        supabase
          .from("quiz_attempts")
          .select("id,score,total_questions,correct_answers,completed_at,started_at,quiz_id")
          .eq("user_id", user.id)
          .gte("started_at", since.toISOString())
          .order("started_at", { ascending: false }),
        supabase.from("study_streaks" as any).select("current_streak").eq("user_id", user.id).maybeSingle(),
      ]);

      setAttempts((atts as AttemptRow[]) || []);
      setStreak((streakRow as any)?.current_streak ?? 0);

      // Compute per-course accuracy from a richer join
      const { data: ans2 } = await supabase
        .from("quiz_answers")
        .select("is_correct, questions!inner(courses:course_id(name))")
        .in("attempt_id", (atts || []).map((a) => a.id));

      const map = new Map<string, { attempted: number; correct: number }>();
      (ans2 || []).forEach((row: any) => {
        const name = row.questions?.courses?.name || "General";
        const cur = map.get(name) || { attempted: 0, correct: 0 };
        cur.attempted += 1;
        if (row.is_correct) cur.correct += 1;
        map.set(name, cur);
      });
      const stats: CourseAccuracy[] = Array.from(map.entries()).map(([course, v]) => ({
        course,
        attempted: v.attempted,
        correct: v.correct,
        accuracy: v.attempted ? Math.round((v.correct / v.attempted) * 100) : 0,
      })).sort((a, b) => b.attempted - a.attempted);
      setCourseStats(stats);
      setLoading(false);
    })();
  }, [user]);

  const last7 = useMemo(() => {
    const buckets: { key: string; label: string; avg: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets.push({ key: dayKey(d), label: d.toLocaleDateString(undefined, { weekday: "short" })[0], avg: 0, count: 0 });
    }
    const byDay = new Map(buckets.map((b) => [b.key, b]));
    attempts.filter((a) => a.completed_at).forEach((a) => {
      const k = dayKey(new Date(a.completed_at!));
      const b = byDay.get(k);
      if (b) {
        b.avg = (b.avg * b.count + a.score) / (b.count + 1);
        b.count += 1;
      }
    });
    return buckets;
  }, [attempts]);

  const completedCount = attempts.filter((a) => a.completed_at).length;
  const avgScore = completedCount
    ? Math.round(attempts.filter((a) => a.completed_at).reduce((s, a) => s + a.score, 0) / completedCount)
    : 0;
  const totalMinutes = Math.round(
    attempts.reduce((s, a) => s + (a.completed_at ? (new Date(a.completed_at).getTime() - new Date(a.started_at).getTime()) / 60000 : 0), 0)
  );

  const weakest = courseStats.filter((c) => c.attempted >= 3).slice().sort((a, b) => a.accuracy - b.accuracy)[0];
  const strongest = courseStats.filter((c) => c.attempted >= 3).slice().sort((a, b) => b.accuracy - a.accuracy)[0];

  // Attempts in the last 7 calendar days for weekly plan progress
  const weeklyCompleted = attempts.filter((a) => {
    if (!a.completed_at) return false;
    const t = new Date(a.completed_at).getTime();
    return t >= Date.now() - 7 * 86400000;
  }).length;

  const downloadRecommended = async () => {
    if (!user) return;
    setDownloading(true);
    try {
      // Pick a quiz: weakest course active quiz, fall back to any active quiz
      let quizQuery = supabase.from("quizzes").select("id, title, course_id, courses:course_id(name)").eq("is_active", true).limit(1);
      if (weakest) {
        const { data: courseRow } = await supabase.from("courses").select("id").eq("name", weakest.course).maybeSingle();
        if (courseRow?.id) quizQuery = supabase.from("quizzes").select("id, title, course_id, courses:course_id(name)").eq("is_active", true).eq("course_id", courseRow.id).limit(1);
      }
      const { data: quizzes } = await quizQuery;
      const quiz = quizzes?.[0] as any;
      if (!quiz) { toast({ title: "No quiz to download yet", variant: "destructive" }); return; }

      const { data: qq } = await supabase
        .from("quiz_questions")
        .select("question_id, order_index, questions:question_id(id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, image_url)")
        .eq("quiz_id", quiz.id)
        .order("order_index");

      const questions = (qq || []).map((r: any) => ({
        id: r.questions.id,
        question_text: r.questions.question_text,
        option_a: r.questions.option_a,
        option_b: r.questions.option_b,
        option_c: r.questions.option_c,
        option_d: r.questions.option_d,
        correct_option: r.questions.correct_option,
        explanation: r.questions.explanation,
        image_url: r.questions.image_url,
        course_name: quiz.courses?.name || null,
      }));

      if (!questions.length) { toast({ title: "Quiz has no questions yet", variant: "destructive" }); return; }

      await saveOfflineSet(
        {
          id: `set_${Date.now()}`,
          title: quiz.title,
          source: weakest ? "weak-area" : "recommended",
          course_name: quiz.courses?.name || null,
          question_count: questions.length,
          downloaded_at: Date.now(),
          user_id: user.id,
        },
        questions
      );
      toast({ title: "Saved offline ✅", description: `${quiz.title} is ready to practice without network.` });
    } catch (e: any) {
      toast({ title: "Download failed", description: e?.message || "Please try again", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const verdict =
    avgScore >= 75 ? { label: "Exam Ready", color: "text-emerald-500", icon: CheckCircle2 }
    : avgScore >= 50 ? { label: "Building Up", color: "text-amber-500", icon: TrendingUp }
    : { label: "Needs Practice", color: "text-rose-500", icon: AlertTriangle };
  const VerdictIcon = verdict.icon;

  return (
    <AppScreen
      title="Exam Readiness"
      subtitle="Your AI-powered prep snapshot"
      back
      right={
        <Badge variant="outline" className="gap-1 border-primary/30">
          <Sparkles className="w-3 h-3 text-primary" /> AI
        </Badge>
      }
    >
      <div className="space-y-5 max-w-3xl mx-auto pb-8">
        {/* Hero verdict + readiness ring */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-accent/10 p-5"
        >
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/20 blur-3xl" aria-hidden />
          <div className="relative flex items-center gap-2 mb-3">
            <VerdictIcon className={`w-4 h-4 ${verdict.color}`} />
            <span className={`text-xs font-semibold uppercase tracking-wider ${verdict.color}`}>{verdict.label}</span>
          </div>
          <ReadinessRing />
        </motion.div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatTile icon={Activity} label="Avg Score" value={`${avgScore}%`} accent="text-primary" />
          <StatTile icon={Flame} label="Streak" value={`${streak}d`} accent="text-amber-500" />
          <StatTile icon={Timer} label="Practice" value={`${totalMinutes}m`} accent="text-emerald-500" />
        </div>

        {/* Weekly plan from exam goal */}
        <WeeklyPlanCard
          goal={goal}
          currentScore={avgScore}
          weeklyCompleted={weeklyCompleted}
          onSetGoal={() => setGoalOpen(true)}
        />
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="font-display font-semibold">7-Day Momentum</h3>
            </div>
            <span className="text-xs text-muted-foreground">{completedCount} attempts · 30d</span>
          </div>
          <div className="flex items-end justify-between gap-2 h-28">
            {last7.map((b, i) => {
              const h = b.count ? Math.max(8, Math.round(b.avg)) : 4;
              return (
                <div key={b.key} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end h-24">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: i * 0.04, type: "spring", stiffness: 120 }}
                      className={`w-full rounded-t-md ${b.count ? "bg-gradient-to-t from-primary to-accent" : "bg-muted"}`}
                      title={b.count ? `${Math.round(b.avg)}% avg · ${b.count} quiz` : "No practice"}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{b.label}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Strength & weakness */}
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!weakest}
            onClick={() => weakest && navigate(`/student/weak/${encodeURIComponent(weakest.course)}`)}
            className="text-left p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 transition-all hover:border-rose-500/40 active:scale-[0.98] disabled:opacity-100 disabled:cursor-default"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h4 className="text-sm font-semibold">Weakest Area</h4>
              </div>
              {weakest && <ArrowRight className="w-4 h-4 text-rose-500/70" />}
            </div>
            {weakest ? (
              <>
                <p className="font-display text-lg font-semibold leading-tight">{weakest.course}</p>
                <p className="text-xs text-muted-foreground mt-1">{weakest.accuracy}% accuracy across {weakest.attempted} questions</p>
                <p className="text-[11px] text-rose-600 mt-2 font-medium">Tap to review wrong answers →</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Take a few more quizzes to surface weak areas.</p>
            )}
          </button>
          <Card className="p-4 border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-emerald-500" />
              <h4 className="text-sm font-semibold">Strongest Area</h4>
            </div>
            {strongest ? (
              <>
                <p className="font-display text-lg font-semibold leading-tight">{strongest.course}</p>
                <p className="text-xs text-muted-foreground mt-1">{strongest.accuracy}% accuracy — keep it sharp</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Your strengths will appear once we have more data.</p>
            )}
          </Card>
        </div>

        {/* Next CBT actions */}
        <Card className="p-5 bg-gradient-to-br from-card to-muted/30">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-primary" />
            <h3 className="font-display font-semibold">Next CBT Practice</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <ActionTile
              title="Full CBT Simulation"
              desc="Timed mock under exam conditions"
              icon={Timer}
              onClick={() => navigate("/study-hub")}
            />
            <ActionTile
              title="Target Weak Topics"
              desc={weakest ? `Drill ${weakest.course}` : "Auto-pick based on your gaps"}
              icon={Brain}
              onClick={() => weakest ? navigate(`/student/weak/${encodeURIComponent(weakest.course)}`) : navigate("/study-hub")}
              highlight
            />
            <ActionTile
              title="Mastery Breakdown"
              desc="Concept vs speed gaps per course"
              icon={Gauge}
              onClick={() => navigate("/student/mastery")}
            />
            <ActionTile
              title={downloading ? "Downloading…" : "Download for Offline"}
              desc={weakest ? `Save a ${weakest.course} set` : "Save a recommended set to your device"}
              icon={downloading ? Loader2 : Download}
              onClick={() => !downloading && downloadRecommended()}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 text-xs"
            onClick={() => navigate("/student/offline")}
          >
            View saved offline sets <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Card>

        {/* AI recommendations */}
        {user && (
          <AIQuizRecommendations
            userId={user.id}
            onSelectQuiz={(id) => navigate(`/quiz/${id}`)}
            onPurchaseQuiz={(id) => navigate(`/quiz/${id}`)}
          />
        )}

        {loading && <p className="text-center text-xs text-muted-foreground">Loading your insights…</p>}
      </div>

      <ExamGoalDialog open={goalOpen} onOpenChange={setGoalOpen} />
    </AppScreen>
  );
}

function StatTile({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  return (
    <Card className="p-3 flex flex-col items-center justify-center text-center">
      <Icon className={`w-4 h-4 mb-1 ${accent}`} />
      <span className="font-display text-xl font-bold leading-none">{value}</span>
      <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{label}</span>
    </Card>
  );
}

function ActionTile({ title, desc, icon: Icon, onClick, highlight }: { title: string; desc: string; icon: any; onClick: () => void; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`group text-left p-4 rounded-2xl border transition-all active:scale-[0.98] ${
        highlight
          ? "border-primary/40 bg-gradient-to-br from-primary/10 to-accent/10 hover:border-primary/60"
          : "border-border bg-card hover:border-primary/30"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${highlight ? "bg-primary/20" : "bg-muted"}`}>
          <Icon className={`w-4 h-4 ${highlight ? "text-primary" : "text-foreground"}`} />
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
      </div>
      <p className="font-semibold text-sm leading-tight">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </button>
  );
}
