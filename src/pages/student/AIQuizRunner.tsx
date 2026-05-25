import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getResourceSignedUrl } from "@/lib/userResources";
import AppScreen from "@/components/app-shell/AppScreen";
import { SEO } from "@/components/seo/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, ArrowLeft, ArrowRight, RotateCcw, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuizQuestion {
  question: string;
  options: string[];
  answer: number | string; // index or letter or text
  explanation?: string;
}

function normalizeAnswerIdx(q: QuizQuestion): number {
  if (typeof q.answer === "number") return q.answer;
  const s = String(q.answer).trim();
  if (/^[a-z]$/i.test(s)) return s.toLowerCase().charCodeAt(0) - 97;
  const idx = q.options?.findIndex((o) => o.trim().toLowerCase() === s.toLowerCase());
  return idx >= 0 ? idx : 0;
}

const AIQuizRunner = () => {
  const { resourceId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resourceTitle, setResourceTitle] = useState("Practice quiz");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [reviewMode, setReviewMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!resourceId || !user) return;
      setLoading(true);
      try {
        const { data: r, error: rErr } = await supabase
          .from("user_resources")
          .select("id, title, storage_path, meta")
          .eq("id", resourceId)
          .maybeSingle();
        if (rErr) throw rErr;
        if (!r) throw new Error("Quiz not found");
        setResourceTitle(r.title);
        const url = await getResourceSignedUrl((r as any).storage_path, 600);
        if (!url) throw new Error("Could not open quiz file");
        const res = await fetch(url);
        const json = await res.json();
        const qs: QuizQuestion[] = (json?.questions || []).filter((q: any) => q?.question && Array.isArray(q?.options));
        if (!qs.length) throw new Error("No questions in this quiz");
        if (cancelled) return;
        setQuestions(qs);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load quiz");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [resourceId, user]);

  const current = questions[idx];
  const total = questions.length;
  const answeredCount = Object.keys(picks).length;
  const score = useMemo(() => {
    let s = 0;
    questions.forEach((q, i) => {
      const correct = normalizeAnswerIdx(q);
      if (picks[i] === correct) s++;
    });
    return s;
  }, [picks, questions]);

  const choose = (i: number) => {
    if (revealed[idx]) return;
    setPicks((p) => ({ ...p, [idx]: i }));
    setRevealed((r) => ({ ...r, [idx]: true }));
  };

  const submit = async () => {
    setReviewMode(true);
    // Record an attempt against the AI quiz so readiness picks it up.
    try {
      if (user) {
        await supabase.from("quiz_attempts").insert({
          user_id: user.id,
          quiz_id: null,
          score,
          total_questions: total,
          completed_at: new Date().toISOString(),
          metadata: { source: "ai_resource", resource_id: resourceId, title: resourceTitle },
        } as never);
      }
    } catch (e) {
      console.warn("attempt log failed", e);
    }
    toast.success(`You scored ${score}/${total}`);
  };

  const restart = () => {
    setPicks({}); setRevealed({}); setReviewMode(false); setIdx(0);
  };

  if (loading) {
    return (
      <AppScreen title="Loading quiz">
        <div className="py-12 text-center text-sm text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Preparing your AI quiz…</div>
      </AppScreen>
    );
  }
  if (error) {
    return (
      <AppScreen title="Quiz unavailable">
        <Card className="p-6 text-center max-w-md mx-auto">
          <XCircle className="w-7 h-7 text-destructive mx-auto mb-2" />
          <p className="text-sm">{error}</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate("/library")}>Back to Library</Button>
        </Card>
      </AppScreen>
    );
  }

  // ===== Review mode (all questions, answers + explanations) =====
  if (reviewMode) {
    return (
      <>
        <SEO title={`Review — ${resourceTitle}`} noindex />
        <AppScreen title="Review" subtitle={`${score}/${total} correct (${Math.round((score / total) * 100)}%)`}>
          <div className="max-w-2xl mx-auto space-y-4 pb-10">
            <Card className="p-4 bg-gradient-to-br from-amber-50 to-white border-amber-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-semibold">{resourceTitle}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Tap any question to revisit. Your attempt has been saved and will lift your Exam Readiness score.</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={restart}><RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Restart</Button>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => navigate("/library")}>Back to Library</Button>
              </div>
            </Card>

            {questions.map((q, i) => {
              const correct = normalizeAnswerIdx(q);
              const picked = picks[i];
              const isRight = picked === correct;
              return (
                <Card key={i} className="p-4">
                  <div className="flex items-start gap-2 mb-2">
                    {isRight ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> : <XCircle className="w-4 h-4 text-destructive mt-0.5" />}
                    <p className="text-sm font-semibold flex-1">Q{i + 1}. {q.question}</p>
                  </div>
                  <ul className="space-y-1.5 ml-6">
                    {q.options.map((opt, oi) => (
                      <li
                        key={oi}
                        className={cn(
                          "text-sm px-3 py-1.5 rounded-md border",
                          oi === correct && "bg-emerald-50 border-emerald-200 text-emerald-900",
                          oi === picked && oi !== correct && "bg-rose-50 border-rose-200 text-rose-900",
                          oi !== correct && oi !== picked && "border-transparent text-muted-foreground",
                        )}
                      >
                        <span className="font-bold mr-2">{String.fromCharCode(65 + oi)}.</span>{opt}
                      </li>
                    ))}
                  </ul>
                  {q.explanation && (
                    <div className="mt-3 ml-6 p-2.5 rounded-md bg-sky-50 border border-sky-100">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-sky-700 mb-1">Explanation</p>
                      <p className="text-xs text-sky-900 leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </AppScreen>
      </>
    );
  }

  // ===== Question mode =====
  const correctIdx = normalizeAnswerIdx(current);
  const picked = picks[idx];
  const isRevealed = revealed[idx];

  return (
    <>
      <SEO title={resourceTitle} noindex />
      <AppScreen title={resourceTitle} subtitle={`Question ${idx + 1} of ${total}`}>
        <div className="max-w-xl mx-auto pb-10">
          <Progress value={((idx + 1) / total) * 100} className="h-1.5 mb-4" />

          <Card className="p-4">
            <Badge className="mb-2 bg-violet-500/15 text-violet-700 hover:bg-violet-500/15 border-0 text-[10px]">Question</Badge>
            <p className="text-base font-semibold leading-snug">{current.question}</p>

            <div className="mt-4 space-y-2">
              {current.options.map((opt, oi) => {
                const isCorrect = oi === correctIdx;
                const isPicked = oi === picked;
                return (
                  <button
                    key={oi}
                    onClick={() => choose(oi)}
                    disabled={isRevealed}
                    className={cn(
                      "w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-colors",
                      !isRevealed && "hover:border-amber-300 hover:bg-amber-50/40",
                      isRevealed && isCorrect && "bg-emerald-50 border-emerald-300 text-emerald-900",
                      isRevealed && isPicked && !isCorrect && "bg-rose-50 border-rose-300 text-rose-900",
                      isRevealed && !isCorrect && !isPicked && "opacity-60",
                    )}
                  >
                    <span className="font-bold mr-2">{String.fromCharCode(65 + oi)}.</span>{opt}
                  </button>
                );
              })}
            </div>

            {isRevealed && (
              <div className="mt-4 p-3 rounded-md bg-sky-50 border border-sky-100">
                <p className="text-[11px] font-bold uppercase tracking-wide text-sky-700 mb-1">
                  {picked === correctIdx ? "Correct" : "Correct answer"}
                </p>
                <p className="text-sm text-sky-900 font-semibold">{String.fromCharCode(65 + correctIdx)}. {current.options[correctIdx]}</p>
                {current.explanation && (
                  <p className="text-xs text-sky-900 mt-2 leading-relaxed">{current.explanation}</p>
                )}
              </div>
            )}
          </Card>

          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="outline" size="sm" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Prev
            </Button>
            <p className="text-xs text-muted-foreground">{answeredCount}/{total} answered</p>
            {idx < total - 1 ? (
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" disabled={!isRevealed} onClick={() => setIdx(idx + 1)}>
                Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" disabled={answeredCount < total} onClick={submit}>
                Finish
              </Button>
            )}
          </div>
        </div>
      </AppScreen>
    </>
  );
};

export default AIQuizRunner;