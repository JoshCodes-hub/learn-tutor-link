import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PenLine, ChevronRight, BookOpen } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO } from "@/components/seo/SEO";

interface Course {
  id: string;
  code: string;
  name: string;
  department: string | null;
  question_count: number;
}

const TheoryPrep = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { primaryRole } = useAuth();
  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as "admin" | "tutor" | "student";

  useEffect(() => {
    (async () => {
      const { data: courseData } = await supabase
        .from("courses")
        .select("id, code, name, department")
        .eq("is_active", true)
        .order("code");

      if (!courseData) {
        setLoading(false);
        return;
      }

      const enriched = await Promise.all(
        courseData.map(async (c) => {
          const { count } = await supabase
            .from("theory_questions")
            .select("id", { count: "exact", head: true })
            .eq("course_id", c.id)
            .eq("is_approved", true);
          return { ...c, question_count: count ?? 0 };
        })
      );

      setCourses(enriched);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Theory Exam Prep | OverraPrep AI" description="Practice written/theory exam questions with AI-powered evaluation and feedback." />
      <Navbar />
      <div className="pt-16 md:pt-[72px]">
        <DashboardNav role={navRole} />
        <DashboardBreadcrumb role={navRole} />
      </div>
      <main className="container mx-auto px-4 pt-6 pb-16">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <PenLine className="w-4 h-4" /> Theory Mode
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">Theory Exam Prep</h1>
          <p className="text-muted-foreground max-w-2xl">
            Practice written/essay questions and get instant AI grading with detailed feedback. Designed for 300L+ courses.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : courses.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center text-muted-foreground">No courses available yet.</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => (
              <Card key={c.id} className="glass-card hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-display text-lg">{c.code}</CardTitle>
                      <CardDescription className="line-clamp-2">{c.name}</CardDescription>
                    </div>
                    <Badge variant="secondary">{c.question_count} Q</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button asChild className="flex-1" variant={c.question_count > 0 ? "default" : "outline"}>
                    <Link to={`/theory/${c.id}`}>
                      <PenLine className="w-4 h-4" /> {c.question_count > 0 ? "Practice" : "Open"} <ChevronRight className="w-4 h-4 ml-auto" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-10 rounded-xl border border-border/50 bg-muted/20 p-6">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-display font-semibold mb-1">Need objective practice instead?</h3>
              <p className="text-sm text-muted-foreground mb-3">Switch to CBT mode for multiple-choice questions.</p>
              <Button asChild variant="outline" size="sm"><Link to="/dashboard">Go to CBT Quizzes</Link></Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TheoryPrep;
