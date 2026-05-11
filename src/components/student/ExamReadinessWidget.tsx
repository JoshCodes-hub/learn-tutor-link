import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, AlertTriangle, ArrowRight, TrendingUp, GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatLevelLabel } from "@/components/shared/LevelSelect";

/**
 * Compact, premium Exam Readiness widget for the dashboard.
 * Score and weak areas are computed from attempts on quizzes/courses
 * matching the student's current level (or any level if not set).
 * Weak-area chips deep-link into the level-aware drill.
 */
export const ExamReadinessWidget = () => {
  const { user, profile } = useAuth();
  const studentLevel = ((profile as any)?.level as string | null | undefined) ?? null;
  const [score, setScore] = useState<number>(0);
  const [weak, setWeak] = useState<{ name: string; courseId: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Pull recent attempts with quiz/course/level info so we can filter by level
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select(
          "score, completed_at, quiz:quizzes!inner(level, course:courses(id, name, level))"
        )
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(60);
      if (cancelled) return;
      const matched = (attempts ?? []).filter((a: any) => {
        if (!studentLevel) return true;
        const qLvl = a.quiz?.level ?? null;
        const cLvl = a.quiz?.course?.level ?? null;
        // Match if quiz/course is level-agnostic OR explicitly tagged for student's level
        return (
          (qLvl === null || qLvl === studentLevel) &&
          (cLvl === null || cLvl === studentLevel)
        );
      });
      const avg = matched.length
        ? Math.round(matched.reduce((s: number, a: any) => s + (a.score || 0), 0) / matched.length)
        : 0;
      // Group by course name, compute average score, lowest 3 = weakest
      const byCourse = new Map<string, { sum: number; n: number; id: string | null }>();
      matched.forEach((a: any) => {
        const name = a.quiz?.course?.name as string | undefined;
        if (!name) return;
        const cur = byCourse.get(name) ?? { sum: 0, n: 0, id: a.quiz?.course?.id ?? null };
        cur.sum += a.score || 0;
        cur.n += 1;
        cur.id = a.quiz?.course?.id ?? cur.id;
        byCourse.set(name, cur);
      });
      const weakList = Array.from(byCourse.entries())
        .map(([name, v]) => ({ name, avg: v.sum / v.n, courseId: v.id }))
        .filter((x) => x.avg < 70)
        .sort((a, b) => a.avg - b.avg)
        .slice(0, 3)
        .map((x) => ({ name: x.name, courseId: x.courseId }));
      if (!cancelled) {
        setScore(avg);
        setWeak(weakList);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, studentLevel]);

  if (loading) {
    return <div className="h-28 mb-5 rounded-2xl bg-amber-50/60 animate-pulse border border-amber-100" />;
  }
  const ringColor =
    score >= 75 ? "stroke-emerald-500" : score >= 50 ? "stroke-amber-500" : "stroke-rose-500";
  const ringBg = "stroke-amber-100";
  const C = 2 * Math.PI * 26;
  const dashOff = C - (score / 100) * C;

  const label =
    score >= 75 ? "On track for success" : score >= 50 ? "Building momentum" : "Needs more practice";

  const lvlQs = studentLevel ? `?level=${encodeURIComponent(studentLevel)}` : "";

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      aria-label="Exam readiness"
      className="mb-5 relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-white via-amber-50/30 to-white p-4 shadow-[0_4px_18px_-8px_rgba(180,140,40,0.25)]"
    >
      <div className="pointer-events-none absolute -top-12 -right-10 h-32 w-32 rounded-full bg-amber-200/30 blur-3xl" />
      <div className="relative flex items-start gap-3">
        <div className="relative w-16 h-16 shrink-0">
          <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
            <circle cx="32" cy="32" r="26" className={ringBg} strokeWidth="6" fill="none" />
            <circle
              cx="32"
              cy="32"
              r="26"
              className={ringColor}
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={dashOff}
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-base font-extrabold leading-none">{score}</span>
            <span className="text-[8px] text-muted-foreground leading-none">/ 100</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <h3 className="font-display text-[14px] font-bold text-foreground">Exam readiness</h3>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9.5px] font-semibold">
              <GraduationCap className="w-2.5 h-2.5" /> {formatLevelLabel(studentLevel)}
            </span>
          </div>
          <p className="text-[11.5px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <TrendingUp className="w-3 h-3" /> {label}
          </p>
          {weak.length > 0 && (
            <div className="mt-2 flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 text-amber-500 mt-1 shrink-0" />
              <div className="flex flex-wrap gap-1">
                {weak.map((t, i) => (
                  <Link
                    key={i}
                    to={`/student/weak/${encodeURIComponent(t.courseId || t.name)}${lvlQs}`}
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10.5px] font-semibold hover:bg-amber-200 transition"
                  >
                    {t.name} <ArrowRight className="w-2.5 h-2.5" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="relative mt-3 flex items-center justify-between">
        <Link
          to={`/student/mastery-breakdown${lvlQs}`}
          className="text-[11.5px] font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
        >
          Full breakdown <ArrowRight className="w-3 h-3" />
        </Link>
        <Link
          to={`/my-courses${lvlQs}`}
          className="text-[11.5px] font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
        >
          Practice {formatLevelLabel(studentLevel)} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </motion.section>
  );
};

export default ExamReadinessWidget;
