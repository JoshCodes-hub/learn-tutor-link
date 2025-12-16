import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  Brain,
  Target,
  TrendingDown,
  Lightbulb,
  ChevronRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  Lock,
  Coins,
} from "lucide-react";

interface WeakArea {
  topicId: string;
  topicName: string;
  course: string;
  accuracy: number;
  questionsAttempted: number;
}

interface Recommendation {
  quizTitle: string;
  course: string;
  reason: string;
  priority: "high" | "medium" | "low";
  quizId?: string;
  isPremium?: boolean;
  tokenCost?: number;
}

interface RecommendationData {
  analysis: string;
  recommendations: Recommendation[];
  motivationalTip: string;
  weakAreas: WeakArea[];
  performanceSummary: {
    totalAttempts: number;
    averageScore: number;
    courseStats: { course: string; accuracy: number; questionsAttempted: number }[];
  };
}

interface AIQuizRecommendationsProps {
  userId: string;
  onSelectQuiz?: (quizId: string) => void;
  onPurchaseQuiz?: (quizId: string) => void;
}

export function AIQuizRecommendations({ userId, onSelectQuiz, onPurchaseQuiz }: AIQuizRecommendationsProps) {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["quiz-recommendations", userId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("quiz-recommendations", {
        body: { userId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data as RecommendationData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Recommendations Updated",
        description: "Your personalized recommendations have been refreshed.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to refresh recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium":
        return "bg-accent/10 text-accent border-accent/20";
      default:
        return "bg-muted text-muted-foreground border-muted";
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <p className="text-foreground font-medium mb-2">Analyzing your performance...</p>
            <p className="text-sm text-muted-foreground">Our AI is preparing personalized recommendations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-destructive/5 border-destructive/20">
        <CardContent className="py-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-foreground font-medium">Unable to load recommendations</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error instanceof Error ? error.message : "Please try again later."}
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Study Recommendations</CardTitle>
              <p className="text-xs text-muted-foreground">Personalized for your learning journey</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Analysis */}
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground leading-relaxed">{data.analysis}</p>
          </div>
        </div>

        {/* Weak Areas */}
        {data.weakAreas.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-4 h-4 text-destructive" />
              <h4 className="text-sm font-semibold text-foreground">Areas to Improve</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.weakAreas.map((area) => (
                <div
                  key={area.topicId}
                  className="bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-1.5"
                >
                  <span className="text-sm font-medium text-foreground">{area.topicName}</span>
                  <span className="text-xs text-muted-foreground ml-2">({area.course})</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {area.accuracy}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Recommended Quizzes</h4>
          </div>
          <div className="space-y-3">
            {data.recommendations.map((rec, index) => (
              <div
                key={index}
                className="bg-card rounded-lg p-4 border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium text-foreground truncate">{rec.quizTitle}</h5>
                      <Badge className={getPriorityColor(rec.priority)} variant="outline">
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{rec.course}</p>
                    <p className="text-sm text-muted-foreground">{rec.reason}</p>
                  </div>
                  {rec.quizId && (
                    <div className="flex flex-col gap-2">
                      {rec.isPremium ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="whitespace-nowrap"
                          onClick={() => onPurchaseQuiz?.(rec.quizId!)}
                        >
                          <Coins className="w-3 h-3 mr-1" />
                          {rec.tokenCost} tokens
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="whitespace-nowrap"
                          onClick={() => onSelectQuiz?.(rec.quizId!)}
                        >
                          Start
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Motivational Tip */}
        <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground italic">{data.motivationalTip}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
