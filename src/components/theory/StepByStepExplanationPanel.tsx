import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListChecks, Loader2, CheckCircle2, AlertCircle, Sparkles, Info } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TheoryEvaluation } from "./AIFeedbackPanel";

interface Step {
  title: string;
  explanation: string;
  tag: "strength" | "gap" | "tip" | "info";
}

interface Walkthrough {
  summary: string;
  steps: Step[];
  next_focus: string;
}

interface Props {
  question: string;
  studentAnswer: string;
  modelAnswer: string | null;
  marks: number;
  evaluation: TheoryEvaluation;
}

const tagMeta: Record<Step["tag"], { icon: typeof CheckCircle2; cls: string; label: string }> = {
  strength: { icon: CheckCircle2, cls: "text-primary bg-primary/10 border-primary/20", label: "Strength" },
  gap: { icon: AlertCircle, cls: "text-destructive bg-destructive/10 border-destructive/20", label: "Gap" },
  tip: { icon: Sparkles, cls: "text-amber-600 bg-amber-500/10 border-amber-500/20", label: "Tip" },
  info: { icon: Info, cls: "text-muted-foreground bg-muted/30 border-border", label: "Note" },
};

export const StepByStepExplanationPanel = ({ question, studentAnswer, modelAnswer, marks, evaluation }: Props) => {
  const [loading, setLoading] = useState(false);
  const [walkthrough, setWalkthrough] = useState<Walkthrough | null>(null);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("explain-theory-evaluation", {
        body: { question, student_answer: studentAnswer, model_answer: modelAnswer, marks, evaluation },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setWalkthrough(data.walkthrough as Walkthrough);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate walkthrough");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-primary" /> Step-by-step explanation
        </CardTitle>
        {!walkthrough && (
          <Button size="sm" onClick={generate} disabled={loading}>
            {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Building…</>) : "Walk me through it"}
          </Button>
        )}
      </CardHeader>
      {walkthrough && (
        <CardContent className="space-y-4">
          <p className="text-sm italic text-muted-foreground">{walkthrough.summary}</p>
          <ol className="space-y-3">
            {walkthrough.steps.map((s, i) => {
              const meta = tagMeta[s.tag] ?? tagMeta.info;
              const Icon = meta.icon;
              return (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.05 }}
                  className={`rounded-lg border p-3 ${meta.cls}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-background/60 text-foreground text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="font-semibold text-sm text-foreground">{s.title}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]"><Icon className="w-3 h-3 mr-1" />{meta.label}</Badge>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed pl-8">{s.explanation}</p>
                </motion.li>
              );
            })}
          </ol>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="text-xs uppercase tracking-wider font-semibold text-primary mb-1">Focus next time</div>
            <p className="text-sm text-foreground/90">{walkthrough.next_focus}</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
