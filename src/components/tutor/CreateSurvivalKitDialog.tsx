import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

interface ModelAnswer { question: string; answer: string; }

export const CreateSurvivalKitDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<{ id: string; code: string; name: string }[]>([]);
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tokenCost, setTokenCost] = useState(0);
  const [notesUrl, setNotesUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [likely, setLikely] = useState("");
  const [models, setModels] = useState<ModelAnswer[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("courses").select("id, code, name").eq("is_active", true).order("code");
      setCourses(data ?? []);
    })();
  }, [open]);

  const reset = () => {
    setCourseId(""); setTitle(""); setDescription(""); setTokenCost(0);
    setNotesUrl(""); setSummary(""); setLikely(""); setModels([]);
  };

  const handleSave = async () => {
    if (!user || !courseId || !title) {
      toast.error("Course and title are required");
      return;
    }
    setSaving(true);
    try {
      const likely_questions = likely.split("\n").map((s) => s.trim()).filter(Boolean);
      const { error } = await supabase.from("course_survival_kits").insert({
        course_id: courseId,
        tutor_id: user.id,
        title,
        description: description || null,
        token_cost: tokenCost,
        contents: {
          notes_url: notesUrl || undefined,
          summary: summary || undefined,
          likely_questions,
          model_answers: models.filter((m) => m.question && m.answer),
        },
      });
      if (error) throw error;
      toast.success("Survival Kit published");
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to publish kit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Create Survival Kit</DialogTitle>
          <DialogDescription>Bundle notes + past-question summary + likely questions + model answers in one product.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Course *</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} – {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Token Cost</Label>
              <Input type="number" min={0} value={tokenCost} onChange={(e) => setTokenCost(Number(e.target.value) || 0)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. CSC305 Survival Kit – 2024 Sem 1" />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What does this kit cover?" />
          </div>

          <div className="space-y-1.5">
            <Label>Notes URL (PDF / Drive link)</Label>
            <Input value={notesUrl} onChange={(e) => setNotesUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-1.5">
            <Label>Past-Question Summary</Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} placeholder="Patterns from past 5 years, common topics, expected style..." />
          </div>

          <div className="space-y-1.5">
            <Label>Likely Questions (one per line)</Label>
            <Textarea value={likely} onChange={(e) => setLikely(e.target.value)} rows={5} placeholder="Discuss the role of normalization in DBMS&#10;Compare TCP and UDP" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Model Answers</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setModels([...models, { question: "", answer: "" }])}>
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
            {models.map((m, i) => (
              <div key={i} className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-muted-foreground">Model Answer {i + 1}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setModels(models.filter((_, j) => j !== i))}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <Input placeholder="Question" value={m.question} onChange={(e) => {
                  const next = [...models]; next[i] = { ...next[i], question: e.target.value }; setModels(next);
                }} />
                <Textarea placeholder="Model answer" rows={3} value={m.answer} onChange={(e) => {
                  const next = [...models]; next[i] = { ...next[i], answer: e.target.value }; setModels(next);
                }} />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (<><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</>) : "Publish Kit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
