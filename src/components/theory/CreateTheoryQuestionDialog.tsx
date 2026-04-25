import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, PenLine } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  onCreated: () => void;
}

export const CreateTheoryQuestionDialog = ({ open, onOpenChange, courseId, onCreated }: Props) => {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const isTutor = hasRole("tutor");

  const [questionText, setQuestionText] = useState("");
  const [modelAnswer, setModelAnswer] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [marks, setMarks] = useState(10);
  const [year, setYear] = useState<string>("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuestionText("");
      setModelAnswer("");
      setKeyPoints("");
      setDifficulty("medium");
      setMarks(10);
      setYear("");
      setSource("");
    }
  }, [open]);

  if (!isTutor && !isAdmin) return null;

  const submit = async () => {
    if (!user || !questionText.trim()) {
      toast.error("Question text is required");
      return;
    }
    setSaving(true);
    try {
      const points = keyPoints
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean);

      const { error } = await supabase.from("theory_questions").insert({
        course_id: courseId,
        tutor_id: user.id,
        question_text: questionText.trim(),
        model_answer: modelAnswer.trim() || null,
        key_points: points,
        difficulty,
        marks,
        year: year ? parseInt(year, 10) : null,
        source: source.trim() || null,
        is_approved: true, // auto-approve per platform policy
      });
      if (error) throw error;

      toast.success("Theory question created");
      onCreated();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <PenLine className="w-5 h-5 text-primary" /> Create Theory Question
          </DialogTitle>
          <DialogDescription>
            Add a written/essay question. Provide a model answer and key points so AI can grade student attempts accurately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="qtext">Question *</Label>
            <Textarea
              id="qtext"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={4}
              placeholder="State and explain Newton's three laws of motion with examples."
            />
          </div>

          <div>
            <Label htmlFor="model">Model answer (optional, used by AI grading)</Label>
            <Textarea
              id="model"
              value={modelAnswer}
              onChange={(e) => setModelAnswer(e.target.value)}
              rows={4}
              placeholder="An ideal answer covering all required points..."
            />
          </div>

          <div>
            <Label htmlFor="kp">Key points (one per line)</Label>
            <Textarea
              id="kp"
              value={keyPoints}
              onChange={(e) => setKeyPoints(e.target.value)}
              rows={4}
              placeholder={"First law: inertia\nSecond law: F = ma\nThird law: action-reaction"}
            />
            <p className="text-xs text-muted-foreground mt-1">
              These are the core points an answer must cover.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as "easy" | "medium" | "hard")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="marks">Marks</Label>
              <Input
                id="marks"
                type="number"
                min={1}
                max={100}
                value={marks}
                onChange={(e) => setMarks(parseInt(e.target.value || "10", 10))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="year">Year (optional)</Label>
              <Input
                id="year"
                type="number"
                min={1990}
                max={new Date().getFullYear() + 1}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2023"
              />
            </div>
            <div>
              <Label htmlFor="source">Source (optional)</Label>
              <Input
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Past question, Lecture notes..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !questionText.trim()}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Create Question"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
