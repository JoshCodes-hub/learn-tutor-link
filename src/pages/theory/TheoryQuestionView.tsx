import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { ArrowLeft, Save, Sparkles, Send, Loader2, Calendar, Wand2 } from "lucide-react";
import { AIFeedbackPanel, TheoryEvaluation } from "@/components/theory/AIFeedbackPanel";
import { ImproveAnswerPanel, AnswerImprovement } from "@/components/theory/ImproveAnswerPanel";
import { IdealAnswerDialog } from "@/components/theory/IdealAnswerDialog";
import { SEO } from "@/components/seo/SEO";

interface TheoryQ {
  id: string;
  course_id: string;
  question_text: string;
  model_answer: string | null;
  key_points: any;
  difficulty: string;
  marks: number;
  year: number | null;
}

const TheoryQuestionView = () => {
  const { questionId } = useParams<{ questionId: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<TheoryQ | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"draft" | "submitted">("draft");
  const [evaluation, setEvaluation] = useState<TheoryEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showIdeal, setShowIdeal] = useState(false);
  const [improving, setImproving] = useState(false);
  const [improvement, setImprovement] = useState<AnswerImprovement | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // Load question + existing attempt
  useEffect(() => {
    if (!questionId || !user) return;
    (async () => {
      const { data: q } = await supabase.from("theory_questions").select("*").eq("id", questionId).single();
      if (!q) {
        toast.error("Question not found");
        setLoading(false);
        return;
      }
      setQuestion(q as TheoryQ);

      const { data: existing } = await supabase
        .from("theory_attempts")
        .select("*")
        .eq("question_id", questionId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        setAttemptId(existing.id);
        setAnswer(existing.answer_text || "");
        setStatus(existing.status as "draft" | "submitted");
        if (existing.ai_feedback) setEvaluation(existing.ai_feedback as unknown as TheoryEvaluation);
      } else {
        const { data: created } = await supabase
          .from("theory_attempts")
          .insert({ user_id: user.id, question_id: questionId, answer_text: "", status: "draft" })
          .select()
          .single();
        if (created) setAttemptId(created.id);
      }
      setLoading(false);
    })();
  }, [questionId, user]);

  // Autosave debounced
  useEffect(() => {
    if (!attemptId || status === "submitted" || loading) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      const { error } = await supabase.from("theory_attempts").update({ answer_text: answer }).eq("id", attemptId);
      setSaving(false);
      if (!error) setLastSavedAt(new Date());
    }, 1500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [answer, attemptId, status, loading]);

  const handleSubmit = async () => {
    if (!attemptId || !question) return;
    if (answer.trim().length < 30) {
      toast.error("Write a more substantial answer before submitting (at least 30 chars).");
      return;
    }
    setSubmitting(true);
    try {
      // Save final answer
      await supabase.from("theory_attempts").update({ answer_text: answer }).eq("id", attemptId);

      const { data, error } = await supabase.functions.invoke("evaluate-theory-answer", {
        body: {
          question: question.question_text,
          model_answer: question.model_answer,
          key_points: Array.isArray(question.key_points) ? question.key_points : [],
          student_answer: answer,
          marks: question.marks,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const evalResult: TheoryEvaluation = data.evaluation;
      await supabase
        .from("theory_attempts")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
          ai_score: evalResult.score,
          ai_feedback: evalResult as any,
        })
        .eq("id", attemptId);

      setEvaluation(evalResult);
      setStatus("submitted");
      toast.success(`Answer submitted! Score: ${evalResult.score}/100`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to evaluate");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async () => {
    if (!user || !questionId) return;
    setEvaluation(null);
    setImprovement(null);
    setStatus("draft");
    setAnswer("");
    const { data: created } = await supabase
      .from("theory_attempts")
      .insert({ user_id: user.id, question_id: questionId, answer_text: "", status: "draft" })
      .select()
      .single();
    if (created) setAttemptId(created.id);
  };

  const handleImprove = async () => {
    if (!question || answer.trim().length < 30) {
      toast.error("Write at least 30 characters before requesting an improvement.");
      return;
    }
    setImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke("improve-theory-answer", {
        body: {
          question: question.question_text,
          model_answer: question.model_answer,
          key_points: Array.isArray(question.key_points) ? question.key_points : [],
          student_answer: answer,
          marks: question.marks,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setImprovement(data.improvement as AnswerImprovement);
      toast.success("Improvement ready");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to improve answer");
    } finally {
      setImproving(false);
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen bg-background"><Navbar /><div className="flex justify-center pt-32"><LoadingSpinner /></div></div>;
  }
  if (!question) {
    return <div className="min-h-screen bg-background"><Navbar /><div className="container pt-24 text-center">Question not found.</div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Theory Question | OverraPrep AI" description="Answer a written exam question and get AI feedback." />
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to={`/theory/${question.course_id}`}><ArrowLeft className="w-4 h-4" /> Back to Course</Link>
        </Button>

        <Card className="glass-card mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <CardTitle className="font-display text-xl flex-1">Theory Question</CardTitle>
              <div className="flex gap-2">
                <Badge variant="secondary">{question.marks} marks</Badge>
                <Badge variant="outline" className="capitalize">{question.difficulty}</Badge>
                {question.year && <Badge variant="outline"><Calendar className="w-3 h-3 mr-1" />{question.year}</Badge>}
              </div>
            </div>
            <CardDescription className="text-base text-foreground whitespace-pre-wrap pt-2 leading-relaxed">
              {question.question_text}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="glass-card mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-display">Your Answer</CardTitle>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              {saving ? (<><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>) :
                lastSavedAt ? (<><Save className="w-3 h-3" /> Saved {lastSavedAt.toLocaleTimeString()}</>) :
                  status === "submitted" ? "Submitted" : "Auto-saves as you type"}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Write your answer here. Structure it clearly: introduction, body, conclusion."
              className="min-h-[300px] font-sans text-base leading-relaxed"
              disabled={status === "submitted" || submitting}
            />
            <div className="flex flex-wrap gap-2 justify-between items-center">
              <div className="text-xs text-muted-foreground">{answer.length} characters · {answer.trim().split(/\s+/).filter(Boolean).length} words</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowIdeal(true)} disabled={submitting}>
                  <Sparkles className="w-4 h-4" /> Show Ideal Answer
                </Button>
                {status === "draft" ? (
                  <Button onClick={handleSubmit} disabled={submitting || answer.trim().length < 30}>
                    {submitting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Evaluating...</>) : (<><Send className="w-4 h-4" /> Submit for AI Grading</>)}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleRetry}>Try Again</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {evaluation && <AIFeedbackPanel evaluation={evaluation} />}

        <IdealAnswerDialog open={showIdeal} onOpenChange={setShowIdeal} question={question.question_text} marks={question.marks} />
      </main>
    </div>
  );
};

export default TheoryQuestionView;
