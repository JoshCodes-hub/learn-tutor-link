import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Plus,
  Users,
  Coins,
  TrendingUp,
  FileText,
  ChevronRight,
  Loader2,
  Edit,
  Eye,
  GraduationCap,
  BarChart3,
  User,
  Sparkles
} from "lucide-react";
import logo from "@/assets/logo.png";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { CreateCourseDialog } from "@/components/tutor/CreateCourseDialog";
import { CreateQuizDialog } from "@/components/tutor/CreateQuizDialog";
import { EditQuizDialog } from "@/components/tutor/EditQuizDialog";
import { DeleteQuizDialog } from "@/components/tutor/DeleteQuizDialog";
import { UploadQuestionsDialog } from "@/components/tutor/UploadQuestionsDialog";
import { WithdrawalRequestDialog } from "@/components/tutor/WithdrawalRequestDialog";
import { QuickQuizCreator } from "@/components/tutor/QuickQuizCreator";
import { UnifiedQuizCreator } from "@/components/tutor/UnifiedQuizCreator";
import { BulkQuizImport } from "@/components/tutor/BulkQuizImport";
import QuestionReports from "@/components/tutor/QuestionReports";
import TutorAnalytics from "@/components/tutor/TutorAnalytics";
import QuizManagement from "@/components/tutor/QuizManagement";
import { TutorCommunityManager } from "@/components/tutor/TutorCommunityManager";
import { OnboardingChecklist } from "@/components/tutor/OnboardingChecklist";
import { SkeletonDashboard } from "@/components/ui/premium-skeletons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

interface Course {
  id: string;
  code: string;
  name: string;
  department: string | null;
  description: string | null;
  topics_count: number;
  questions_count: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  token_cost: number;
  is_premium: boolean;
  question_count: number;
  duration_minutes: number;
  is_active: boolean;
  attempts_count: number;
  course: {
    code: string;
    name: string;
  };
}

interface EarningsData {
  totalEarnings: number;
  thisMonthEarnings: number;
  totalStudents: number;
  totalAttempts: number;
}

const TutorDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, signOut, hasRole } = useAuth();
  const { showOnboarding, completeOnboarding } = useOnboarding(user?.id);
  const [courses, setCourses] = useState<Course[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [earnings, setEarnings] = useState<EarningsData>({
    totalEarnings: 0,
    thisMonthEarnings: 0,
    totalStudents: 0,
    totalAttempts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  const [showEditQuiz, setShowEditQuiz] = useState(false);
  const [showDeleteQuiz, setShowDeleteQuiz] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [showUploadQuestions, setShowUploadQuestions] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [showQuickQuizCreator, setShowQuickQuizCreator] = useState(false);
  const [showUnifiedQuizCreator, setShowUnifiedQuizCreator] = useState(false);
  const [showBulkQuizImport, setShowBulkQuizImport] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && user && !hasRole("tutor") && !hasRole("admin")) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate, hasRole]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Fetch courses created by this tutor
        const { data: coursesData } = await supabase
          .from("courses")
          .select("*")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false });

        if (coursesData) {
          // Get topics and questions count for each course
          const coursesWithCounts = await Promise.all(
            coursesData.map(async (course) => {
              const { count: topicsCount } = await supabase
                .from("topics")
                .select("*", { count: "exact", head: true })
                .eq("course_id", course.id);

              const { count: questionsCount } = await supabase
                .from("questions")
                .select("*", { count: "exact", head: true })
                .eq("course_id", course.id);

              return {
                ...course,
                topics_count: topicsCount || 0,
                questions_count: questionsCount || 0,
              };
            })
          );
          setCourses(coursesWithCounts);
        }

        // Fetch quizzes created by this tutor
        const { data: quizzesData } = await supabase
          .from("quizzes")
          .select("*, courses(code, name)")
          .eq("tutor_id", user.id)
          .order("created_at", { ascending: false });

        if (quizzesData) {
          // Get attempts count for each quiz
          const quizzesWithAttempts = await Promise.all(
            quizzesData.map(async (quiz) => {
              const { count: attemptsCount } = await supabase
                .from("quiz_attempts")
                .select("*", { count: "exact", head: true })
                .eq("quiz_id", quiz.id);

              return {
                ...quiz,
                attempts_count: attemptsCount || 0,
                course: quiz.courses as { code: string; name: string },
              };
            })
          );
          setQuizzes(quizzesWithAttempts);

          // Calculate earnings
          let totalEarnings = 0;
          let thisMonthEarnings = 0;
          let totalAttempts = 0;
          const uniqueStudents = new Set<string>();
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          for (const quiz of quizzesWithAttempts) {
            if (quiz.is_premium && quiz.token_cost > 0) {
              const { data: attempts } = await supabase
                .from("quiz_attempts")
                .select("user_id, started_at")
                .eq("quiz_id", quiz.id);

              if (attempts) {
                attempts.forEach((attempt) => {
                  uniqueStudents.add(attempt.user_id);
                  totalAttempts++;
                  totalEarnings += quiz.token_cost;
                  
                  const attemptDate = new Date(attempt.started_at);
                  if (attemptDate >= startOfMonth) {
                    thisMonthEarnings += quiz.token_cost;
                  }
                });
              }
            }
          }

          setEarnings({
            totalEarnings,
            thisMonthEarnings,
            totalStudents: uniqueStudents.size,
            totalAttempts,
          });

          // Fetch actual earnings from tutor_earnings table
          const { data: earningsData } = await supabase
            .from("tutor_earnings")
            .select("tutor_share")
            .eq("tutor_id", user.id);

          if (earningsData) {
            const actualEarnings = earningsData.reduce((sum, e) => sum + e.tutor_share, 0);
            setWalletBalance(actualEarnings);
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const refreshData = () => {
    setIsLoading(true);
    // Re-trigger the useEffect
    const event = new Event("refresh");
    window.dispatchEvent(event);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SkeletonDashboard />
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Tutor Dashboard"
        description="Manage your courses, create quizzes, and track your earnings on OverraPrep AI."
        noindex={true}
        url="https://overraprep.com/tutor/dashboard"
      />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-50" role="banner">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center group">
              <img 
                src={logo} 
                alt="OverraPrep AI FUTA" 
                className="h-10 w-auto object-contain"
              />
            </Link>

            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/profile/edit")} className="hidden sm:flex">
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate("/profile/edit")} className="sm:hidden">
                <User className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => signOut()} className="hidden sm:flex">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
              <Button variant="ghost" size="icon" onClick={() => signOut()} className="sm:hidden">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <DashboardNav role="tutor" />
      <DashboardBreadcrumb role="tutor" />

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Welcome, {profile?.full_name || "Tutor"}! 👨‍🏫
          </h1>
          <p className="text-muted-foreground">
            Manage your courses, upload questions, and track student performance.
          </p>
        </div>

        {/* Onboarding Checklist */}
        <OnboardingChecklist
          onCreateCourse={() => setShowCreateCourse(true)}
          onCreateQuiz={() => setShowUnifiedQuizCreator(true)}
        />

        {/* Create Quiz/Exam Banner */}
        <div className="mb-6 p-5 rounded-xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Create Quiz or Exam</h3>
                <p className="text-sm text-muted-foreground">Set up quizzes with questions, time limits, and more</p>
              </div>
            </div>
            <Button onClick={() => setShowUnifiedQuizCreator(true)} className="shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Create Quiz or Exam
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button onClick={() => setShowUnifiedQuizCreator(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Quiz or Exam
          </Button>
          <Button variant="outline" onClick={() => setShowBulkQuizImport(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Bulk Import Quizzes
          </Button>
          <Button variant="outline" onClick={() => setShowCreateCourse(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Course
          </Button>
          <Button variant="outline" onClick={() => setShowUploadQuestions(true)} disabled={courses.length === 0}>
            <Plus className="w-4 h-4 mr-2" />
            Upload Questions
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <Coins className="w-5 h-5 text-accent" />
              </div>
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{earnings.totalEarnings}</p>
            <p className="text-sm text-muted-foreground">Total Earnings (tokens)</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{earnings.thisMonthEarnings}</p>
            <p className="text-sm text-muted-foreground">This Month</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{earnings.totalStudents}</p>
            <p className="text-sm text-muted-foreground">Students Reached</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{earnings.totalAttempts}</p>
            <p className="text-sm text-muted-foreground">Quiz Attempts</p>
          </div>
        </div>

        {/* Courses Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-foreground">Your Courses</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowCreateCourse(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Course
            </Button>
          </div>

          {courses.length === 0 ? (
            <div className="bg-muted/30 rounded-xl p-8 text-center">
              <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">No courses yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first course to start adding questions and quizzes.
              </p>
              <Button onClick={() => setShowCreateCourse(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {course.code}
                      </span>
                      <h3 className="font-display font-semibold text-foreground mt-2">
                        {course.name}
                      </h3>
                    </div>
                  </div>

                  {course.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {course.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span>{course.topics_count} topics</span>
                    <span>{course.questions_count} questions</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/tutor/course/${course.id}`)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Manage
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quiz Management Section */}
        <div className="mb-8">
          <QuizManagement />
        </div>

        {/* Analytics Dashboard */}
        <div className="mb-8">
          <TutorAnalytics />
        </div>

        {/* Tutor Community */}
        <div className="mb-8">
          <TutorCommunityManager quizzes={quizzes} />
        </div>

        {/* Question Reports Section */}
        <div className="mb-8">
          <QuestionReports />
        </div>
      </main>

      {/* Dialogs */}
      <CreateCourseDialog
        open={showCreateCourse}
        onOpenChange={setShowCreateCourse}
        onSuccess={() => {
          setShowCreateCourse(false);
          window.location.reload();
        }}
      />
      <CreateQuizDialog
        open={showCreateQuiz}
        onOpenChange={setShowCreateQuiz}
        courses={courses}
        onSuccess={() => {
          setShowCreateQuiz(false);
          window.location.reload();
        }}
      />
      <UploadQuestionsDialog
        open={showUploadQuestions}
        onOpenChange={setShowUploadQuestions}
        courses={courses}
        onSuccess={() => {
          setShowUploadQuestions(false);
          window.location.reload();
        }}
      />
      <QuickQuizCreator
        open={showQuickQuizCreator}
        onOpenChange={setShowQuickQuizCreator}
        courses={courses}
        onSuccess={() => {
          window.location.reload();
        }}
      />
      <WithdrawalRequestDialog
        open={showWithdrawal}
        onOpenChange={setShowWithdrawal}
        availableBalance={walletBalance}
        onSuccess={() => {
          setShowWithdrawal(false);
        }}
      />
      <EditQuizDialog
        open={showEditQuiz}
        onOpenChange={setShowEditQuiz}
        quiz={selectedQuiz}
        onSuccess={() => {
          setShowEditQuiz(false);
          setSelectedQuiz(null);
          window.location.reload();
        }}
      />
      <DeleteQuizDialog
        open={showDeleteQuiz}
        onOpenChange={setShowDeleteQuiz}
        quiz={selectedQuiz}
        onSuccess={() => {
          setShowDeleteQuiz(false);
          setSelectedQuiz(null);
          window.location.reload();
        }}
      />
      <UnifiedQuizCreator
        open={showUnifiedQuizCreator}
        onOpenChange={setShowUnifiedQuizCreator}
        onSuccess={() => {
          window.location.reload();
        }}
      />
      <BulkQuizImport
        open={showBulkQuizImport}
        onOpenChange={setShowBulkQuizImport}
        onSuccess={() => {
          window.location.reload();
        }}
      />
      <OnboardingDialog
        isOpen={showOnboarding}
        onComplete={completeOnboarding}
        userRole="tutor"
        userName={profile?.full_name || undefined}
      />
    </div>
    </>
  );
};

export default TutorDashboard;
