import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Sparkles,
  LogOut,
  Users,
  GraduationCap,
  FileText,
  Settings,
  BarChart3,
  Loader2,
  TrendingUp,
  Coins,
  Brain,
  Wallet,
  Banknote,
  Shield,
} from "lucide-react";
import { TutorManagement } from "@/components/admin/TutorManagement";
import { CourseModeration } from "@/components/admin/CourseModeration";
import { QuestionModeration } from "@/components/admin/QuestionModeration";
import { PlatformSettings } from "@/components/admin/PlatformSettings";
import { PlatformAnalytics } from "@/components/admin/PlatformAnalytics";
import { TokenPurchaseManagement } from "@/components/admin/TokenPurchaseManagement";
import { WithdrawalManagement } from "@/components/admin/WithdrawalManagement";
import { AuditLogs } from "@/components/admin/AuditLogs";

interface DashboardStats {
  totalStudents: number;
  totalTutors: number;
  totalCourses: number;
  totalQuestions: number;
  totalQuizAttempts: number;
  pendingApplications: number;
  pendingPurchases: number;
  pendingWithdrawals: number;
  totalRevenue: number;
  platformRevenue: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, signOut, hasRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTutors: 0,
    totalCourses: 0,
    totalQuestions: 0,
    totalQuizAttempts: 0,
    pendingApplications: 0,
    pendingPurchases: 0,
    pendingWithdrawals: 0,
    totalRevenue: 0,
    platformRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && user && !hasRole("admin")) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate, hasRole]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !hasRole("admin")) return;

      try {
        // Fetch all counts in parallel
        const [
          studentsResult,
          tutorsResult,
          coursesResult,
          questionsResult,
          attemptsResult,
          applicationsResult,
          purchasesResult,
          withdrawalsResult,
          commissionResult,
        ] = await Promise.all([
          supabase
            .from("user_roles")
            .select("*", { count: "exact", head: true })
            .eq("role", "student"),
          supabase
            .from("user_roles")
            .select("*", { count: "exact", head: true })
            .eq("role", "tutor"),
          supabase.from("courses").select("*", { count: "exact", head: true }),
          supabase.from("questions").select("*", { count: "exact", head: true }),
          supabase.from("quiz_attempts").select("*", { count: "exact", head: true }),
          supabase
            .from("tutor_applications")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from("token_purchase_requests")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from("withdrawal_requests")
            .select("*", { count: "exact", head: true })
            .in("status", ["pending", "approved"]),
          supabase
            .from("platform_settings")
            .select("value")
            .eq("key", "tutor_commission_rate")
            .single(),
        ]);

        // Calculate revenue from premium quiz attempts
        const { data: premiumQuizzes } = await supabase
          .from("quizzes")
          .select("id, token_cost")
          .eq("is_premium", true);

        let totalRevenue = 0;
        if (premiumQuizzes) {
          for (const quiz of premiumQuizzes) {
            const { count } = await supabase
              .from("quiz_attempts")
              .select("*", { count: "exact", head: true })
              .eq("quiz_id", quiz.id);
            totalRevenue += (count || 0) * quiz.token_cost;
          }
        }

        const commissionRate = parseInt(commissionResult.data?.value || "80");
        const platformRevenue = Math.round(totalRevenue * ((100 - commissionRate) / 100));

        setStats({
          totalStudents: studentsResult.count || 0,
          totalTutors: tutorsResult.count || 0,
          totalCourses: coursesResult.count || 0,
          totalQuestions: questionsResult.count || 0,
          totalQuizAttempts: attemptsResult.count || 0,
          pendingApplications: applicationsResult.count || 0,
          pendingPurchases: purchasesResult.count || 0,
          pendingWithdrawals: withdrawalsResult.count || 0,
          totalRevenue,
          platformRevenue,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user && hasRole("admin")) {
      fetchStats();
    }
  }, [user, hasRole]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-md">
                  <BookOpen className="w-5 h-5 text-primary-foreground" />
                </div>
                <Sparkles className="w-4 h-4 text-accent absolute -top-1 -right-1 animate-pulse-subtle" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-lg text-foreground leading-tight">
                  OverraPrep AI
                </span>
                <span className="text-xs text-destructive font-medium">Admin Portal</span>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage tutors, moderate content, and monitor platform performance.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{stats.totalStudents}</p>
            <p className="text-sm text-muted-foreground">Students</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-accent" />
              </div>
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{stats.totalTutors}</p>
            <p className="text-sm text-muted-foreground">Tutors</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-success" />
              </div>
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{stats.totalQuizAttempts}</p>
            <p className="text-sm text-muted-foreground">Quiz Attempts</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                <Coins className="w-5 h-5 text-destructive" />
              </div>
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{stats.platformRevenue}</p>
            <p className="text-sm text-muted-foreground">Platform Revenue</p>
          </div>
        </div>

        {/* Pending Applications Alert */}
        {stats.pendingApplications > 0 && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-6 h-6 text-accent" />
              <div>
                <p className="font-medium text-foreground">
                  {stats.pendingApplications} pending tutor application{stats.pendingApplications > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-muted-foreground">Review and approve new tutors</p>
              </div>
            </div>
            <Button variant="accent" onClick={() => setActiveTab("tutors")}>
              Review Now
            </Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="mb-6 inline-flex w-max md:w-auto md:flex-wrap">
              <TabsTrigger value="overview" className="flex items-center gap-2 text-xs md:text-sm">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Analytics</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="tutors" className="flex items-center gap-2 text-xs md:text-sm">
                <GraduationCap className="w-4 h-4" />
                Tutors
              </TabsTrigger>
              <TabsTrigger value="tokens" className="flex items-center gap-2 text-xs md:text-sm">
                <Coins className="w-4 h-4" />
                Tokens {stats.pendingPurchases > 0 && `(${stats.pendingPurchases})`}
              </TabsTrigger>
              <TabsTrigger value="withdrawals" className="flex items-center gap-2 text-xs md:text-sm">
                <Banknote className="w-4 h-4" />
                <span className="hidden sm:inline">Withdrawals</span>
                <span className="sm:hidden">Payouts</span>
                {stats.pendingWithdrawals > 0 && ` (${stats.pendingWithdrawals})`}
              </TabsTrigger>
              <TabsTrigger value="courses" className="flex items-center gap-2 text-xs md:text-sm">
                <BookOpen className="w-4 h-4" />
                Courses
              </TabsTrigger>
              <TabsTrigger value="questions" className="flex items-center gap-2 text-xs md:text-sm">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Questions</span>
                <span className="sm:hidden">Q&A</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2 text-xs md:text-sm">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
                <span className="sm:hidden">⚙️</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2 text-xs md:text-sm">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Audit Logs</span>
                <span className="sm:hidden">Logs</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <PlatformAnalytics />
          </TabsContent>

          <TabsContent value="tutors">
            <TutorManagement />
          </TabsContent>

          <TabsContent value="tokens">
            <TokenPurchaseManagement />
          </TabsContent>

          <TabsContent value="withdrawals">
            <WithdrawalManagement />
          </TabsContent>

          <TabsContent value="courses">
            <CourseModeration />
          </TabsContent>

          <TabsContent value="questions">
            <QuestionModeration />
          </TabsContent>

          <TabsContent value="settings">
            <PlatformSettings />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogs />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;