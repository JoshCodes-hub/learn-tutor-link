import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Course {
  id: string;
  code: string;
  name: string;
}

interface CreateQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Course[];
  onSuccess: () => void;
}

export function CreateQuizDialog({
  open,
  onOpenChange,
  courses,
  onSuccess,
}: CreateQuizDialogProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [questionCount, setQuestionCount] = useState("20");
  const [isPremium, setIsPremium] = useState(false);
  const [tokenCost, setTokenCost] = useState("10");
  const [availableQuestions, setAvailableQuestions] = useState(0);

  useEffect(() => {
    const fetchQuestionCount = async () => {
      if (!courseId) {
        setAvailableQuestions(0);
        return;
      }

      const { count } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("course_id", courseId)
        .eq("is_approved", true);

      setAvailableQuestions(count || 0);
    };

    fetchQuestionCount();
  }, [courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!title.trim() || !courseId) {
      toast.error("Title and course are required");
      return;
    }

    const qCount = parseInt(questionCount);
    if (qCount > availableQuestions) {
      toast.error(`Only ${availableQuestions} approved questions available for this course`);
      return;
    }

    setIsLoading(true);

    try {
      // Create quiz
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          course_id: courseId,
          tutor_id: user.id,
          duration_minutes: parseInt(durationMinutes),
          question_count: qCount,
          is_premium: isPremium,
          token_cost: isPremium ? parseInt(tokenCost) : 0,
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // Fetch and link random questions
      if (quiz) {
        const { data: questions, error: questionsError } = await supabase
          .from("questions")
          .select("id")
          .eq("course_id", courseId)
          .eq("is_approved", true)
          .limit(qCount);

        if (questionsError) throw questionsError;

        if (questions && questions.length > 0) {
          const quizQuestions = questions.map((q, index) => ({
            quiz_id: quiz.id,
            question_id: q.id,
            order_index: index,
          }));

          const { error: linkError } = await supabase
            .from("quiz_questions")
            .insert(quizQuestions);

          if (linkError) throw linkError;
        }
      }

      toast.success("Quiz created successfully!");
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error("Error creating quiz:", error);
      toast.error(error.message || "Failed to create quiz");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCourseId("");
    setDurationMinutes("30");
    setQuestionCount("20");
    setIsPremium(false);
    setTokenCost("10");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Quiz</DialogTitle>
          <DialogDescription>
            Create a quiz from your uploaded questions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="course">Course *</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {courseId && (
              <p className="text-sm text-muted-foreground">
                {availableQuestions} approved questions available
              </p>
            )}
          </div>

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

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="questionCount">Number of Questions</Label>
              <Input
                id="questionCount"
                type="number"
                min="1"
                max={availableQuestions || 100}
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
              />
            </div>
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || courses.length === 0}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Quiz
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
