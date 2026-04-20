import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Sparkles, TrendingUp, Lightbulb } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export interface TheoryEvaluation {
  score: number;
  coverage: { points_hit: string[]; points_missed: string[] };
  strengths: string[];
  improvements: string[];
  better_answer_outline: string;
  overall_feedback: string;
}

interface Props {
  evaluation: TheoryEvaluation;
}

export const AIFeedbackPanel = ({ evaluation }: Props) => {
  const scoreColor =
    evaluation.score >= 75 ? "text-primary" : evaluation.score >= 50 ? "text-accent-foreground" : "text-destructive";

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-display flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Evaluation
          </CardTitle>
          <div className={`text-3xl font-display font-bold ${scoreColor}`}>{evaluation.score}/100</div>
        </div>
        <Progress value={evaluation.score} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground italic">{evaluation.overall_feedback}</p>

        {evaluation.coverage.points_hit.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary" /> Points Covered
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {evaluation.coverage.points_hit.map((p, i) => (
                <Badge key={i} variant="secondary" className="bg-primary/10 text-primary border-primary/20">{p}</Badge>
              ))}
            </div>
          </div>
        )}

        {evaluation.coverage.points_missed.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-destructive" /> Points Missed
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {evaluation.coverage.points_missed.map((p, i) => (
                <Badge key={i} variant="outline" className="border-destructive/30 text-destructive">{p}</Badge>
              ))}
            </div>
          </div>
        )}

        {evaluation.strengths.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" /> What You Did Well
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
              {evaluation.strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        {evaluation.improvements.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-accent-foreground" /> How to Improve
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
              {evaluation.improvements.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
          <h4 className="font-semibold text-sm mb-1">Better Answer Outline</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{evaluation.better_answer_outline}</p>
        </div>
      </CardContent>
    </Card>
  );
};
