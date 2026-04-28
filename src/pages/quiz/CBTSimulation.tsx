import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBookmarkedQuestions } from "@/hooks/useBookmarkedQuestions";
import { useQuizAutoSave } from "@/hooks/useQuizAutoSave";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { QuizProgressBar } from "@/components/quiz/QuizProgressBar";
import {
  BookOpen,
  ArrowLeft,
  Loader2,
  Clock,
  AlertTriangle,
  Flag,
  Bookmark,
  BookmarkCheck,
  Timer
} from "lucide-react";
import ReportQuestionDialog from "@/components/student/ReportQuestionDialog";
import { ImageZoomModal, ClickableQuestionImage } from "@/components/quiz/ImageZoomModal";
import { haptic } from "@/lib/native";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  image_url: string | null;
}

interface QuizData {
  id: string;
  title: string;
  duration_minutes: number;
  course: {
    code: string;
    name: string;
  };
}

const CBTSimulation = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { isBookmarked, toggleBookmark } = useBookmarkedQuestions();
  const strictMode = profile?.academic_path === "jamb";
  
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const questionStartTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  
  const { saveState, loadState, clearState, hasSavedState } = useQuizAutoSave(quizId || "");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchQuizData = async () => {
      if (!quizId || !user) return;

      try {
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select("*, courses(code, name)")
          .eq("id", quizId)
          .single();

        if (quizError) throw quizError;

        // Platform is currently free - no premium purchase check needed

        setQuiz({
          ...quizData,
          course: quizData.courses as { code: string; name: string }
        });
        setTimeLeft(quizData.duration_minutes * 60);

        const { data: questionsData, error: questionsError } = await supabase
          .from("quiz_questions")
          .select("questions(*)")
          .eq("quiz_id", quizId)
          .order("order_index");

        if (questionsError) throw questionsError;

        const formattedQuestions = questionsData.map((qq: any) => qq.questions);
        setQuestions(formattedQuestions);

        const { data: attemptData, error: attemptError } = await supabase
          .from("quiz_attempts")
          .insert({
            user_id: user.id,
            quiz_id: quizId,
            mode: "simulation",
            total_questions: formattedQuestions.length,
          })
          .select()
          .single();

        if (attemptError) throw attemptError;
        setAttemptId(attemptData.id);
        startTimeRef.current = Date.now();
        const { track } = await import("@/lib/analytics");
        void track("quiz_started", { quiz_id: quizId, mode: "simulation", total_questions: formattedQuestions.length });

      } catch (error) {
        console.error("Error fetching quiz:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load quiz.",
        });
        navigate("/student/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizData();
  }, [quizId, user, navigate, toast]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0 || isLoading) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLoading]);

  // Auto-save effect
  useEffect(() => {
    if (!attemptId || isLoading || isSubmitting) return;
    
    const saveTimer = setInterval(() => {
      saveState({
        answers,
        flagged: Array.from(flagged),
        currentIndex,
        timeLeft,
        attemptId,
      });
    }, 5000); // Save every 5 seconds

    return () => clearInterval(saveTimer);
  }, [answers, flagged, currentIndex, timeLeft, attemptId, isLoading, isSubmitting, saveState]);

  // Track question time when changing questions
  const handleQuestionChange = useCallback((newIndex: number) => {
    const question = questions[currentIndex];
    if (question) {
      const timeSpent = Math.round((Date.now() - questionStartTimeRef.current) / 1000);
      setQuestionTimes((prev) => ({
        ...prev,
        [question.id]: (prev[question.id] || 0) + timeSpent,
      }));
    }
    questionStartTimeRef.current = Date.now();
    setCurrentIndex(newIndex);
  }, [questions, currentIndex]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelectAnswer = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
    void haptic("selection");
  };

  const toggleFlag = (questionId: string) => {
    setFlagged((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleSubmitExam = async () => {
    if (!attemptId || isSubmitting) return;
    
    setIsSubmitting(true);
    void haptic("heavy");
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      // Calculate score
      let correctCount = 0;
      const answerInserts = questions.map((q) => {
        const selectedOption = answers[q.id] || null;
        const isCorrect = selectedOption === q.correct_option;
        if (isCorrect) correctCount++;
        
        return {
          attempt_id: attemptId,
          question_id: q.id,
          selected_option: selectedOption,
          is_correct: selectedOption ? isCorrect : false,
        };
      });

      // Insert all answers
      await supabase.from("quiz_answers").insert(answerInserts);

      // Update attempt
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
      await supabase
        .from("quiz_attempts")
        .update({
          completed_at: new Date().toISOString(),
          correct_answers: correctCount,
          score: Math.round((correctCount / questions.length) * 100),
          time_spent_seconds: timeSpent,
        })
        .eq("id", attemptId);

      const { track } = await import("@/lib/analytics");
      void track("quiz_completed", {
        quiz_id: quizId,
        mode: "simulation",
        score: Math.round((correctCount / questions.length) * 100),
        correct: correctCount,
        total: questions.length,
        time_spent_seconds: timeSpent,
      });

      // Clear auto-save on successful submit
      clearState();
      navigate(`/quiz/${quizId}/results/${attemptId}`);
    } catch (error) {
      console.error("Error submitting exam:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit exam. Please try again.",
      });
      setIsSubmitting(false);
    }
  };

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isLowTime = timeLeft <= 300; // 5 minutes

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading CBT simulation...</p>
        </div>
      </div>
    );
  }

  const options = [
    { key: "A", text: currentQuestion?.option_a },
    { key: "B", text: currentQuestion?.option_b },
    { key: "C", text: currentQuestion?.option_c },
    { key: "D", text: currentQuestion?.option_d },
  ];

  return (
    <div className="min-h-screen bg-foreground text-background">
      {/* CBT-style Header */}
      <header className="bg-primary text-primary-foreground py-3 px-4">
        <div className="container mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            <div>
              <h1 className="font-display font-bold text-sm sm:text-base">{quiz?.title}</h1>
              <p className="text-xs sm:text-sm opacity-80">{quiz?.course.code} - {quiz?.course.name}</p>
            </div>
          </div>
          
          <div className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-mono text-base sm:text-xl font-bold ${
            isLowTime ? "bg-destructive animate-pulse" : "bg-background/20"
          }`}>
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 sm:py-6">
        <div className="grid lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Question Panel */}
          <div className="lg:col-span-3">
            {/* Progress Bar */}
            <div className="bg-card text-card-foreground rounded-xl p-4 mb-4">
              <QuizProgressBar 
                currentIndex={currentIndex}
                totalQuestions={questions.length}
                answeredCount={answeredCount}
              />
            </div>

            <div className="bg-card text-card-foreground rounded-xl p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  {/* Question Timer */}
                  {currentQuestion && questionTimes[currentQuestion.id] > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      <Timer className="w-3 h-3" />
                      {formatTime(questionTimes[currentQuestion.id])}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Bookmark Button */}
                  <Button
                    variant={isBookmarked(currentQuestion?.id || "") ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => currentQuestion && toggleBookmark(currentQuestion.id)}
                  >
                    {isBookmarked(currentQuestion?.id || "") ? (
                      <BookmarkCheck className="w-4 h-4" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </Button>
                  {/* Flag Button */}
                  <Button
                    variant={flagged.has(currentQuestion?.id) ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => currentQuestion && toggleFlag(currentQuestion.id)}
                  >
                    <Flag className="w-4 h-4 mr-1" />
                    {flagged.has(currentQuestion?.id) ? "Flagged" : "Flag"}
                  </Button>
                  {/* Report Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReportDialog(true)}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <h2 className="font-display text-xl font-semibold text-foreground mb-4 leading-relaxed">
                {currentQuestion?.question_text}
              </h2>

              {/* Question Image */}
              <ClickableQuestionImage
                imageUrl={currentQuestion?.image_url || null}
                onImageClick={() => setZoomedImageUrl(currentQuestion?.image_url || null)}
                className="max-h-56"
              />

              <div className="space-y-3">
                {options.map((option) => {
                  const isSelected = answers[currentQuestion?.id] === option.key;
                  
                  return (
                    <button
                      key={option.key}
                      onClick={() => currentQuestion && handleSelectAnswer(currentQuestion.id, option.key)}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {option.key}
                        </span>
                        <span className="text-foreground flex-1 pt-1">{option.text}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-2">
              {strictMode ? (
                <span className="text-xs text-muted-foreground italic">
                  JAMB strict mode — you cannot return to previous questions.
                </span>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => handleQuestionChange(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                >
                  Previous
                </Button>
              )}

              {currentIndex === questions.length - 1 ? (
                <Button variant="accent" onClick={handleSubmitExam} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Exam"}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => handleQuestionChange(Math.min(questions.length - 1, currentIndex + 1))}
                >
                  Next
                </Button>
              )}
            </div>
          </div>

          {/* Question Navigator — hidden in strict JAMB mode */}
          {!strictMode && (
          <div className="lg:col-span-1 order-first lg:order-last">
            <div className="bg-card text-card-foreground rounded-xl p-4 lg:sticky lg:top-4">
              <h3 className="font-display font-semibold text-foreground mb-4">
                Questions
              </h3>
              
              <div className="grid grid-cols-10 sm:grid-cols-10 lg:grid-cols-5 gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => handleQuestionChange(idx)}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center transition-colors ${
                      idx === currentIndex
                        ? "bg-primary text-primary-foreground"
                        : answers[q.id]
                        ? "bg-success text-success-foreground"
                        : flagged.has(q.id)
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              <div className="hidden sm:flex flex-col space-y-2 text-sm mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-success" />
                  <span className="text-muted-foreground">Answered ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-muted" />
                  <span className="text-muted-foreground">Unanswered ({questions.length - answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-destructive" />
                  <span className="text-muted-foreground">Flagged ({flagged.size})</span>
                </div>
              </div>

              {/* Mobile summary */}
              <div className="flex sm:hidden items-center justify-center gap-4 text-xs mb-4">
                <span className="text-success">{answeredCount} answered</span>
                <span className="text-muted-foreground">{questions.length - answeredCount} left</span>
                {flagged.size > 0 && <span className="text-destructive">{flagged.size} flagged</span>}
              </div>

              {answeredCount < questions.length && (
                <div className="flex items-start gap-2 p-3 bg-accent/10 rounded-lg mb-4">
                  <AlertTriangle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    You have {questions.length - answeredCount} unanswered questions
                  </p>
                </div>
              )}

              <Button
                variant="accent"
                className="w-full"
                onClick={handleSubmitExam}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Submit Exam"
                )}
              </Button>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Report Question Dialog */}
      {currentQuestion && (
        <ReportQuestionDialog
          open={showReportDialog}
          onOpenChange={setShowReportDialog}
          questionId={currentQuestion.id}
          questionText={currentQuestion.question_text}
        />
      )}

      {/* Image Zoom Modal */}
      <ImageZoomModal
        imageUrl={zoomedImageUrl}
        isOpen={!!zoomedImageUrl}
        onClose={() => setZoomedImageUrl(null)}
      />
    </div>
  );
};

export default CBTSimulation;
