import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  Users,
  GraduationCap,
  BookOpen,
  Brain,
  TrendingUp,
  Coins,
  Target,
  FileText,
} from "lucide-react";

interface AnalyticsData {
  totalStudents: number;
  totalTutors: number;
  totalCourses: number;
  totalTopics: number;
  totalQuestions: number;
  approvedQuestions: number;
  totalQuizzes: number;
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  totalTokensSpent: number;
  platformRevenue: number;
  topCourses: { code: string; name: string; attempts: number }[];
  recentActivity: { type: string; description: string; date: string }[];
}

export function PlatformAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Parallel fetch all counts
        const [
          studentsResult,
          tutorsResult,
          coursesResult,
          topicsResult,
          questionsResult,
          approvedQuestionsResult,
          quizzesResult,
          attemptsResult,
          commissionResult,
        ] = await Promise.all([
          supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "student"),
          supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "tutor"),
          supabase.from("courses").select("*", { count: "exact", head: true }),
          supabase.from("topics").select("*", { count: "exact", head: true }),
          supabase.from("questions").select("*", { count: "exact", head: true }),
          supabase.from("questions").select("*", { count: "exact", head: true }).eq("is_approved", true),
          supabase.from("quizzes").select("*", { count: "exact", head: true }),
          supabase.from("quiz_attempts").select("*"),
          supabase.from("platform_settings").select("value").eq("key", "tutor_commission_rate").single(),
        ]);

        const attempts = attemptsResult.data || [];
        const completedAttempts = attempts.filter((a) => a.completed_at);
        const totalCorrect = completedAttempts.reduce((sum, a) => sum + a.correct_answers, 0);
        const totalQuestions = completedAttempts.reduce((sum, a) => sum + a.total_questions, 0);
        const averageScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

        // Calculate revenue
        const { data: premiumQuizzes } = await supabase
          .from("quizzes")
          .select("id, token_cost, course_id")
          .eq("is_premium", true);

        let totalTokensSpent = 0;
        const courseAttempts: Record<string, number> = {};

        if (premiumQuizzes) {
          for (const quiz of premiumQuizzes) {
            const { count } = await supabase
              .from("quiz_attempts")
              .select("*", { count: "exact", head: true })
              .eq("quiz_id", quiz.id);
            totalTokensSpent += (count || 0) * quiz.token_cost;
          }
        }

        // Get top courses by attempts
        const { data: coursesData } = await supabase.from("courses").select("id, code, name");
        const topCourses: { code: string; name: string; attempts: number }[] = [];

        if (coursesData) {
          for (const course of coursesData) {
            const { data: courseQuizzes } = await supabase
              .from("quizzes")
              .select("id")
              .eq("course_id", course.id);

            let courseAttemptCount = 0;
            if (courseQuizzes) {
              for (const quiz of courseQuizzes) {
                const { count } = await supabase
                  .from("quiz_attempts")
                  .select("*", { count: "exact", head: true })
                  .eq("quiz_id", quiz.id);
                courseAttemptCount += count || 0;
              }
            }

            if (courseAttemptCount > 0) {
              topCourses.push({
                code: course.code,
                name: course.name,
                attempts: courseAttemptCount,
              });
            }
          }
        }

        topCourses.sort((a, b) => b.attempts - a.attempts);

        const commissionRate = parseInt(commissionResult.data?.value || "80");
        const platformRevenue = Math.round(totalTokensSpent * ((100 - commissionRate) / 100));

        // Get recent activity
        const { data: recentApps } = await supabase
          .from("tutor_applications")
          .select("full_name, created_at")
          .order("created_at", { ascending: false })
          .limit(3);

        const { data: recentAttempts } = await supabase
          .from("quiz_attempts")
          .select("started_at, quizzes(title)")
          .order("started_at", { ascending: false })
          .limit(3);

        const recentActivity: { type: string; description: string; date: string }[] = [];

        recentApps?.forEach((app) => {
          recentActivity.push({
            type: "application",
            description: `${app.full_name} applied as tutor`,
            date: app.created_at,
          });
        });

        recentAttempts?.forEach((attempt) => {
          recentActivity.push({
            type: "attempt",
            description: `Quiz attempted: ${(attempt.quizzes as any)?.title || "Unknown"}`,
            date: attempt.started_at,
          });
        });

        recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setData({
          totalStudents: studentsResult.count || 0,
          totalTutors: tutorsResult.count || 0,
          totalCourses: coursesResult.count || 0,
          totalTopics: topicsResult.count || 0,
          totalQuestions: questionsResult.count || 0,
          approvedQuestions: approvedQuestionsResult.count || 0,
          totalQuizzes: quizzesResult.count || 0,
          totalAttempts: attempts.length,
          completedAttempts: completedAttempts.length,
          averageScore,
          totalTokensSpent,
          platformRevenue,
          topCourses: topCourses.slice(0, 5),
          recentActivity: recentActivity.slice(0, 5),
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-muted-foreground">Failed to load analytics</p>;
  }

  return (
    <div className="space-y-6">
      {/* User Stats */}
      <div>
        <h3 className="font-display font-semibold text-foreground mb-4">Users</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="w-5 h-5 text-primary" />}
            value={data.totalStudents}
            label="Students"
            bgColor="bg-primary/10"
          />
          <StatCard
            icon={<GraduationCap className="w-5 h-5 text-accent" />}
            value={data.totalTutors}
            label="Tutors"
            bgColor="bg-accent/10"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-success" />}
            value={data.completedAttempts}
            label="Quizzes Completed"
            bgColor="bg-success/10"
          />
          <StatCard
            icon={<Target className="w-5 h-5 text-destructive" />}
            value={`${data.averageScore}%`}
            label="Avg. Score"
            bgColor="bg-destructive/10"
          />
        </div>
      </div>

      {/* Content Stats */}
      <div>
        <h3 className="font-display font-semibold text-foreground mb-4">Content</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<BookOpen className="w-5 h-5 text-primary" />}
            value={data.totalCourses}
            label="Courses"
            bgColor="bg-primary/10"
          />
          <StatCard
            icon={<FileText className="w-5 h-5 text-accent" />}
            value={data.totalTopics}
            label="Topics"
            bgColor="bg-accent/10"
          />
          <StatCard
            icon={<Brain className="w-5 h-5 text-success" />}
            value={`${data.approvedQuestions}/${data.totalQuestions}`}
            label="Questions (Approved)"
            bgColor="bg-success/10"
          />
          <StatCard
            icon={<Target className="w-5 h-5 text-muted-foreground" />}
            value={data.totalQuizzes}
            label="Quizzes"
            bgColor="bg-muted"
          />
        </div>
      </div>

      {/* Revenue Stats */}
      <div>
        <h3 className="font-display font-semibold text-foreground mb-4">Revenue</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Coins className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-3xl font-display font-bold text-foreground">
                  {data.totalTokensSpent}
                </p>
                <p className="text-muted-foreground">Total Tokens Spent</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-3xl font-display font-bold text-foreground">
                  {data.platformRevenue}
                </p>
                <p className="text-muted-foreground">Platform Revenue (tokens)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Courses & Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Top Courses</h3>
          {data.topCourses.length === 0 ? (
            <p className="text-muted-foreground text-sm">No course activity yet</p>
          ) : (
            <div className="space-y-3">
              {data.topCourses.map((course, index) => (
                <div
                  key={course.code}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground font-medium">{index + 1}.</span>
                    <div>
                      <p className="font-medium text-foreground">{course.code}</p>
                      <p className="text-sm text-muted-foreground">{course.name}</p>
                    </div>
                  </div>
                  <span className="text-accent font-semibold">{course.attempts} attempts</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Recent Activity</h3>
          {data.recentActivity.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {data.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === "application" ? "bg-accent" : "bg-primary"
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-foreground text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.date).toLocaleDateString()} at{" "}
                      {new Date(activity.date).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  bgColor,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  bgColor: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <p className="font-display text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}