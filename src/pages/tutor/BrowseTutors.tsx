import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Sparkles,
  GraduationCap,
  Search,
  Star,
  Users,
  Brain,
  Loader2,
  ArrowLeft,
} from "lucide-react";

interface Tutor {
  id: string;
  full_name: string | null;
  profile_image_url: string | null;
  tutor_code: string | null;
  department: string | null;
  bio: string | null;
  quizCount: number;
  studentCount: number;
  averageRating: number;
  ratingCount: number;
}

const BrowseTutors = () => {
  const navigate = useNavigate();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [filteredTutors, setFilteredTutors] = useState<Tutor[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTutors = async () => {
      try {
        // Get all approved tutor applications
        const { data: applications, error: appError } = await supabase
          .from("tutor_applications")
          .select("user_id, bio")
          .eq("status", "approved");

        if (appError) throw appError;
        if (!applications || applications.length === 0) {
          setIsLoading(false);
          return;
        }

        const tutorIds = applications.map((a) => a.user_id);
        const bioMap = new Map(applications.map((a) => [a.user_id, a.bio]));

        // Fetch tutor profiles
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, profile_image_url, tutor_code, department")
          .in("id", tutorIds);

        if (profileError) throw profileError;

        // Fetch quiz counts
        const { data: quizzes } = await supabase
          .from("quizzes")
          .select("id, tutor_id")
          .in("tutor_id", tutorIds)
          .eq("is_active", true);

        const quizCountMap = new Map<string, number>();
        const quizIdsByTutor = new Map<string, string[]>();
        
        quizzes?.forEach((q) => {
          if (q.tutor_id) {
            quizCountMap.set(q.tutor_id, (quizCountMap.get(q.tutor_id) || 0) + 1);
            const ids = quizIdsByTutor.get(q.tutor_id) || [];
            ids.push(q.id);
            quizIdsByTutor.set(q.tutor_id, ids);
          }
        });

        // Fetch ratings for each tutor's quizzes
        const allQuizIds = quizzes?.map((q) => q.id) || [];
        const { data: ratings } = await supabase
          .from("quiz_ratings")
          .select("quiz_id, rating")
          .in("quiz_id", allQuizIds);

        const ratingsByTutor = new Map<string, number[]>();
        ratings?.forEach((r) => {
          // Find which tutor owns this quiz
          for (const [tutorId, quizIds] of quizIdsByTutor) {
            if (quizIds.includes(r.quiz_id)) {
              const tutorRatings = ratingsByTutor.get(tutorId) || [];
              tutorRatings.push(r.rating);
              ratingsByTutor.set(tutorId, tutorRatings);
              break;
            }
          }
        });

        // Fetch student counts (unique students who attempted quizzes)
        const { data: attempts } = await supabase
          .from("quiz_attempts")
          .select("user_id, quizzes!inner(tutor_id)")
          .in("quizzes.tutor_id", tutorIds);

        const studentsByTutor = new Map<string, Set<string>>();
        attempts?.forEach((a: any) => {
          const tutorId = a.quizzes?.tutor_id;
          if (tutorId) {
            const students = studentsByTutor.get(tutorId) || new Set();
            students.add(a.user_id);
            studentsByTutor.set(tutorId, students);
          }
        });

        // Build tutor list
        const tutorList: Tutor[] = (profiles || []).map((p) => {
          const tutorRatings = ratingsByTutor.get(p.id) || [];
          const avgRating = tutorRatings.length > 0
            ? tutorRatings.reduce((a, b) => a + b, 0) / tutorRatings.length
            : 0;

          return {
            id: p.id,
            full_name: p.full_name,
            profile_image_url: p.profile_image_url,
            tutor_code: p.tutor_code,
            department: p.department,
            bio: bioMap.get(p.id) || null,
            quizCount: quizCountMap.get(p.id) || 0,
            studentCount: studentsByTutor.get(p.id)?.size || 0,
            averageRating: avgRating,
            ratingCount: tutorRatings.length,
          };
        });

        // Extract unique departments
        const depts = [...new Set(tutorList.map((t) => t.department).filter(Boolean))] as string[];
        setDepartments(depts.sort());

        setTutors(tutorList);
        setFilteredTutors(tutorList);
      } catch (error) {
        console.error("Error fetching tutors:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTutors();
  }, []);

  useEffect(() => {
    let filtered = [...tutors];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.full_name?.toLowerCase().includes(query) ||
          t.tutor_code?.toLowerCase().includes(query) ||
          t.department?.toLowerCase().includes(query)
      );
    }

    // Filter by department
    if (selectedDepartment && selectedDepartment !== "all") {
      filtered = filtered.filter((t) => t.department === selectedDepartment);
    }

    setFilteredTutors(filtered);
  }, [searchQuery, selectedDepartment, tutors]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading tutors...</p>
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
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Browse Tutors
          </h1>
          <p className="text-muted-foreground">
            Discover verified tutors and explore their quiz content
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results Count */}
        <p className="text-sm text-muted-foreground mb-4">
          {filteredTutors.length} tutor{filteredTutors.length !== 1 ? "s" : ""} found
        </p>

        {/* Tutors Grid */}
        {filteredTutors.length === 0 ? (
          <div className="bg-muted/30 rounded-xl p-12 text-center">
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium mb-2">No tutors found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery || selectedDepartment !== "all"
                ? "Try adjusting your search or filters"
                : "Check back soon for new tutors!"}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTutors.map((tutor) => {
              const initials =
                tutor.full_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "T";

              return (
                <Link
                  key={tutor.id}
                  to={`/tutor/${tutor.id}`}
                  className="bg-card rounded-xl border border-border p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300 group"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="w-16 h-16 border-2 border-primary/20 group-hover:border-primary/50 transition-colors">
                      <AvatarImage src={tutor.profile_image_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {tutor.full_name || "Tutor"}
                      </h3>
                      {tutor.tutor_code && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {tutor.tutor_code}
                        </p>
                      )}
                      {tutor.department && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {tutor.department}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {tutor.bio && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {tutor.bio}
                    </p>
                  )}

                  <div className="flex items-center flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Brain className="w-4 h-4" />
                      {tutor.quizCount} quizzes
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {tutor.studentCount} students
                    </span>
                    {tutor.ratingCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-accent text-accent" />
                        <span className="text-foreground font-medium">
                          {tutor.averageRating.toFixed(1)}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          ({tutor.ratingCount})
                        </span>
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default BrowseTutors;
