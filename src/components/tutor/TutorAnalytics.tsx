import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, BarChart3, TrendingUp, Users, Target, BookOpen, AlertTriangle } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";

interface QuizPerformance {
  quizId: string;
  quizTitle: string;
  totalAttempts: number;
  averageScore: number;
  completionRate: number;
  tokensEarned: number;
}

interface QuestionDifficulty {
  questionId: string;
  questionText: string;
  correctRate: number;
  totalAnswers: number;
  difficulty: string;
}

interface EngagementMetrics {
  date: string;
  attempts: number;
  uniqueStudents: number;
}

interface DifficultyDistribution {
  difficulty: string;
  count: number;
  avgCorrectRate: number;
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const TutorAnalytics = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [quizPerformance, setQuizPerformance] = useState<QuizPerformance[]>([]);
  const [questionDifficulty, setQuestionDifficulty] = useState<QuestionDifficulty[]>([]);
  const [engagementData, setEngagementData] = useState<EngagementMetrics[]>([]);
  const [difficultyDistribution, setDifficultyDistribution] = useState<DifficultyDistribution[]>([]);
  const [reportStats, setReportStats] = useState({ pending: 0, resolved: 0, total: 0 });

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Fetch tutor's quizzes with attempts
      const { data: quizzes } = await supabase
        .from("quizzes")
        .select("id, title, token_cost, is_premium")
        .eq("tutor_id", user.id);

      if (quizzes) {
        const performanceData: QuizPerformance[] = [];

        for (const quiz of quizzes) {
          const { data: attempts, count: attemptCount } = await supabase
            .from("quiz_attempts")
            .select("*", { count: "exact" })
            .eq("quiz_id", quiz.id);

          if (attempts && attemptCount) {
            const completedAttempts = attempts.filter(a => a.completed_at);
            const avgScore = completedAttempts.length > 0
              ? completedAttempts.reduce((sum, a) => sum + a.score, 0) / completedAttempts.length
              : 0;
            const completionRate = attemptCount > 0
              ? (completedAttempts.length / attemptCount) * 100
              : 0;

            performanceData.push({
              quizId: quiz.id,
              quizTitle: quiz.title.length > 20 ? quiz.title.substring(0, 20) + "..." : quiz.title,
              totalAttempts: attemptCount,
              averageScore: Math.round(avgScore),
              completionRate: Math.round(completionRate),
              tokensEarned: quiz.is_premium ? attemptCount * quiz.token_cost : 0,
            });
          }
        }
        setQuizPerformance(performanceData);
      }

      // Fetch question difficulty stats
      const { data: questions } = await supabase
        .from("questions")
        .select("id, question_text, difficulty")
        .eq("tutor_id", user.id);

      if (questions) {
        const difficultyData: QuestionDifficulty[] = [];
        const diffDist: Record<string, { count: number; correctRates: number[] }> = {
          easy: { count: 0, correctRates: [] },
          medium: { count: 0, correctRates: [] },
          hard: { count: 0, correctRates: [] },
        };

        for (const question of questions.slice(0, 50)) { // Limit to 50 for performance
          const { data: answers, count } = await supabase
            .from("quiz_answers")
            .select("is_correct", { count: "exact" })
            .eq("question_id", question.id);

          if (answers && count && count > 5) {
            const correctCount = answers.filter(a => a.is_correct).length;
            const correctRate = (correctCount / count) * 100;

            difficultyData.push({
              questionId: question.id,
              questionText: question.question_text.substring(0, 50) + "...",
              correctRate: Math.round(correctRate),
              totalAnswers: count,
              difficulty: question.difficulty,
            });

            if (diffDist[question.difficulty]) {
              diffDist[question.difficulty].count++;
              diffDist[question.difficulty].correctRates.push(correctRate);
            }
          }
        }

        // Sort by correct rate to find hardest questions
        difficultyData.sort((a, b) => a.correctRate - b.correctRate);
        setQuestionDifficulty(difficultyData.slice(0, 10));

        // Calculate difficulty distribution
        setDifficultyDistribution(
          Object.entries(diffDist).map(([difficulty, data]) => ({
            difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
            count: data.count,
            avgCorrectRate: data.correctRates.length > 0
              ? Math.round(data.correctRates.reduce((a, b) => a + b, 0) / data.correctRates.length)
              : 0,
          }))
        );
      }

      // Fetch engagement over time (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (quizzes) {
        const quizIds = quizzes.map(q => q.id);
        const { data: recentAttempts } = await supabase
          .from("quiz_attempts")
          .select("started_at, user_id")
          .in("quiz_id", quizIds)
          .gte("started_at", thirtyDaysAgo.toISOString());

        if (recentAttempts) {
          const dailyData: Record<string, { attempts: number; students: Set<string> }> = {};

          recentAttempts.forEach(attempt => {
            const date = attempt.started_at.split("T")[0];
            if (!dailyData[date]) {
              dailyData[date] = { attempts: 0, students: new Set() };
            }
            dailyData[date].attempts++;
            dailyData[date].students.add(attempt.user_id);
          });

          const engagementArray = Object.entries(dailyData)
            .map(([date, data]) => ({
              date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              attempts: data.attempts,
              uniqueStudents: data.students.size,
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          setEngagementData(engagementArray.slice(-14)); // Last 14 days
        }
      }

      // Fetch report stats
      const { data: reports } = await supabase
        .from("question_reports")
        .select("status, questions!inner(tutor_id)")
        .eq("questions.tutor_id", user.id);

      if (reports) {
        setReportStats({
          total: reports.length,
          pending: reports.filter(r => r.status === "pending").length,
          resolved: reports.filter(r => r.status === "resolved").length,
        });
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    attempts: { label: "Attempts", color: "hsl(var(--chart-1))" },
    uniqueStudents: { label: "Unique Students", color: "hsl(var(--chart-2))" },
    averageScore: { label: "Avg Score", color: "hsl(var(--chart-3))" },
    completionRate: { label: "Completion %", color: "hsl(var(--chart-4))" },
    correctRate: { label: "Correct Rate", color: "hsl(var(--chart-5))" },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Analytics Dashboard
        </CardTitle>
        <CardDescription>Track your quiz performance and student engagement</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="difficulty">Difficulty</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {/* Quiz Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            {quizPerformance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No quiz data available yet</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Attempts</p>
                    <p className="text-2xl font-bold">
                      {quizPerformance.reduce((sum, q) => sum + q.totalAttempts, 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Avg Score</p>
                    <p className="text-2xl font-bold">
                      {Math.round(
                        quizPerformance.reduce((sum, q) => sum + q.averageScore, 0) / quizPerformance.length
                      )}%
                    </p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Tokens Earned</p>
                    <p className="text-2xl font-bold">
                      {quizPerformance.reduce((sum, q) => sum + q.tokensEarned, 0)}
                    </p>
                  </div>
                </div>

                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={quizPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="quizTitle" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="totalAttempts" fill="hsl(var(--chart-1))" name="Attempts" />
                      <Bar dataKey="averageScore" fill="hsl(var(--chart-2))" name="Avg Score %" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </>
            )}
          </TabsContent>

          {/* Question Difficulty Tab */}
          <TabsContent value="difficulty" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Difficulty Distribution Pie Chart */}
              <div>
                <h4 className="font-medium mb-4">Question Distribution by Difficulty</h4>
                {difficultyDistribution.some(d => d.count > 0) ? (
                  <ChartContainer config={chartConfig} className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={difficultyDistribution.filter(d => d.count > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          dataKey="count"
                          nameKey="difficulty"
                          label={({ difficulty, count }) => `${difficulty}: ${count}`}
                        >
                          {difficultyDistribution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Not enough data yet</p>
                  </div>
                )}
              </div>

              {/* Hardest Questions */}
              <div>
                <h4 className="font-medium mb-4">Hardest Questions (by correct rate)</h4>
                {questionDifficulty.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Not enough answer data yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[250px] overflow-y-auto">
                    {questionDifficulty.slice(0, 5).map((q, index) => (
                      <div key={q.questionId} className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">#{index + 1}</span>
                          <Badge variant={q.correctRate < 40 ? "destructive" : q.correctRate < 60 ? "default" : "secondary"}>
                            {q.correctRate}% correct
                          </Badge>
                        </div>
                        <p className="text-sm line-clamp-2">{q.questionText}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {q.totalAnswers} answers • {q.difficulty}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Engagement Tab */}
          <TabsContent value="engagement" className="space-y-4">
            {engagementData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No engagement data available yet</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      Last 14 Days Attempts
                    </p>
                    <p className="text-2xl font-bold">
                      {engagementData.reduce((sum, d) => sum + d.attempts, 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Avg Daily Students
                    </p>
                    <p className="text-2xl font-bold">
                      {Math.round(
                        engagementData.reduce((sum, d) => sum + d.uniqueStudents, 0) / engagementData.length
                      )}
                    </p>
                  </div>
                </div>

                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={engagementData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="attempts"
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Attempts"
                      />
                      <Line
                        type="monotone"
                        dataKey="uniqueStudents"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Unique Students"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </>
            )}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-accent" />
                <p className="text-2xl font-bold">{reportStats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <Target className="w-6 h-6 mx-auto mb-2 text-success" />
                <p className="text-2xl font-bold">{reportStats.resolved}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <BookOpen className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{reportStats.total}</p>
                <p className="text-sm text-muted-foreground">Total Reports</p>
              </div>
            </div>

            {reportStats.pending > 0 && (
              <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg">
                <p className="text-sm">
                  <AlertTriangle className="w-4 h-4 inline mr-2 text-accent" />
                  You have <strong>{reportStats.pending}</strong> pending question reports to review.
                  Check the Question Reports section below.
                </p>
              </div>
            )}

            {reportStats.total > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Resolution Rate</span>
                  <span className="font-medium">
                    {Math.round((reportStats.resolved / reportStats.total) * 100)}%
                  </span>
                </div>
                <Progress value={(reportStats.resolved / reportStats.total) * 100} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TutorAnalytics;
