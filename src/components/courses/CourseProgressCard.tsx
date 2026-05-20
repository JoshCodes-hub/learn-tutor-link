import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Target, CloudDownload } from "lucide-react";
import { computeCourseReadiness } from "@/lib/examReadiness";

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

  const { data } = useQuery({
    queryKey: ["course-readiness", courseId, user?.id, totalDocs, totalQuizzes, totalFlashcards],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: () => computeCourseReadiness({
      userId: user!.id, courseId, totalDocs, totalQuizzes, totalFlashcards,
    }),
  });

  const readiness = data?.score ?? 0;
  const signals = data?.signals ?? [];
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {signals.map((s) => (
          <div key={s.key} className="rounded-lg border bg-white p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-semibold text-foreground">{s.score}%</span>
            </div>
            <Progress value={s.score} className="mt-2 h-1.5" />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>weight {s.weight}%</span>
              {s.detail && <span className="truncate ml-2">{s.detail}</span>}
            </div>
          </div>
        ))}
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

export default CourseProgressCard;