import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  token_cost: number;
  is_premium: boolean;
  question_count: number;
  duration_minutes: number;
  is_active: boolean;
}

interface EditQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz: Quiz | null;
  onSuccess: () => void;
}

export function EditQuizDialog({
  open,
  onOpenChange,
  quiz,
  onSuccess,
}: EditQuizDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [isPremium, setIsPremium] = useState(false);
  const [tokenCost, setTokenCost] = useState("10");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (quiz) {
      setTitle(quiz.title);
      setDescription(quiz.description || "");
      setDurationMinutes(quiz.duration_minutes.toString());
      setIsPremium(quiz.is_premium);
      setTokenCost(quiz.token_cost.toString());
      setIsActive(quiz.is_active);
    }
  }, [quiz]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz) return;

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("quizzes")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          duration_minutes: parseInt(durationMinutes),
          is_premium: isPremium,
          token_cost: isPremium ? parseInt(tokenCost) : 0,
          is_active: isActive,
        })
        .eq("id", quiz.id);

      if (error) throw error;

      toast.success("Quiz updated successfully!");
      onSuccess();
    } catch (error: any) {
      console.error("Error updating quiz:", error);
      toast.error(error.message || "Failed to update quiz");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Quiz</DialogTitle>
          <DialogDescription>
            Update your quiz settings. Note: Question count cannot be changed after creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Quiz Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Chapter 1 - Motion"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of this quiz..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="5"
              max="180"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <Label htmlFor="premium">Premium Quiz</Label>
              <p className="text-sm text-muted-foreground">
                Charge tokens for this quiz
              </p>
            </div>
            <Switch
              id="premium"
              checked={isPremium}
              onCheckedChange={setIsPremium}
            />
          </div>

          {isPremium && (
            <div className="space-y-2">
              <Label htmlFor="tokenCost">Token Cost</Label>
              <Input
                id="tokenCost"
                type="number"
                min="1"
                max="100"
                value={tokenCost}
                onChange={(e) => setTokenCost(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <Label htmlFor="active">Active</Label>
              <p className="text-sm text-muted-foreground">
                Make this quiz visible to students
              </p>
            </div>
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
