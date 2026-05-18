import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ClipboardList, FileText, Layers, Target, CloudDownload } from "lucide-react";
import { listCachedMaterialsByCourse } from "@/lib/offlineLibraryCache";

interface Props {
  courseId: string;
  courseCode: string;
  totalDocs: number;
  totalQuizzes: number;
  totalFlashcards: number;
}

/** Computes per-student progress + a 0–100 exam readiness score for a single course. */
export const CourseProgressCard = ({ courseId, courseCode, totalDocs, totalQuizzes, totalFlashcards }: Props) => {
  const { user } = useAuth();
  const [offlineCount, setOfflineCount] = useState(0);

  useEffect(() => {
    let alive = true;
    listCachedMaterialsByCourse(courseId).then((rows) => { if (alive) setOfflineCount(rows.length); }).catch(() => {});
    return () => { alive = false; };
  }, [courseId]);

  const { data: quizStats } = useQuery({
    queryKey: ["course-progress-quiz", courseId, user?.id],
    enabled: !!user && totalQuizzes > 0,
    queryFn: async () => {
      const { data: quizIds } = await supabase
        .from("quizzes").select("id").eq("course_id", courseId).eq("is_active", true);
      const ids = (quizIds ?? []).map((q: any) => q.id);
      if (ids.length === 0) return { completed: 0, avgScore: 0 };
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("quiz_id, score, total_questions, completed_at")
        .eq("user_id", user!.id)
        .in("quiz_id", ids)
        .not("completed_at", "is", null);
      const seen = new Set<string>();
      let pct = 0; let count = 0;
      for (const a of attempts ?? []) {
        if (seen.has(a.quiz_id)) continue;
        seen.add(a.quiz_id);
        if (a.total_questions > 0) { pct += (a.score / a.total_questions) * 100; count++; }
      }
      return { completed: seen.size, avgScore: count > 0 ? Math.round(pct / count) : 0 };
    },
  });

  const docPct = totalDocs > 0 ? Math.round((Math.min(offlineCount, totalDocs) / totalDocs) * 100) : 0;
  const quizPct = totalQuizzes > 0 ? Math.round(((quizStats?.completed ?? 0) / totalQuizzes) * 100) : 0;
  const cardPct = totalFlashcards > 0 ? 0 : 0; // reserved — review tracker hooks later
  const readiness = useMemo(() => {
    // Weighted blend: 35% docs cached, 50% quiz completion + score, 15% flashcards
    const docs = docPct * 0.35;
    const quiz = ((quizPct + (quizStats?.avgScore ?? 0)) / 2) * 0.50;
    const cards = cardPct * 0.15;
    return Math.min(100, Math.round(docs + quiz + cards));
  }, [docPct, quizPct, cardPct, quizStats]);

  const tone =
    readiness >= 75 ? "text-emerald-600" :
    readiness >= 45 ? "text-amber-600" : "text-rose-600";

  return (
    <Card className="p-4 md:p-5 mb-5 border-amber-100 bg-gradient-to-br from-white via-white to-amber-50/40">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-amber-600" />
          <h2 className="font-display text-base font-semibold">Your progress in {courseCode}</h2>
        </div>
        <Badge variant="outline" className={`text-[11px] ${tone} border-current/40`}>
          <Sparkles className="w-3 h-3 mr-1" /> Exam readiness {readiness}%
        </Badge>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat icon={<FileText className="w-4 h-4 text-sky-600" />} label="Documents saved offline" value={`${offlineCount}/${totalDocs}`} pct={docPct} tone="bg-sky-500" />
        <Stat icon={<ClipboardList className="w-4 h-4 text-violet-600" />} label="Quizzes completed" value={`${quizStats?.completed ?? 0}/${totalQuizzes}`} pct={quizPct} tone="bg-violet-500"
              extra={quizStats && quizStats.completed > 0 ? `avg ${quizStats.avgScore}%` : undefined} />
        <Stat icon={<Layers className="w-4 h-4 text-emerald-600" />} label="Flashcards available" value={`${totalFlashcards}`} pct={Math.min(100, totalFlashcards > 0 ? 100 : 0)} tone="bg-emerald-500" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/library/offline-downloads"><CloudDownload className="w-3.5 h-3.5 mr-1.5" /> Manage offline files</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/ai-history"><Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI history</Link>
        </Button>
      </div>
    </Card>
  );
};

const Stat = ({ icon, label, value, pct, tone, extra }: { icon: React.ReactNode; label: string; value: string; pct: number; tone: string; extra?: string }) => (
  <div className="rounded-lg border bg-white p-3">
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground">{icon} {label}</div>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
    <Progress value={pct} className="mt-2 h-1.5" />
    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
      <span>{pct}%</span>{extra && <span>{extra}</span>}
    </div>
    <div className={`hidden ${tone}`} />
  </div>
);

export default CourseProgressCard;