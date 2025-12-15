import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  Sparkles,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Brain,
  Lightbulb,
  Clock
} from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  topic: {
    name: string;
  } | null;
}

interface QuizData {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  course: {
    code: string;
    name: string;
  };
}

const QuizPractice = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchQuizData = async () => {
      if (!quizId || !user) return;

      try {
        // Fetch quiz details
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select("*, courses(code, name)")
          .eq("id", quizId)
          .single();

        if (quizError) throw quizError;

        // Check if premium quiz requires purchase
        if (quizData.is_premium) {
          const { data: purchase } = await supabase
            .from("student_quiz_purchases")
            .select("id")
            .eq("student_id", user.id)
            .eq("quiz_id", quizId)
            .maybeSingle();

          if (!purchase) {
            toast({
              variant: "destructive",
              title: "Quiz not purchased",
              description: "You need to purchase this premium quiz first.",
            });
            navigate("/student/dashboard");
            return;
          }
        }

        setQuiz({
          ...quizData,
          course: quizData.courses as { code: string; name: string }
        });

        // Fetch questions
        const { data: questionsData, error: questionsError } = await supabase
          .from("quiz_questions")
          .select("questions(*, topics(name))")
          .eq("quiz_id", quizId)
          .order("order_index");

        if (questionsError) throw questionsError;

        const formattedQuestions = questionsData.map((qq: any) => ({
          ...qq.questions,
          topic: qq.questions.topics
        }));

        setQuestions(formattedQuestions);

        // Create attempt
        const { data: attemptData, error: attemptError } = await supabase
          .from("quiz_attempts")
          .insert({
            user_id: user.id,
            quiz_id: quizId,
            mode: "practice",
            total_questions: formattedQuestions.length,
          })
          .select()
          .single();

        if (attemptError) throw attemptError;
        setAttemptId(attemptData.id);

      } catch (error) {
        console.error("Error fetching quiz:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load quiz. Please try again.",
        });
        navigate("/student/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizData();
  }, [quizId, user, navigate, toast]);

  const currentQuestion = questions[currentIndex];

  const handleSelectAnswer = (option: string) => {
    if (isAnswered) return;
    setSelectedAnswer(option);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !currentQuestion || !attemptId) return;

    const correct = selectedAnswer === currentQuestion.correct_option;
    setIsCorrect(correct);
    setIsAnswered(true);
    setScore(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1
    }));

    // Save answer
    await supabase.from("quiz_answers").insert({
      attempt_id: attemptId,
      question_id: currentQuestion.id,
      selected_option: selectedAnswer,
      is_correct: correct,
    });
  };

  const handleGetAIExplanation = async () => {
    if (!currentQuestion) return;
    
    setIsLoadingExplanation(true);
    setAiExplanation(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-explanation", {
        body: {
          question: currentQuestion.question_text,
          options: {
            A: currentQuestion.option_a,
            B: currentQuestion.option_b,
            C: currentQuestion.option_c,
            D: currentQuestion.option_d,
          },
          correctOption: currentQuestion.correct_option,
          userAnswer: selectedAnswer,
          topic: currentQuestion.topic?.name,
        },
      });

      if (error) throw error;
      setAiExplanation(data.explanation);
    } catch (error: any) {
      console.error("Error getting AI explanation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to get AI explanation. Try again.",
      });
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setIsCorrect(false);
      setAiExplanation(null);
    }
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setIsCorrect(false);
      setAiExplanation(null);
    }
  };

  const handleFinishQuiz = async () => {
    if (!attemptId) return;

    await supabase
      .from("quiz_attempts")
      .update({
        completed_at: new Date().toISOString(),
        correct_answers: score.correct,
        score: Math.round((score.correct / questions.length) * 100),
      })
      .eq("id", attemptId);

    navigate(`/quiz/${quizId}/results/${attemptId}`);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground font-medium mb-2">Quiz not found</p>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Exit Practice
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                {quiz.course.code}
              </span>
              <span className="font-display font-semibold text-foreground">
                {quiz.title}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-foreground font-medium">{score.correct}</span>
                <span className="text-muted-foreground">/ {score.total}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </span>
            {currentQuestion?.topic && (
              <span className="text-muted-foreground">
                Topic: {currentQuestion.topic.name}
              </span>
            )}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-primary transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="font-display text-xl font-semibold text-foreground mb-6 leading-relaxed">
            {currentQuestion?.question_text}
          </h2>

          {/* Options */}
          <div className="space-y-3">
            {options.map((option) => {
              const isSelected = selectedAnswer === option.key;
              const isCorrectAnswer = option.key === currentQuestion?.correct_option;
              
              let optionStyle = "border-border hover:border-primary/50 hover:bg-muted/50";
              
              if (isAnswered) {
                if (isCorrectAnswer) {
                  optionStyle = "border-success bg-success/10";
                } else if (isSelected && !isCorrectAnswer) {
                  optionStyle = "border-destructive bg-destructive/10";
                }
              } else if (isSelected) {
                optionStyle = "border-primary bg-primary/10";
              }

              return (
                <button
                  key={option.key}
                  onClick={() => handleSelectAnswer(option.key)}
                  disabled={isAnswered}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 ${optionStyle}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm ${
                      isAnswered && isCorrectAnswer
                        ? "bg-success text-success-foreground"
                        : isAnswered && isSelected && !isCorrectAnswer
                        ? "bg-destructive text-destructive-foreground"
                        : isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {option.key}
                    </span>
                    <span className="text-foreground flex-1 pt-1">{option.text}</span>
                    {isAnswered && isCorrectAnswer && (
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-1" />
                    )}
                    {isAnswered && isSelected && !isCorrectAnswer && (
                      <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-1" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Answer Feedback */}
        {isAnswered && (
          <div className={`rounded-xl p-4 mb-6 ${
            isCorrect ? "bg-success/10 border border-success/20" : "bg-destructive/10 border border-destructive/20"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span className="font-semibold text-success">Correct!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-destructive" />
                  <span className="font-semibold text-destructive">Incorrect</span>
                </>
              )}
            </div>
            
            {currentQuestion?.explanation && (
              <p className="text-sm text-muted-foreground mb-3">
                {currentQuestion.explanation}
              </p>
            )}

            {/* AI Explanation */}
            {!aiExplanation ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGetAIExplanation}
                disabled={isLoadingExplanation}
              >
                {isLoadingExplanation ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2 text-accent" />
                )}
                Get AI Explanation
              </Button>
            ) : (
              <div className="mt-4 p-4 bg-card rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-accent" />
                  <span className="font-medium text-foreground text-sm">AI Explanation</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {aiExplanation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handlePrevQuestion}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Previous
          </Button>

          {!isAnswered ? (
            <Button
              variant="hero"
              onClick={handleSubmitAnswer}
              disabled={!selectedAnswer}
            >
              Submit Answer
            </Button>
          ) : currentIndex < questions.length - 1 ? (
            <Button variant="hero" onClick={handleNextQuestion}>
              Next Question
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          ) : (
            <Button variant="accent" onClick={handleFinishQuiz}>
              Finish Quiz
            </Button>
          )}

          <div className="w-24" /> {/* Spacer for alignment */}
        </div>
      </main>
    </div>
  );
};

export default QuizPractice;
