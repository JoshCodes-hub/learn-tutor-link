import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Sparkles,
  GraduationCap,
  Brain,
  Clock,
  Users,
  Star,
  Play,
  Target,
  Lock,
  ArrowLeft,
  Loader2,
  Coins,
} from "lucide-react";

interface TutorData {
  id: string;
  full_name: string | null;
  profile_image_url: string | null;
  tutor_code: string | null;
  department: string | null;
}

interface TutorApplication {
  bio: string | null;
  qualifications: string | null;
  experience: string | null;
  courses_to_teach: string | null;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  question_count: number;
  is_premium: boolean;
  token_cost: number;
  course: {
    code: string;
    name: string;
  };
}

interface TutorStats {
  totalQuizzes: number;
  totalStudents: number;
  totalQuestions: number;
  averageRating: number;
  totalRatings: number;
}

const TutorProfile = () => {
  const { tutorId } = useParams<{ tutorId: string }>();
  const navigate = useNavigate();
  const [tutor, setTutor] = useState<TutorData | null>(null);
  const [application, setApplication] = useState<TutorApplication | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [stats, setStats] = useState<TutorStats>({
    totalQuizzes: 0,
    totalStudents: 0,
    totalQuestions: 0,
    averageRating: 0,
    totalRatings: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTutorData = async () => {
      if (!tutorId) return;

      try {
        // Fetch tutor profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, profile_image_url, tutor_code, department")
          .eq("id", tutorId)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profileData) {
          navigate("/404");
          return;
        }

        setTutor(profileData);

        // Fetch tutor application for bio
        const { data: appData } = await supabase
          .from("tutor_applications")
          .select("bio, qualifications, experience, courses_to_teach")
          .eq("user_id", tutorId)
          .eq("status", "approved")
          .maybeSingle();

        if (appData) {
          setApplication(appData);
        }

        // Fetch tutor's quizzes
        const { data: quizzesData } = await supabase
          .from("quizzes")
          .select("*, courses(code, name)")
          .eq("tutor_id", tutorId)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (quizzesData) {
          setQuizzes(
            quizzesData.map((q) => ({
              ...q,
              course: q.courses as { code: string; name: string },
            }))
          );
        }

        // Calculate stats
        const totalQuizzes = quizzesData?.length || 0;

        // Get total questions across all quizzes
        const { count: questionsCount } = await supabase
          .from("questions")
          .select("*", { count: "exact", head: true })
          .eq("tutor_id", tutorId)
          .eq("is_approved", true);

        // Get unique students who attempted quizzes
        const { data: studentsData } = await supabase
          .from("quiz_attempts")
          .select("user_id, quizzes!inner(tutor_id)")
          .eq("quizzes.tutor_id", tutorId);

        const uniqueStudents = new Set(studentsData?.map((s) => s.user_id) || []);

        setStats({
          totalQuizzes,
          totalStudents: uniqueStudents.size,
          totalQuestions: questionsCount || 0,
          averageRating: 4.5, // Placeholder - implement ratings table later
          totalRatings: 0,
        });
      } catch (error) {
        console.error("Error fetching tutor data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTutorData();
  }, [tutorId, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading tutor profile...</p>
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground font-medium mb-4">Tutor not found</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const initials =
    tutor.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "T";

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
                <span className="text-xs text-muted-foreground font-medium">FUTA</span>
              </div>
            </Link>

            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-primary/20">
              <AvatarImage src={tutor.profile_image_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl md:text-3xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                  {tutor.full_name || "Tutor"}
                </h1>
                <Badge variant="secondary" className="w-fit mx-auto md:mx-0">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  Verified Tutor
                </Badge>
              </div>

              {tutor.tutor_code && (
                <p className="text-sm text-muted-foreground font-mono mb-2">
                  {tutor.tutor_code}
                </p>
              )}

              {tutor.department && (
                <p className="text-muted-foreground mb-4">{tutor.department}</p>
              )}

              {application?.bio && (
                <p className="text-foreground leading-relaxed max-w-2xl">
                  {application.bio}
                </p>
              )}

              {/* Stats Row */}
              <div className="flex flex-wrap justify-center md:justify-start gap-6 mt-6">
                <div className="text-center md:text-left">
                  <p className="font-display text-2xl font-bold text-foreground">
                    {stats.totalQuizzes}
                  </p>
                  <p className="text-sm text-muted-foreground">Quizzes</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="font-display text-2xl font-bold text-foreground">
                    {stats.totalQuestions}
                  </p>
                  <p className="text-sm text-muted-foreground">Questions</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="font-display text-2xl font-bold text-foreground">
                    {stats.totalStudents}
                  </p>
                  <p className="text-sm text-muted-foreground">Students</p>
                </div>
                {stats.totalRatings > 0 && (
                  <div className="text-center md:text-left">
                    <p className="font-display text-2xl font-bold text-accent flex items-center gap-1">
                      <Star className="w-5 h-5 fill-accent" />
                      {stats.averageRating.toFixed(1)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ({stats.totalRatings} ratings)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Qualifications & Experience */}
        {(application?.qualifications || application?.experience) && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {application?.qualifications && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  Qualifications
                </h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {application.qualifications}
                </p>
              </div>
            )}

            {application?.experience && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Teaching Experience
                </h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {application.experience}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Quizzes Section */}
        <div>
          <h2 className="font-display text-xl font-bold text-foreground mb-4">
            Quizzes by {tutor.full_name?.split(" ")[0] || "this Tutor"}
          </h2>

          {quizzes.length === 0 ? (
            <div className="bg-muted/30 rounded-xl p-8 text-center">
              <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">No quizzes yet</p>
              <p className="text-sm text-muted-foreground">
                This tutor hasn't published any quizzes yet.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map((quiz) => (
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
                        {quiz.is_premium && (
                          <span className="text-xs font-medium bg-accent/10 text-accent px-2 py-0.5 rounded flex items-center gap-1">
                            <Coins className="w-3 h-3" />
                            {quiz.token_cost} tokens
                          </span>
                        )}
                      </div>
                      <h3 className="font-display font-semibold text-foreground">
                        {quiz.title}
                      </h3>
                    </div>
                  </div>

                  {quiz.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {quiz.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Brain className="w-4 h-4" />
                      {quiz.question_count} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {quiz.duration_minutes} min
                    </span>
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
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TutorProfile;
