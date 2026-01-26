import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BuyTokensDialog } from "@/components/student/BuyTokensDialog";
import { PurchaseQuizDialog } from "@/components/student/PurchaseQuizDialog";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { AIQuizRecommendations } from "@/components/student/AIQuizRecommendations";
import { StudyStreak } from "@/components/student/StudyStreak";
import { Achievements } from "@/components/student/Achievements";
import { ReferralCard } from "@/components/student/ReferralCard";
import { TeamCard } from "@/components/student/TeamCard";
import FavoriteTutors from "@/components/student/FavoriteTutors";
import BookmarkedQuestions from "@/components/student/BookmarkedQuestions";
import { TeamChallenges } from "@/components/student/TeamChallenges";
import { TeamChat } from "@/components/student/TeamChat";
import { MyCommunities } from "@/components/student/MyCommunities";
import { SEO } from "@/components/seo/SEO";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  LogOut, 
  User, 
  Brain,
  Target,
  TrendingUp,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
  Play,
  Lock,
  Coins,
  History,
  Unlock,
  GraduationCap,
  Star,
  Search,
  Filter,
  X,
  Trophy,
  MessageSquare,
  Flame,
  RefreshCw,
  FileText
} from "lucide-react";
import logo from "@/assets/logo.png";

interface Stats {
  totalAttempts: number;
  totalQuestions: number;
  correctAnswers: number;
  averageScore: number;
  practiceTime: number;
}

interface TutorProfile {
  id: string;
  full_name: string | null;
  profile_image_url: string | null;
  tutor_code: string | null;
  total_quizzes?: number;
  avg_rating?: number;
  total_ratings?: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  question_count: number;
  is_premium: boolean;
  token_cost: number;
  tutor_id: string | null;
  course: {
    id: string;
    code: string;
    name: string;
  };
  tutor?: TutorProfile | null;
  rating?: {
    average: number;
    count: number;
  } | null;
}

interface Wallet {
  balance: number;
  total_earned: number;
  total_spent: number;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, signOut } = useAuth();
  const { showOnboarding, completeOnboarding } = useOnboarding(user?.id);
  const [stats, setStats] = useState<Stats>({
    totalAttempts: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    averageScore: 0,
    practiceTime: 0,
  });
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<{ id: string; code: string; name: string }[]>([]);
  const [purchasedQuizIds, setPurchasedQuizIds] = useState<Set<string>>(new Set());
  const [recentAttempts, setRecentAttempts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showBuyTokens, setShowBuyTokens] = useState(false);
  const [showPurchaseQuiz, setShowPurchaseQuiz] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [purchaseRequests, setPurchaseRequests] = useState<any[]>([]);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Fetch quiz attempts
        const { data: attempts } = await supabase
          .from("quiz_attempts")
          .select("*, quizzes(title, course_id, courses(code, name))")
          .eq("user_id", user.id)
          .order("started_at", { ascending: false });

        if (attempts) {
          const completed = attempts.filter(a => a.completed_at);
          const totalCorrect = completed.reduce((sum, a) => sum + a.correct_answers, 0);
          const totalQuestions = completed.reduce((sum, a) => sum + a.total_questions, 0);
          const totalTime = completed.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0);

          setStats({
            totalAttempts: completed.length,
            totalQuestions,
            correctAnswers: totalCorrect,
            averageScore: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
            practiceTime: Math.round(totalTime / 60),
          });

          setRecentAttempts(attempts.slice(0, 5));
        }

        // Fetch wallet
        const { data: walletData } = await supabase
          .from("token_wallets")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (walletData) {
          setWallet(walletData);
        } else {
          // Create wallet if it doesn't exist
          const { data: newWallet } = await supabase
            .from("token_wallets")
            .insert({ user_id: user.id, balance: 50 })
            .select()
            .single();
          if (newWallet) setWallet(newWallet);
        }

        // Fetch all courses for filter dropdown
        const { data: coursesData } = await supabase
          .from("courses")
          .select("id, code, name")
          .eq("is_active", true)
          .order("code");

        if (coursesData) {
          setCourses(coursesData);
        }

        // Fetch available quizzes with tutor profiles
        const { data: quizzesData } = await supabase
          .from("quizzes")
          .select("*, courses(id, code, name)")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (quizzesData) {
          // Fetch tutor profiles for quizzes that have tutors
          const tutorIds = [...new Set(quizzesData.filter(q => q.tutor_id).map(q => q.tutor_id))];
          let tutorProfiles: Record<string, TutorProfile> = {};
          
          if (tutorIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, full_name, profile_image_url, tutor_code")
              .in("id", tutorIds);
            
            // Fetch tutor quiz counts
            const { data: tutorQuizCounts } = await supabase
              .from("quizzes")
              .select("tutor_id")
              .in("tutor_id", tutorIds)
              .eq("is_active", true);

            // Fetch all ratings for tutors' quizzes
            const { data: allTutorQuizzes } = await supabase
              .from("quizzes")
              .select("id, tutor_id")
              .in("tutor_id", tutorIds)
              .eq("is_active", true);

            let tutorRatings: Record<string, { sum: number; count: number }> = {};
            if (allTutorQuizzes && allTutorQuizzes.length > 0) {
              const allQuizIds = allTutorQuizzes.map(q => q.id);
              const { data: tutorQuizRatings } = await supabase
                .from("quiz_ratings")
                .select("quiz_id, rating")
                .in("quiz_id", allQuizIds);

              if (tutorQuizRatings) {
                // Map quiz_id to tutor_id
                const quizToTutor = allTutorQuizzes.reduce((acc, q) => {
                  acc[q.id] = q.tutor_id;
                  return acc;
                }, {} as Record<string, string>);

                // Aggregate ratings by tutor
                for (const r of tutorQuizRatings) {
                  const tutorId = quizToTutor[r.quiz_id];
                  if (tutorId) {
                    if (!tutorRatings[tutorId]) {
                      tutorRatings[tutorId] = { sum: 0, count: 0 };
                    }
                    tutorRatings[tutorId].sum += r.rating;
                    tutorRatings[tutorId].count += 1;
                  }
                }
              }
            }

            // Count quizzes per tutor
            const quizCountByTutor = tutorQuizCounts?.reduce((acc, q) => {
              acc[q.tutor_id] = (acc[q.tutor_id] || 0) + 1;
              return acc;
            }, {} as Record<string, number>) || {};
            
            if (profiles) {
              tutorProfiles = profiles.reduce((acc, p) => {
                acc[p.id] = {
                  ...p,
                  total_quizzes: quizCountByTutor[p.id] || 0,
                  avg_rating: tutorRatings[p.id] ? tutorRatings[p.id].sum / tutorRatings[p.id].count : undefined,
                  total_ratings: tutorRatings[p.id]?.count || 0
                };
                return acc;
              }, {} as Record<string, TutorProfile>);
            }
          }

          // Fetch ratings for quizzes
          const quizIds = quizzesData.map(q => q.id);
          let quizRatings: Record<string, { average: number; count: number }> = {};

          if (quizIds.length > 0) {
            const { data: ratingsData } = await supabase
              .from("quiz_ratings")
              .select("quiz_id, rating")
              .in("quiz_id", quizIds);

            if (ratingsData && ratingsData.length > 0) {
              // Group ratings by quiz_id
              const ratingsByQuiz = ratingsData.reduce((acc, r) => {
                if (!acc[r.quiz_id]) {
                  acc[r.quiz_id] = [];
                }
                acc[r.quiz_id].push(r.rating);
                return acc;
              }, {} as Record<string, number[]>);

              // Calculate averages
              for (const [quizId, ratings] of Object.entries(ratingsByQuiz)) {
                const sum = ratings.reduce((a, b) => a + b, 0);
                quizRatings[quizId] = {
                  average: sum / ratings.length,
                  count: ratings.length
                };
              }
            }
          }

          setQuizzes(quizzesData.map(q => ({
            ...q,
            course: q.courses as { id: string; code: string; name: string },
            tutor: q.tutor_id ? tutorProfiles[q.tutor_id] || null : null,
            rating: quizRatings[q.id] || null
          })));
        }

        // Fetch purchased quizzes
        const { data: purchasedData } = await supabase
          .from("student_quiz_purchases")
          .select("quiz_id")
          .eq("student_id", user.id);

        if (purchasedData) {
          setPurchasedQuizIds(new Set(purchasedData.map(p => p.quiz_id)));
        }

        // Fetch pending purchase requests
        const { data: purchaseData } = await supabase
          .from("token_purchase_requests")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (purchaseData) {
          setPurchaseRequests(purchaseData);
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

  // Real-time subscription for new quizzes
  useEffect(() => {
    const channel = supabase
      .channel('quizzes-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quizzes',
        },
        async (payload) => {
          try {
            const newQuiz = payload.new as any;
            if (!newQuiz.is_active) return;

            // Fetch course info
            const { data: courseData, error: courseError } = await supabase
              .from('courses')
              .select('id, code, name')
              .eq('id', newQuiz.course_id)
              .maybeSingle();

            if (courseError) {
              console.error('Error fetching course for new quiz:', courseError);
            }

            // Fetch tutor info if exists
            let tutorProfile = null;
            if (newQuiz.tutor_id) {
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, profile_image_url, tutor_code')
                .eq('id', newQuiz.tutor_id)
                .maybeSingle();
              
              if (profileError) {
                console.error('Error fetching tutor profile for new quiz:', profileError);
              }
              tutorProfile = profile;
            }

            setQuizzes(prev => [{
              ...newQuiz,
              course: courseData,
              tutor: tutorProfile,
              rating: null
            }, ...prev]);

            // Auto-clear filters so new quiz is visible
            setSearchQuery("");
            setSelectedCourse("all");
            setSelectedType("all");

            // Show toast notification for new quiz
            toast({
              title: "New Quiz Available!",
              description: `"${newQuiz.title}" in ${courseData?.name || 'Unknown Course'} is now available. Filters cleared to show it.`,
            });
          } catch (error) {
            console.error('Error processing new quiz:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quizzes',
        },
        async (payload) => {
          try {
            const updatedQuiz = payload.new as any;
            setQuizzes(prev => prev.map(q => 
              q.id === updatedQuiz.id 
                ? { ...q, ...updatedQuiz }
                : q
            ).filter(q => q.is_active));
          } catch (error) {
            console.error('Error processing quiz update:', error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Real-time subscription active for quizzes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Real-time subscription error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Refresh quizzes function
  const refreshQuizzes = async () => {
    if (!user || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const { data: quizzesData, error } = await supabase
        .from("quizzes")
        .select("*, courses(id, code, name)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error refreshing quizzes:", error);
        return;
      }

      if (quizzesData) {
        const tutorIds = [...new Set(quizzesData.filter(q => q.tutor_id).map(q => q.tutor_id))];
        let tutorProfiles: Record<string, TutorProfile> = {};
        
        if (tutorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, profile_image_url, tutor_code")
            .in("id", tutorIds);
          
          // Fetch tutor quiz counts
          const { data: tutorQuizCounts } = await supabase
            .from("quizzes")
            .select("tutor_id")
            .in("tutor_id", tutorIds)
            .eq("is_active", true);

          // Fetch all ratings for tutors' quizzes
          const { data: allTutorQuizzes } = await supabase
            .from("quizzes")
            .select("id, tutor_id")
            .in("tutor_id", tutorIds)
            .eq("is_active", true);

          let tutorRatings: Record<string, { sum: number; count: number }> = {};
          if (allTutorQuizzes && allTutorQuizzes.length > 0) {
            const allQuizIds = allTutorQuizzes.map(q => q.id);
            const { data: tutorQuizRatings } = await supabase
              .from("quiz_ratings")
              .select("quiz_id, rating")
              .in("quiz_id", allQuizIds);

            if (tutorQuizRatings) {
              const quizToTutor = allTutorQuizzes.reduce((acc, q) => {
                acc[q.id] = q.tutor_id;
                return acc;
              }, {} as Record<string, string>);

              for (const r of tutorQuizRatings) {
                const tutorId = quizToTutor[r.quiz_id];
                if (tutorId) {
                  if (!tutorRatings[tutorId]) {
                    tutorRatings[tutorId] = { sum: 0, count: 0 };
                  }
                  tutorRatings[tutorId].sum += r.rating;
                  tutorRatings[tutorId].count += 1;
                }
              }
            }
          }

          const quizCountByTutor = tutorQuizCounts?.reduce((acc, q) => {
            acc[q.tutor_id] = (acc[q.tutor_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};
          
          if (profiles) {
            tutorProfiles = profiles.reduce((acc, p) => {
              acc[p.id] = {
                ...p,
                total_quizzes: quizCountByTutor[p.id] || 0,
                avg_rating: tutorRatings[p.id] ? tutorRatings[p.id].sum / tutorRatings[p.id].count : undefined,
                total_ratings: tutorRatings[p.id]?.count || 0
              };
              return acc;
            }, {} as Record<string, TutorProfile>);
          }
        }

        setQuizzes(quizzesData.map(q => ({
          ...q,
          course: q.courses as { id: string; code: string; name: string },
          tutor: q.tutor_id ? tutorProfiles[q.tutor_id] || null : null,
          rating: null
        })));
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtered quizzes based on search and filters
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((quiz) => {
      // Search filter
      const matchesSearch = searchQuery === "" || 
        quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quiz.course?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quiz.course?.code.toLowerCase().includes(searchQuery.toLowerCase());

      // Course filter
      const matchesCourse = selectedCourse === "all" || quiz.course?.code === selectedCourse;

      // Type filter (free/premium/owned)
      let matchesType = true;
      if (selectedType === "free") {
        matchesType = !quiz.is_premium;
      } else if (selectedType === "premium") {
        matchesType = quiz.is_premium && !purchasedQuizIds.has(quiz.id);
      } else if (selectedType === "owned") {
        matchesType = purchasedQuizIds.has(quiz.id);
      }

      return matchesSearch && matchesCourse && matchesType;
    });
  }, [quizzes, searchQuery, selectedCourse, selectedType, purchasedQuizIds]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCourse("all");
    setSelectedType("all");
  };

  const hasActiveFilters = searchQuery !== "" || selectedCourse !== "all" || selectedType !== "all";

  const calculateReadinessScore = () => {
    if (stats.totalAttempts === 0) return 0;
    
    const accuracyWeight = 0.5;
    const consistencyWeight = 0.3;
    const volumeWeight = 0.2;

    const accuracyScore = stats.averageScore;
    const consistencyScore = Math.min(stats.totalAttempts * 10, 100);
    const volumeScore = Math.min((stats.totalQuestions / 100) * 100, 100);

    return Math.round(
      (accuracyScore * accuracyWeight) +
      (consistencyScore * consistencyWeight) +
      (volumeScore * volumeWeight)
    );
  };

  const readinessScore = calculateReadinessScore();

  const getReadinessColor = () => {
    if (readinessScore >= 80) return "text-success";
    if (readinessScore >= 60) return "text-accent";
    if (readinessScore >= 40) return "text-primary";
    return "text-destructive";
  };

  const getReadinessLabel = () => {
    if (readinessScore >= 80) return "Exam Ready!";
    if (readinessScore >= 60) return "Almost There";
    if (readinessScore >= 40) return "Keep Practicing";
    return "Just Getting Started";
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Student Dashboard"
        description="Track your exam preparation progress, practice quizzes, and improve your CBT performance."
        noindex={true}
        url="https://overraprep.com/student/dashboard"
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
              {/* Navigation Links */}
              <Button variant="ghost" size="sm" onClick={() => navigate("/leaderboard")} className="hidden md:flex">
                <Trophy className="w-4 h-4 mr-2" />
                Leaderboard
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/community")} className="hidden md:flex">
                <MessageSquare className="w-4 h-4 mr-2" />
                Community
              </Button>

              {/* Wallet Balance */}
              <div className="flex items-center gap-1.5 sm:gap-2 bg-accent/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
                <Coins className="w-4 h-4 text-accent" />
                <span className="font-semibold text-foreground text-sm sm:text-base">{wallet?.balance || 0}</span>
                <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">tokens</span>
              </div>

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

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Welcome back, {profile?.full_name || "Student"}! 👋
          </h1>
          <p className="text-muted-foreground">
            Ready to ace your exams? Let's continue your preparation journey.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Exam Readiness Score */}
          <div className="col-span-2 lg:col-span-1 bg-card rounded-xl border border-border p-5">
            <div className="text-center">
              <div className={`font-display text-4xl font-bold ${getReadinessColor()} mb-1`}>
                {readinessScore}%
              </div>
              <p className="text-sm text-muted-foreground mb-2">Exam Readiness</p>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                readinessScore >= 80 ? "bg-success/10 text-success" :
                readinessScore >= 60 ? "bg-accent/10 text-accent" :
                readinessScore >= 40 ? "bg-primary/10 text-primary" :
                "bg-destructive/10 text-destructive"
              }`}>
                {getReadinessLabel()}
              </span>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{stats.averageScore}%</p>
            <p className="text-sm text-muted-foreground">Accuracy</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{stats.correctAnswers}</p>
            <p className="text-sm text-muted-foreground">Correct Answers</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-accent" />
              </div>
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{stats.totalAttempts}</p>
            <p className="text-sm text-muted-foreground">Quizzes Taken</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{stats.practiceTime}m</p>
            <p className="text-sm text-muted-foreground">Practice Time</p>
          </div>
        </div>

        {/* Token Wallet Card */}
        <div className="bg-gradient-card rounded-2xl border border-border p-6 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center">
                <Wallet className="w-7 h-7 text-accent" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-foreground">Token Wallet</h3>
                <p className="text-muted-foreground">Use tokens to unlock premium quizzes</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="font-display text-3xl font-bold text-accent">{wallet?.balance || 0}</p>
                <p className="text-sm text-muted-foreground">Available</p>
              </div>
              <div className="text-center">
                <p className="font-display text-xl font-bold text-foreground">{wallet?.total_spent || 0}</p>
                <p className="text-sm text-muted-foreground">Spent</p>
              </div>
              <Button variant="accent" onClick={() => setShowBuyTokens(true)}>
                <Coins className="w-4 h-4 mr-2" />
                Buy Tokens
              </Button>
            </div>
          </div>

          {/* Pending Requests */}
          {purchaseRequests.filter(r => r.status === 'pending').length > 0 && (
            <div className="mt-4 p-3 bg-accent/10 rounded-lg flex items-center gap-2">
              <History className="w-4 h-4 text-accent" />
              <span className="text-sm text-muted-foreground">
                You have {purchaseRequests.filter(r => r.status === 'pending').length} pending token purchase request(s)
              </span>
            </div>
          )}
        </div>

        {/* Study Streak & Quick Links */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <StudyStreak />
          
          {/* Quick Links - Mobile */}
          <div className="bg-card rounded-xl border border-border p-6 md:hidden">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Quick Links</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => navigate("/leaderboard")} className="h-auto py-4 flex-col gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span>Leaderboard</span>
              </Button>
              <Button variant="outline" onClick={() => navigate("/community")} className="h-auto py-4 flex-col gap-2">
                <MessageSquare className="w-5 h-5 text-purple-500" />
                <span>Community</span>
              </Button>
            </div>
          </div>

          {/* Achievements on larger screens */}
          <div className="hidden md:block">
            <Achievements />
          </div>
        </div>

        {/* Achievements on mobile */}
        <div className="mb-8 md:hidden">
          <Achievements />
        </div>

        {/* Referral & Team Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <ReferralCard />
          <TeamCard />
          <FavoriteTutors />
        </div>

        {/* My Communities */}
        <div className="mb-8">
          <MyCommunities />
        </div>

        {/* Team Challenges & Chat */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <TeamChallenges />
          <TeamChat />
        </div>
        {user && stats.totalAttempts > 0 && (
          <div className="mb-8">
            <AIQuizRecommendations
              userId={user.id}
              onSelectQuiz={(quizId) => navigate(`/quiz/${quizId}/practice`)}
              onPurchaseQuiz={(quizId) => {
                const quiz = quizzes.find(q => q.id === quizId);
                if (quiz) {
                  setSelectedQuiz(quiz);
                  setShowPurchaseQuiz(true);
                }
              }}
            />
          </div>
        )}

        {/* Available Quizzes */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-foreground">Available Quizzes</h2>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={refreshQuizzes}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <span className="text-sm text-muted-foreground">
                {filteredQuizzes.length} of {quizzes.length} quizzes
              </span>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-card rounded-xl border border-border p-4 mb-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search quizzes by title or course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Course Filter */}
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.code}>
                      {course.code} - {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full md:w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="owned">My Quizzes</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filters Active Banner */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between p-3 bg-accent/10 border border-accent/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-accent" />
                <span className="text-sm text-foreground">
                  Filters active — showing {filteredQuizzes.length} of {quizzes.length} quizzes
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1">
                <X className="w-3 h-3" />
                Show All Quizzes
              </Button>
            </div>
          )}

          {quizzes.length === 0 ? (
            <div className="bg-muted/30 rounded-xl p-8 text-center">
              <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">No quizzes available yet</p>
              <p className="text-sm text-muted-foreground">Check back soon for new practice quizzes!</p>
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="bg-muted/30 rounded-xl p-8 text-center">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">No quizzes match your filters</p>
              <p className="text-sm text-muted-foreground mb-4">Try adjusting your search or filters</p>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuizzes.map((quiz) => {
                return (
                  <div
                    key={quiz.id}
                    className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {quiz.course?.code}
                          </span>
                          <span className="text-xs font-medium bg-success/10 text-success px-2 py-0.5 rounded flex items-center gap-1">
                            Free
                          </span>
                        </div>
                        <h3 className="font-display font-semibold text-foreground">{quiz.title}</h3>
                      </div>
                      {/* Tutor Avatar - Always show if quiz has tutor_id */}
                      {(quiz.tutor || quiz.tutor_id) && (
                        <Link
                          to={`/tutor/${quiz.tutor?.id || quiz.tutor_id}`}
                          className="relative group ml-3 flex-shrink-0"
                          title={`By ${quiz.tutor?.full_name || 'Tutor'}`}
                        >
                          <Avatar className="w-10 h-10 border-2 border-primary/30 group-hover:border-primary transition-colors shadow-md">
                            <AvatarImage src={quiz.tutor?.profile_image_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm font-bold">
                              {quiz.tutor?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'T'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                            <GraduationCap className="w-2.5 h-2.5 text-primary-foreground" />
                          </div>
                        </Link>
                      )}
                    </div>

                    {quiz.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {quiz.description}
                      </p>
                    )}

                    {/* Tutor Name & Stats Display - Always show if quiz has tutor_id */}
                    {(quiz.tutor || quiz.tutor_id) && (
                      <Link
                        to={`/tutor/${quiz.tutor?.id || quiz.tutor_id}`}
                        className="flex items-center justify-between mb-3 p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6 border border-primary/20">
                            <AvatarImage src={quiz.tutor?.profile_image_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-bold">
                              {quiz.tutor?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'T'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">by <span className="font-medium text-foreground">{quiz.tutor?.full_name || 'Tutor'}</span></span>
                          {quiz.tutor?.tutor_code && (
                            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{quiz.tutor.tutor_code}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {quiz.tutor?.total_quizzes !== undefined && quiz.tutor.total_quizzes > 0 && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {quiz.tutor.total_quizzes}
                            </span>
                          )}
                          {quiz.tutor?.avg_rating !== undefined && (
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-accent text-accent" />
                              {quiz.tutor.avg_rating.toFixed(1)}
                              {quiz.tutor?.total_ratings !== undefined && quiz.tutor.total_ratings > 0 && (
                                <span className="text-muted-foreground">({quiz.tutor.total_ratings})</span>
                              )}
                            </span>
                          )}
                        </div>
                      </Link>
                    )}

                    <div className="flex items-center flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <Brain className="w-4 h-4" />
                        {quiz.question_count} questions
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {quiz.duration_minutes} min
                      </span>
                      {quiz.rating && (
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-accent text-accent" />
                          <span className="text-foreground font-medium">{quiz.rating.average.toFixed(1)}</span>
                          <span className="text-xs">({quiz.rating.count})</span>
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/quiz/${quiz.id}/practice`)}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Practice
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/quiz/${quiz.id}/simulation`)}
                      >
                        <Target className="w-4 h-4 mr-1" />
                        CBT Mode
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bookmarked Questions */}
        <div className="mb-8">
          <BookmarkedQuestions />
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="font-display text-xl font-bold text-foreground mb-4">Recent Activity</h2>
          
          {recentAttempts.length === 0 ? (
            <div className="bg-muted/30 rounded-xl p-8 text-center">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">No activity yet</p>
              <p className="text-sm text-muted-foreground">Start practicing to see your progress here!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="bg-card rounded-xl border border-border p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      attempt.completed_at 
                        ? attempt.correct_answers / attempt.total_questions >= 0.7
                          ? "bg-success/10"
                          : "bg-accent/10"
                        : "bg-muted"
                    }`}>
                      {attempt.completed_at ? (
                        attempt.correct_answers / attempt.total_questions >= 0.7 ? (
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        ) : (
                          <Target className="w-5 h-5 text-accent" />
                        )
                      ) : (
                        <Clock className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">
                        {attempt.quizzes?.title || "Quiz"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {attempt.mode === "practice" ? "Practice Mode" : "CBT Simulation"} • {
                          new Date(attempt.started_at).toLocaleDateString()
                        }
                      </p>
                    </div>
                  </div>
                  
                  {attempt.completed_at && (
                    <div className="text-right">
                      <p className="font-display font-bold text-foreground">
                        {attempt.correct_answers}/{attempt.total_questions}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {Math.round((attempt.correct_answers / attempt.total_questions) * 100)}%
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Buy Tokens Dialog */}
      <BuyTokensDialog
        open={showBuyTokens}
        onOpenChange={setShowBuyTokens}
        onSuccess={() => {
          // Refetch wallet data
          if (user) {
            supabase
              .from("token_wallets")
              .select("*")
              .eq("user_id", user.id)
              .single()
              .then(({ data }) => {
                if (data) setWallet(data);
              });
          }
        }}
      />

      {/* Purchase Quiz Dialog */}
      <PurchaseQuizDialog
        open={showPurchaseQuiz}
        onOpenChange={setShowPurchaseQuiz}
        quiz={selectedQuiz}
        walletBalance={wallet?.balance || 0}
        onSuccess={() => {
          // Refetch wallet and purchases
          if (user) {
            supabase
              .from("token_wallets")
              .select("*")
              .eq("user_id", user.id)
              .single()
              .then(({ data }) => {
                if (data) setWallet(data);
              });
            
            supabase
              .from("student_quiz_purchases")
              .select("quiz_id")
              .eq("student_id", user.id)
              .then(({ data }) => {
                if (data) setPurchasedQuizIds(new Set(data.map(p => p.quiz_id)));
              });
          }
        }}
      />

      <OnboardingDialog
        isOpen={showOnboarding}
        onComplete={completeOnboarding}
        userRole="student"
        userName={profile?.full_name || undefined}
      />
    </div>
    </>
  );
};

export default StudentDashboard;
