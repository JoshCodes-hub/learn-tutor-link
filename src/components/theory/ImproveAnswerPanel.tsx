import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wand2, ArrowRightCircle, Plus, Replace, Minus, Shuffle } from "lucide-react";

export interface AnswerImprovement {
  improved_answer: string;
  edits: { type: "add" | "replace" | "remove" | "restructure"; location: string; suggestion: string }[];
  rationale: string;
}

const editIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  add: Plus,
  replace: Replace,
  remove: Minus,
  restructure: Shuffle,
};

const editTone: Record<string, string> = {
  add: "bg-primary/10 text-primary border-primary/20",
  replace: "bg-accent/30 text-accent-foreground border-accent/40",
  remove: "bg-destructive/10 text-destructive border-destructive/20",
  restructure: "bg-secondary text-secondary-foreground border-border",
};

export const ImproveAnswerPanel = ({ improvement }: { improvement: AnswerImprovement }) => {
  return (
    <Card className="glass-card border-primary/30">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-primary" />
          Improved Answer
        </CardTitle>
        <p className="text-sm text-muted-foreground italic">{improvement.rationale}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-border/60 bg-background/40 p-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{improvement.improved_answer}</p>
        </div>

        {improvement.edits.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
              <ArrowRightCircle className="w-4 h-4 text-primary" /> Specific Edits
            </h4>
            <ul className="space-y-2">
              {improvement.edits.map((e, i) => {
                const Icon = editIcon[e.type] ?? Plus;
                return (
                  <li key={i} className="flex gap-2 items-start text-sm">
                    <Badge variant="outline" className={`gap-1 ${editTone[e.type] ?? ""}`}>
                      <Icon className="w-3 h-3" /> {e.type}
                    </Badge>
                    <div className="flex-1">
                      <span className="font-medium">{e.location}: </span>
                      <span className="text-muted-foreground">{e.suggestion}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
