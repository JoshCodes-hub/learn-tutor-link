import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Clock, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { loadExamQuestions, useSubmitAttempt, MockExam, MockQuestion } from "@/hooks/useMockExams";
import { SEO } from "@/components/seo/SEO";
import { toast } from "sonner";

const OPTIONS = ["A", "B", "C", "D"] as const;

export default function MockExamTake() {
  const { examId } = useParams<{ examId: string }>();
  const nav = useNavigate();
  const submit = useSubmitAttempt();

  const [exam, setExam] = useState<MockExam | null>(null);
  const [questions, setQuestions] = useState<MockQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [blurCount, setBlurCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (!examId) return;
    setLoading(true);
    loadExamQuestions(examId)
      .then(({ exam, questions }) => {
        if (questions.length === 0) {
          toast.error("No questions available for this exam");
          nav(-1);
          return;
        }
        setExam(exam);
        setQuestions(questions);
        setSecondsLeft(exam.duration_min * 60);
      })
      .catch((e) => { toast.error(e.message); nav(-1); })
      .finally(() => setLoading(false));
  }, [examId, nav]);

  // Timer
  useEffect(() => {
    if (loading || finished) return;
    const t = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { handleSubmit(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, finished]);

  // Tab-blur proctoring
  useEffect(() => {
    if (loading || finished) return;
    const onBlur = () => {
      setBlurCount(c => {
        const next = c + 1;
        toast.warning(`⚠️ Tab switch detected (${next})`, { duration: 2500 });
        return next;
      });
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", () => { if (document.hidden) onBlur(); });
    return () => window.removeEventListener("blur", onBlur);
  }, [loading, finished]);

  const handleSubmit = async () => {
    if (finished || !exam) return;
    setFinished(true);
    try {
      const payload = questions.map(q => ({
        question_id: q.id,
        selected: answers[q.id] ?? "",
        correct: q.correct_option,
        topic_id: q.topic_id,
      }));
      const res = await submit.mutateAsync({
        examId: exam.id,
        answers: payload,
        durationSeconds: Math.round((Date.now() - startedAt.current) / 1000),
        tabBlurCount: blurCount,
      });
      toast.success(`Submitted! Score ${res.score}/${res.total}`);
      nav(`/exams/${exam.id}/result/${res.attemptId}`);
    } catch (e: any) {
      toast.error(e.message || "Submit failed");
      setFinished(false);
    }
  };

  if (loading || !exam) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const q = questions[idx];
  const answered = Object.keys(answers).length;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const lowTime = secondsLeft < 300;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title={`${exam.title} — Exam`} description="In progress" />
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-3 py-2.5 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { if (confirm("Exit exam? Your progress will be lost.")) nav(-1); }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Question {idx + 1} of {questions.length} · {answered} answered</p>
            <Progress value={((idx + 1) / questions.length) * 100} className="h-1 mt-1" />
          </div>
          <div className={`flex items-center gap-1.5 font-mono font-semibold text-sm px-3 py-1.5 rounded-lg ${lowTime ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-muted"}`}>
            <Clock className="w-4 h-4" />
            {minutes}:{seconds.toString().padStart(2, "0")}
          </div>
        </div>
        {blurCount > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200 dark:border-amber-900 px-3 py-1.5 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Tab-switches detected: {blurCount} (logged for review)
          </div>
        )}
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        <div className="rounded-xl border bg-card p-5 mb-4">
          <p className="text-base leading-relaxed whitespace-pre-wrap">{q.question_text}</p>
        </div>
        <div className="space-y-2">
          {OPTIONS.map(opt => {
            const text = (q as any)[`option_${opt.toLowerCase()}`] as string;
            const selected = answers[q.id] === opt;
            return (
              <button
                key={opt}
                onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                className={`w-full text-left rounded-lg border-2 p-3 transition-colors flex items-start gap-3 ${
                  selected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                }`}
              >
                <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  selected ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>{opt}</span>
                <span className="text-sm pt-1">{text}</span>
              </button>
            );
          })}
        </div>
      </main>

      <footer className="border-t bg-card p-3 sticky bottom-0">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={idx === 0} onClick={() => setIdx(i => i - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={idx >= questions.length - 1} onClick={() => setIdx(i => i + 1)} className="flex-1">
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <Button onClick={() => { if (confirm(`Submit now? You answered ${answered}/${questions.length}.`)) handleSubmit(); }} disabled={submit.isPending}>
            {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
