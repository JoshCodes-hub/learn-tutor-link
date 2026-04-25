import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO } from "@/components/seo/SEO";
import { BookOpen, FileText, Search, Sparkles, TrendingUp } from "lucide-react";

interface Course {
  id: string;
  code: string;
  name: string;
  department: string | null;
  description: string | null;
}

const StudyHub = () => {
  const { user, isLoading: authLoading, primaryRole } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as "admin" | "tutor" | "student";

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: cs } = await supabase
        .from("courses")
        .select("id, code, name, department, description")
        .eq("is_active", true)
        .order("code");
      setCourses((cs as Course[]) ?? []);

      const { data: mats } = await supabase
        .from("study_materials")
        .select("course_id");
      const c: Record<string, number> = {};
      (mats ?? []).forEach((m: { course_id: string }) => {
        c[m.course_id] = (c[m.course_id] ?? 0) + 1;
      });
      setCounts(c);
      setLoading(false);
    })();
  }, [user]);

  const filtered = courses.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center pt-32">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Smart Study Hub | OverraPrep AI"
        description="Upload notes and let AI generate summaries, flashcards, and likely exam questions."
      />
      <Navbar />
      <div className="pt-16 md:pt-[72px]">
        <DashboardNav role={navRole} />
        <DashboardBreadcrumb role={navRole} />
      </div>
      <main className="container mx-auto px-4 pt-6 pb-16 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm uppercase tracking-wider text-primary font-medium">
              Smart Study Hub
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Your AI-Powered Study Companion
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Upload PDFs, slides, or notes for any course. AI generates summaries, flashcards, key
            points, and predicts likely exam questions on demand.
          </p>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Link key={c.id} to={`/study-hub/${c.id}`}>
              <Card className="glass-card h-full hover:border-primary/50 hover:shadow-elegant transition-all group cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        {c.code}
                      </Badge>
                      <CardTitle className="font-display text-lg group-hover:text-primary transition-colors">
                        {c.name}
                      </CardTitle>
                    </div>
                    <BookOpen className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  {c.description && (
                    <CardDescription className="line-clamp-2 pt-1">
                      {c.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    {counts[c.id] ?? 0} {counts[c.id] === 1 ? "material" : "materials"}
                  </span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/pq-intelligence/${c.id}`}>
                      <TrendingUp className="w-4 h-4" /> PQ Trends
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-12">
              No courses match your search.
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudyHub;
