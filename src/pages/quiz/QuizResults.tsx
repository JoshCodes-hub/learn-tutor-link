import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RateQuizDialog } from "@/components/student/RateQuizDialog";
import {
  BookOpen,
  Sparkles,
  Trophy,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
  RotateCcw,
  Home,
  Star
} from "lucide-react";

interface AttemptData {
  id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_spent_seconds: number | null;
  mode: string;
  quiz: {
    id: string;
    title: string;
    course: {
      code: string;
      name: string;
    };
  };
}

const QuizResults = () => {
  const { quizId, attemptId } = useParams<{ quizId: string; attemptId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRating, setShowRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!attemptId || !user || !quizId) return;

      try {
        const { data, error } = await supabase
          .from("quiz_attempts")
          .select("*, quizzes(id, title, courses(code, name))")
          .eq("id", attemptId)
          .eq("user_id", user.id)
          .single();

        if (error) throw error;

        setAttempt({
          ...data,
          quiz: {
            id: data.quizzes.id,
            title: data.quizzes.title,
            course: data.quizzes.courses as { code: string; name: string }
          }
        });

        // Check if user already rated this quiz
        const { data: ratingData } = await supabase
          .from("quiz_ratings")
          .select("id")
          .eq("quiz_id", quizId)
          .eq("user_id", user.id)
          .maybeSingle();

        setHasRated(!!ratingData);

        // Show rating prompt after a short delay if not already rated
        if (!ratingData) {
          setTimeout(() => setShowRating(true), 1500);
        }
      } catch (error) {
        console.error("Error fetching results:", error);
        navigate("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [attemptId, user, quizId, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Results not found</p>
      </div>
    );
  }

  const percentage = Math.round((attempt.correct_answers / attempt.total_questions) * 100);
  const isPassing = percentage >= 50;
  const isExcellent = percentage >= 80;
  const timeMinutes = attempt.time_spent_seconds 
    ? Math.floor(attempt.time_spent_seconds / 60) 
    : 0;
  const timeSeconds = attempt.time_spent_seconds 
    ? attempt.time_spent_seconds % 60 
    : 0;

  const getMessage = () => {
    if (percentage >= 90) return "Outstanding! You're exam-ready!";
    if (percentage >= 80) return "Excellent work! Keep it up!";
    if (percentage >= 70) return "Good job! You're getting there!";
    if (percentage >= 60) return "Not bad! A bit more practice will help.";
    if (percentage >= 50) return "You passed! But there's room for improvement.";
    return "Keep practicing! You'll get better.";
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>

            <a href="/" className="flex items-center gap-2 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-md">
                  <BookOpen className="w-5 h-5 text-primary-foreground" />
                </div>
                <Sparkles className="w-4 h-4 text-accent absolute -top-1 -right-1 animate-pulse-subtle" />
              </div>
            </a>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="bg-card rounded-3xl border border-border shadow-xl overflow-hidden">
          {/* Score Header */}
          <div className={`p-8 text-center ${
            isExcellent 
              ? "bg-gradient-primary" 
              : isPassing 
              ? "bg-gradient-accent" 
              : "bg-destructive"
          } text-white`}>
            <div className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
              {isExcellent ? (
                <Trophy className="w-10 h-10" />
              ) : isPassing ? (
                <Target className="w-10 h-10" />
              ) : (
                <XCircle className="w-10 h-10" />
              )}
            </div>
            
            <h1 className="font-display text-5xl font-bold mb-2">{percentage}%</h1>
            <p className="text-lg opacity-90">{getMessage()}</p>
          </div>

          {/* Details */}
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="font-display text-xl font-bold text-foreground mb-1">
                {attempt.quiz.title}
              </h2>
              <p className="text-muted-foreground">
                {attempt.quiz.course.code} - {attempt.quiz.course.name}
              </p>
              <span className="inline-block mt-2 text-xs font-medium bg-muted px-2 py-1 rounded">
                {attempt.mode === "practice" ? "Practice Mode" : "CBT Simulation"}
              </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <p className="font-display text-2xl font-bold text-foreground">
                  {attempt.correct_answers}
                </p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <p className="font-display text-2xl font-bold text-foreground">
                  {attempt.total_questions - attempt.correct_answers}
                </p>
                <p className="text-xs text-muted-foreground">Incorrect</p>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <p className="font-display text-2xl font-bold text-foreground">
                  {timeMinutes}:{timeSeconds.toString().padStart(2, "0")}
                </p>
                <p className="text-xs text-muted-foreground">Time</p>
              </div>
            </div>

            {/* Rate Quiz Button */}
            <div className="mb-6">
              <Button
                variant={hasRated ? "outline" : "secondary"}
                className="w-full"
                onClick={() => setShowRating(true)}
              >
                <Star className={`w-4 h-4 mr-2 ${hasRated ? "fill-accent text-accent" : ""}`} />
                {hasRated ? "Update Your Rating" : "Rate This Quiz"}
              </Button>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="default"
                className="flex-1"
                onClick={() => navigate(`/quiz/${quizId}/practice`)}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate("/dashboard")}
              >
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Rating Dialog */}
      {quizId && attempt && (
        <RateQuizDialog
          open={showRating}
          onOpenChange={(open) => {
            setShowRating(open);
            if (!open) setHasRated(true);
          }}
          quizId={quizId}
          quizTitle={attempt.quiz.title}
        />
      )}
    </div>
  );
};

export default QuizResults;
