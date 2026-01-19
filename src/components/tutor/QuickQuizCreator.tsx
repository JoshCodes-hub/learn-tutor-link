import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Zap,
  BookOpen,
  Clock,
  HelpCircle
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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

interface QuickQuizCreatorProps {
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

const QUIZ_TEMPLATES = [
  { name: "Quick 5", questions: 5, duration: 10, icon: Zap, description: "5 questions in 10 mins" },
  { name: "Standard", questions: 10, duration: 20, icon: BookOpen, description: "10 questions in 20 mins" },
  { name: "Full Test", questions: 20, duration: 40, icon: Clock, description: "20 questions in 40 mins" },
  { name: "Exam Sim", questions: 50, duration: 60, icon: HelpCircle, description: "50 questions in 60 mins", isSimulation: true },
];

export function QuickQuizCreator({
  open,
  onOpenChange,
  courses,
  onSuccess,
}: QuickQuizCreatorProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<"setup" | "questions" | "review">("setup");
  const [isLoading, setIsLoading] = useState(false);
  
  // Quiz setup
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [targetQuestionCount, setTargetQuestionCount] = useState(10);
  const [isSimulation, setIsSimulation] = useState(false);
  
  // Questions
  const [questions, setQuestions] = useState<Question[]>([{ ...emptyQuestion }]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [useExisting, setUseExisting] = useState(false);
  const [existingQuestionCount, setExistingQuestionCount] = useState(0);

  useEffect(() => {
    if (!open) {
      // Reset on close
      setStep("setup");
      setTitle("");
      setCourseId("");
      setTopicId("");
      setQuestions([{ ...emptyQuestion }]);
      setCurrentIndex(0);
      setUseExisting(false);
      setIsSimulation(false);
    }
  }, [open]);

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

      // Check existing questions
      const { count } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("course_id", courseId)
        .eq("is_approved", true);

      setExistingQuestionCount(count || 0);
    };

    fetchTopics();
  }, [courseId]);

  const applyTemplate = (template: typeof QUIZ_TEMPLATES[0]) => {
    setTargetQuestionCount(template.questions);
    setDurationMinutes(template.duration);
    if ('isSimulation' in template) {
      setIsSimulation(template.isSimulation as boolean);
    }
    toast.success(`Applied "${template.name}" template`);
  };

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

  const removeQuestion = (index: number) => {
    if (questions.length === 1) return;
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
    setCurrentIndex(Math.min(currentIndex, newQuestions.length - 1));
  };

  const isQuestionComplete = (q: Question) => {
    return (
      q.question_text.trim() &&
      q.option_a.trim() &&
      q.option_b.trim() &&
      q.option_c.trim() &&
      q.option_d.trim()
    );
  };

  const completedQuestions = questions.filter(isQuestionComplete).length;
  const progress = useExisting 
    ? 100 
    : (completedQuestions / targetQuestionCount) * 100;

  const canProceedToQuestions = courseId && topicId && title.trim();
  const canSubmit = useExisting 
    ? existingQuestionCount >= targetQuestionCount 
    : completedQuestions >= 1;

  const handleSubmit = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // First, upload new questions if any
      if (!useExisting && questions.some(isQuestionComplete)) {
        const validQuestions = questions.filter(isQuestionComplete);
        const questionsToInsert = validQuestions.map((q) => ({
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
          is_approved: true,
        }));

        const { error: qError } = await supabase
          .from("questions")
          .insert(questionsToInsert);

        if (qError) throw qError;
      }

      // Create the quiz
      const questionCount = useExisting 
        ? Math.min(targetQuestionCount, existingQuestionCount)
        : completedQuestions;

      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          title: title.trim(),
          course_id: courseId,
          tutor_id: user.id,
          duration_minutes: durationMinutes,
          question_count: questionCount,
          is_premium: false,
          token_cost: 0,
          is_simulation: isSimulation,
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // Link questions to quiz
      if (quiz) {
        const { data: availableQuestions, error: fetchError } = await supabase
          .from("questions")
          .select("id")
          .eq("course_id", courseId)
          .eq("is_approved", true)
          .limit(questionCount);

        if (fetchError) throw fetchError;

        if (availableQuestions && availableQuestions.length > 0) {
          const quizQuestions = availableQuestions.map((q, index) => ({
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

      toast.success("Quiz created successfully! 🎉");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error creating quiz:", error);
      toast.error(error.message || "Failed to create quiz");
    } finally {
      setIsLoading(false);
    }
  };

  const currentQuestion = questions[currentIndex];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Quick Quiz Creator
          </SheetTitle>
          <SheetDescription>
            Create a quiz in minutes with our streamlined process
          </SheetDescription>
        </SheetHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mt-4 mb-6">
          {["setup", "questions", "review"].map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : ["setup", "questions", "review"].indexOf(step) > i
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </div>
              {i < 2 && (
                <div
                  className={cn(
                    "flex-1 h-1 rounded",
                    ["setup", "questions", "review"].indexOf(step) > i
                      ? "bg-primary/40"
                      : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {step === "setup" && (
          <div className="space-y-6">
            {/* Quick Templates */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Quick Templates</Label>
              <div className="grid grid-cols-3 gap-3">
                {QUIZ_TEMPLATES.map((template) => (
                  <button
                    key={template.name}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-all hover:border-primary/50",
                      targetQuestionCount === template.questions && durationMinutes === template.duration
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    )}
                  >
                    <template.icon className="w-5 h-5 text-primary mb-2" />
                    <p className="font-medium text-sm">{template.name}</p>
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Course & Topic */}
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
                        {course.code} - {course.name}
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

            {/* Quiz Title */}
            <div className="space-y-2">
              <Label>Quiz Title *</Label>
              <Input
                placeholder="e.g., Chapter 1 Review Quiz"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Quiz Type Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-accent/10 border border-accent/20">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-accent" />
                <div>
                  <p className="font-medium text-sm">Exam Simulation Mode</p>
                  <p className="text-xs text-muted-foreground">
                    CBT-style timed exam with strict timing
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSimulation(!isSimulation)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  isSimulation ? "bg-accent" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    isSimulation ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Existing Questions Notice */}
            {existingQuestionCount > 0 && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {existingQuestionCount} questions available
                    </p>
                    <p className="text-sm text-muted-foreground">
                      You can use existing questions or add new ones
                    </p>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 mt-1"
                      onClick={() => {
                        setUseExisting(true);
                        setStep("review");
                      }}
                    >
                      Use existing questions →
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => setStep("questions")}
              disabled={!canProceedToQuestions}
            >
              Add Questions
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === "questions" && (
          <div className="space-y-4">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {completedQuestions} of {targetQuestionCount} questions
                </span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Question Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {questions.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    i === currentIndex
                      ? "bg-primary text-primary-foreground"
                      : isQuestionComplete(q)
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  Q{i + 1}
                  {isQuestionComplete(q) && i !== currentIndex && (
                    <CheckCircle2 className="w-3 h-3 ml-1 inline" />
                  )}
                </button>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addQuestion}
                className="rounded-full"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Question Form */}
            <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
              <div className="flex items-center justify-between">
                <Badge variant="outline">Question {currentIndex + 1}</Badge>
                {questions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(currentIndex)}
                    className="text-destructive hover:text-destructive h-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Question *</Label>
                <Textarea
                  placeholder="Type your question here..."
                  value={currentQuestion.question_text}
                  onChange={(e) => updateQuestion("question_text", e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {["A", "B", "C", "D"].map((opt) => (
                  <div key={opt} className="space-y-1.5">
                    <Label className="text-xs">Option {opt} *</Label>
                    <Input
                      placeholder={`Option ${opt}`}
                      value={currentQuestion[`option_${opt.toLowerCase()}` as keyof Question] as string}
                      onChange={(e) =>
                        updateQuestion(`option_${opt.toLowerCase()}` as keyof Question, e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Correct Answer</Label>
                  <RadioGroup
                    value={currentQuestion.correct_option}
                    onValueChange={(v) => updateQuestion("correct_option", v)}
                    className="flex gap-3"
                  >
                    {["A", "B", "C", "D"].map((opt) => (
                      <div key={opt} className="flex items-center space-x-1.5">
                        <RadioGroupItem value={opt} id={`ans-${opt}`} />
                        <Label htmlFor={`ans-${opt}`} className="text-sm cursor-pointer">
                          {opt}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Difficulty</Label>
                  <Select
                    value={currentQuestion.difficulty}
                    onValueChange={(v) => updateQuestion("difficulty", v)}
                  >
                    <SelectTrigger className="w-24">
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

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  Explanation
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  placeholder="Why is this the correct answer?"
                  value={currentQuestion.explanation}
                  onChange={(e) => updateQuestion("explanation", e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={() => setStep("setup")}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                {currentIndex > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentIndex(currentIndex - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </Button>
                )}
                {currentIndex < questions.length - 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentIndex(currentIndex + 1)}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <Button onClick={() => setStep("review")} disabled={!canSubmit}>
                Review
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <h3 className="font-semibold text-lg">{title}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Course</p>
                  <p className="font-medium">
                    {courses.find((c) => c.id === courseId)?.name}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">{durationMinutes} minutes</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Questions</p>
                  <p className="font-medium">
                    {useExisting 
                      ? Math.min(targetQuestionCount, existingQuestionCount)
                      : completedQuestions
                    }
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Source</p>
                  <p className="font-medium">
                    {useExisting ? "Existing questions" : "New questions"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Quiz Type</p>
                  <p className={cn("font-medium", isSimulation && "text-accent")}>
                    {isSimulation ? "Exam Simulation" : "Practice Quiz"}
                  </p>
                </div>
              </div>
            </div>

            {!useExisting && completedQuestions > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Questions Preview</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {questions.filter(isQuestionComplete).map((q, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-border text-sm"
                    >
                      <p className="font-medium line-clamp-2">{q.question_text}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Answer: {q.correct_option} • {q.difficulty}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(useExisting ? "setup" : "questions")}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Quiz
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
