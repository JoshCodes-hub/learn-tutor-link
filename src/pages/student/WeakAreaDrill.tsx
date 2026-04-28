import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppScreen } from "@/components/app-shell/AppScreen";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Brain, CheckCircle2, Loader2, Sparkles, X } from "lucide-react";

interface WrongQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  selected_option: string | null;
  course_name: string | null;
  attempt_id: string;
}

export default function WeakAreaDrill() {
  const { courseId = "" } = useParams();
  const decoded = decodeURIComponent(courseId);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<WrongQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiText, setAiText] = useState<Record<string, string>>({});
  const [courseName, setCourseName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - 60);

      const { data: atts } = await supabase
        .from("quiz_attempts")
        .select("id")
        .eq("user_id", user.id)
        .gte("started_at", since.toISOString());
      const ids = (atts || []).map((a) => a.id);
      if (!ids.length) { setLoading(false); return; }

      const { data: ans } = await supabase
        .from("quiz_answers")
        .select(`
          selected_option, is_correct, attempt_id,
          questions!inner(id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, course_id, courses:course_id(name))
        `)
        .in("attempt_id", ids)
        .eq("is_correct", false);

      const matched = (ans || []).filter((r: any) => r.questions?.course_id === decoded || r.questions?.courses?.name === decoded);
      const unique = new Map<string, WrongQuestion>();
      matched.forEach((r: any) => {
        const q = r.questions;
        if (!q) return;
        if (!unique.has(q.id)) {
          unique.set(q.id, {
            id: q.id,
            question_text: q.question_text,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_option: q.correct_option,
            explanation: q.explanation,
            selected_option: r.selected_option,
            course_name: q.courses?.name || null,
            attempt_id: r.attempt_id,
          });
          if (!courseName) setCourseName(q.courses?.name || decoded);
        }
      });
      setRows(Array.from(unique.values()));
      setLoading(false);
    })();
  }, [user, decoded, courseName]);

  const askAI = async (q: WrongQuestion) => {
    setAiLoading((m) => ({ ...m, [q.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("ai-explanation", {
        body: {
          question: q.question_text,
          options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
          correctOption: q.correct_option,
          userAnswer: q.selected_option,
        },
      });
      if (error) throw error;
      setAiText((m) => ({ ...m, [q.id]: data?.explanation || "No explanation generated." }));
    } catch (e: any) {
      setAiText((m) => ({ ...m, [q.id]: "Couldn't generate AI explanation right now." }));
    } finally {
      setAiLoading((m) => ({ ...m, [q.id]: false }));
    }
  };

  const optionLabel = (q: WrongQuestion, key: "A" | "B" | "C" | "D") => {
    const text = key === "A" ? q.option_a : key === "B" ? q.option_b : key === "C" ? q.option_c : q.option_d;
    const isCorrect = q.correct_option === key;
    const isPicked = q.selected_option === key;
    return (
      <div
        key={key}
        className={`flex items-start gap-2 p-2.5 rounded-lg text-sm border ${
          isCorrect ? "bg-emerald-500/10 border-emerald-500/30" :
          isPicked ? "bg-rose-500/10 border-rose-500/30" :
          "bg-muted/30 border-transparent"
        }`}
      >
        <span className="font-semibold w-5">{key}.</span>
        <span className="flex-1">{text}</span>
        {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
        {isPicked && !isCorrect && <X className="w-4 h-4 text-rose-500 shrink-0" />}
      </div>
    );
  };

  return (
    <AppScreen back title="Weak Area Drill" subtitle={courseName || decoded}>
      <div className="max-w-3xl mx-auto space-y-4 pb-8">
        <Card className="p-4 bg-rose-500/5 border-rose-500/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <div className="flex-1">
              <p className="font-semibold leading-tight">{rows.length} question{rows.length === 1 ? "" : "s"} you got wrong</p>
              <p className="text-xs text-muted-foreground mt-0.5">Review each one and tap "Explain with AI" for a deeper breakdown.</p>
            </div>
            <Button size="sm" onClick={() => navigate("/student/readiness")}>Back</Button>
          </div>
        </Card>

        {loading && (
          <>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </>
        )}

        {!loading && rows.length === 0 && (
          <Card className="p-8 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
            <p className="font-display text-lg">No wrong answers here 🎉</p>
            <p className="text-xs text-muted-foreground mt-1">You're crushing this area. Try a fresh CBT to challenge yourself.</p>
          </Card>
        )}

        {rows.map((q, i) => (
          <Card key={q.id} className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
              <p className="font-medium text-sm leading-snug flex-1">{q.question_text}</p>
            </div>
            <div className="grid gap-1.5">
              {(["A", "B", "C", "D"] as const).map((k) => optionLabel(q, k))}
            </div>

            {q.explanation && (
              <div className="text-xs bg-muted/40 rounded-lg p-3">
                <span className="font-semibold">Tutor's note:</span> {q.explanation}
              </div>
            )}

            {aiText[q.id] ? (
              <div className="text-sm bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1.5 text-primary">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold uppercase tracking-wider">AI Explanation</span>
                </div>
                <p className="leading-relaxed whitespace-pre-wrap">{aiText[q.id]}</p>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => askAI(q)} disabled={aiLoading[q.id]} className="w-full">
                {aiLoading[q.id] ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Thinking…</> : <><Brain className="w-3.5 h-3.5 mr-1.5" /> Explain with AI</>}
              </Button>
            )}
          </Card>
        ))}
      </div>
    </AppScreen>
  );
}
