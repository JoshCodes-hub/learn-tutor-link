import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TutorAvatar from "@/components/tutor/TutorAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Users, BookOpen, ArrowRight, Loader2 } from "lucide-react";

interface FeaturedTutor {
  id: string;
  full_name: string | null;
  profile_image_url: string | null;
  department: string | null;
  tutor_code: string | null;
  quizCount: number;
  studentCount: number;
  averageRating: number;
}

const FeaturedTutorsSection = () => {
  const navigate = useNavigate();
  const [tutors, setTutors] = useState<FeaturedTutor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedTutors = async () => {
      try {
        // Get all tutor user IDs
        const { data: tutorRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "tutor");

        if (!tutorRoles || tutorRoles.length === 0) {
          setTutors([]);
          setIsLoading(false);
          return;
        }

        const tutorIds = tutorRoles.map((r) => r.user_id);

        // Get tutor profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, profile_image_url, department, tutor_code")
          .in("id", tutorIds);

        if (!profiles) {
          setTutors([]);
          setIsLoading(false);
          return;
        }

        // Get quiz stats for each tutor
        const tutorsWithStats = await Promise.all(
          profiles.map(async (profile) => {
            // Get quizzes by this tutor
            const { data: quizzes } = await supabase
              .from("quizzes")
              .select("id")
              .eq("tutor_id", profile.id)
              .eq("is_active", true);

            const quizCount = quizzes?.length || 0;
            const quizIds = quizzes?.map((q) => q.id) || [];

            // Get unique students and ratings
            let studentCount = 0;
            let averageRating = 0;

            if (quizIds.length > 0) {
              const { data: purchases } = await supabase
                .from("student_quiz_purchases")
                .select("student_id")
                .in("quiz_id", quizIds);

              const uniqueStudents = new Set(purchases?.map((p) => p.student_id));
              studentCount = uniqueStudents.size;

              const { data: ratings } = await supabase
                .from("quiz_ratings")
                .select("rating")
                .in("quiz_id", quizIds);

              if (ratings && ratings.length > 0) {
                averageRating =
                  ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
              }
            }

            return {
              ...profile,
              quizCount,
              studentCount,
              averageRating,
            };
          })
        );

        // Sort by rating and take top 4
        const sortedTutors = tutorsWithStats
          .sort((a, b) => b.averageRating - a.averageRating || b.studentCount - a.studentCount)
          .slice(0, 4);

        setTutors(sortedTutors);
      } catch (error) {
        console.error("Error fetching featured tutors:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedTutors();
  }, []);

  const getInitials = (name: string | null) => {
    if (!name) return "T";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (tutors.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">
            Expert Tutors
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Learn from the Best
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our top-rated tutors create high-quality quiz content to help you excel in your exams
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {tutors.map((tutor) => (
            <Card
              key={tutor.id}
              className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
              onClick={() => navigate(`/tutor/${tutor.id}`)}
            >
              <CardContent className="p-6 text-center">
                <TutorAvatar
                  src={tutor.profile_image_url}
                  name={tutor.full_name}
                  className="w-20 h-20 mx-auto mb-4 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all"
                  fallbackClassName="text-xl"
                />

                <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                  {tutor.full_name || "Tutor"}
                </h3>

                {tutor.department && (
                  <Badge variant="secondary" className="mb-3 text-xs">
                    {tutor.department}
                  </Badge>
                )}

                {tutor.averageRating > 0 && (
                  <div className="flex items-center justify-center gap-1 mb-3">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{tutor.averageRating.toFixed(1)}</span>
                  </div>
                )}

                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    <span>{tutor.quizCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{tutor.studentCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate("/tutors")}
            className="group"
          >
            View All Tutors
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedTutorsSection;
