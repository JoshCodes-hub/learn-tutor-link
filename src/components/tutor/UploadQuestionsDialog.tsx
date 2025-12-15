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
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Course {
  id: string;
  code: string;
  name: string;
}

interface Topic {
  id: string;
  name: string;
  course_id: string;
}

interface Question {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

interface UploadQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Course[];
  onSuccess: () => void;
}

const emptyQuestion: Question = {
  question_text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_option: "A",
  explanation: "",
  difficulty: "medium",
};

export function UploadQuestionsDialog({
  open,
  onOpenChange,
  courses,
  onSuccess,
}: UploadQuestionsDialogProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [questions, setQuestions] = useState<Question[]>([{ ...emptyQuestion }]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchTopics = async () => {
      if (!courseId) {
        setTopics([]);
        setTopicId("");
        return;
      }

      const { data } = await supabase
        .from("topics")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index");

      if (data) {
        setTopics(data);
        if (data.length > 0) {
          setTopicId(data[0].id);
        }
      }
    };

    fetchTopics();
  }, [courseId]);

  const updateQuestion = (field: keyof Question, value: string) => {
    const newQuestions = [...questions];
    newQuestions[currentIndex] = {
      ...newQuestions[currentIndex],
      [field]: value,
    };
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    setQuestions([...questions, { ...emptyQuestion }]);
    setCurrentIndex(questions.length);
  };

  const removeCurrentQuestion = () => {
    if (questions.length === 1) return;
    const newQuestions = questions.filter((_, i) => i !== currentIndex);
    setQuestions(newQuestions);
    setCurrentIndex(Math.min(currentIndex, newQuestions.length - 1));
  };

  const validateQuestions = () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (
        !q.question_text.trim() ||
        !q.option_a.trim() ||
        !q.option_b.trim() ||
        !q.option_c.trim() ||
        !q.option_d.trim()
      ) {
        toast.error(`Question ${i + 1} is incomplete`);
        setCurrentIndex(i);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!courseId || !topicId) {
      toast.error("Please select a course and topic");
      return;
    }

    if (!validateQuestions()) return;

    setIsLoading(true);

    try {
      const questionsToInsert = questions.map((q) => ({
        course_id: courseId,
        topic_id: topicId,
        tutor_id: user.id,
        question_text: q.question_text.trim(),
        option_a: q.option_a.trim(),
        option_b: q.option_b.trim(),
        option_c: q.option_c.trim(),
        option_d: q.option_d.trim(),
        correct_option: q.correct_option,
        explanation: q.explanation.trim() || null,
        difficulty: q.difficulty,
        is_approved: true, // Auto-approve for tutors
      }));

      const { error } = await supabase.from("questions").insert(questionsToInsert);

      if (error) throw error;

      toast.success(`${questions.length} question(s) uploaded successfully!`);
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error("Error uploading questions:", error);
      toast.error(error.message || "Failed to upload questions");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCourseId("");
    setTopicId("");
    setQuestions([{ ...emptyQuestion }]);
    setCurrentIndex(0);
  };

  const currentQuestion = questions[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Questions</DialogTitle>
          <DialogDescription>
            Add questions to your course. Question {currentIndex + 1} of {questions.length}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Course *</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Topic *</Label>
              <Select
                value={topicId}
                onValueChange={setTopicId}
                disabled={!courseId || topics.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={topics.length === 0 ? "No topics" : "Select topic"} />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Question Navigation */}
          <div className="flex items-center gap-2 flex-wrap">
            {questions.map((_, i) => (
              <Button
                key={i}
                type="button"
                variant={i === currentIndex ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentIndex(i)}
              >
                Q{i + 1}
              </Button>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={addQuestion}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Question {currentIndex + 1}</Label>
              {questions.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeCurrentQuestion}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Question Text *</Label>
              <Textarea
                placeholder="Enter the question..."
                value={currentQuestion.question_text}
                onChange={(e) => updateQuestion("question_text", e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Option A *</Label>
                <Input
                  placeholder="Option A"
                  value={currentQuestion.option_a}
                  onChange={(e) => updateQuestion("option_a", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Option B *</Label>
                <Input
                  placeholder="Option B"
                  value={currentQuestion.option_b}
                  onChange={(e) => updateQuestion("option_b", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Option C *</Label>
                <Input
                  placeholder="Option C"
                  value={currentQuestion.option_c}
                  onChange={(e) => updateQuestion("option_c", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Option D *</Label>
                <Input
                  placeholder="Option D"
                  value={currentQuestion.option_d}
                  onChange={(e) => updateQuestion("option_d", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Correct Answer *</Label>
              <RadioGroup
                value={currentQuestion.correct_option}
                onValueChange={(value) => updateQuestion("correct_option", value)}
                className="flex gap-4"
              >
                {["A", "B", "C", "D"].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`option-${option}`} />
                    <Label htmlFor={`option-${option}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={currentQuestion.difficulty}
                  onValueChange={(value) => updateQuestion("difficulty", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Explanation (Optional)</Label>
              <Textarea
                placeholder="Explain why the correct answer is right..."
                value={currentQuestion.explanation}
                onChange={(e) => updateQuestion("explanation", e.target.value)}
                rows={2}
              />
            </div>
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
            <Button type="submit" disabled={isLoading || !courseId || !topicId}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Upload {questions.length} Question{questions.length > 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
