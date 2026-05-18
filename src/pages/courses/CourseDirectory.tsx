import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { SEO } from "@/components/seo/SEO";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Search, Plus, GraduationCap } from "lucide-react";

interface CourseRow {
  id: string; code: string; name: string; department: string | null;
  level: string | null; description: string | null;
}

const CourseDirectory = () => {
  const { primaryRole } = useAuth();
  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as
    "admin" | "tutor" | "student";
  const [q, setQ] = useState("");

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["course-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, code, name, department, level, description")
        .eq("is_active", true)
        .order("code", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as CourseRow[];
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return courses;
    return courses.filter((c) =>
      [c.code, c.name, c.department, c.level].filter(Boolean).join(" ").toLowerCase().includes(s),
    );
  }, [courses, q]);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Courses — OverraPrep" description="Browse academic courses and open dedicated hubs for materials, quizzes, flashcards, and AI study packs." />
      <DashboardNav role={navRole} />
      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
        <DashboardBreadcrumb role={navRole} />
        <header className="mt-2 mb-5 flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl md:text-3xl flex items-center gap-2">
              <GraduationCap className="w-7 h-7 text-amber-500" /> Courses
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Open a course to see every document, quiz, flashcard deck and AI study pack organised under it.
            </p>
          </div>
          {primaryRole === "tutor" && (
            <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white">
              <Link to="/tutor/courses/new"><Plus className="w-4 h-4 mr-1.5" /> New course</Link>
            </Button>
          )}
        </header>

        <div className="relative mb-5 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by code, name or level…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading courses…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No courses match your search.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Link key={c.id} to={`/courses/${c.id}`} className="group">
                <Card className="p-4 h-full border-amber-100/60 hover:border-amber-300 hover:shadow-md transition-all bg-gradient-to-br from-white to-amber-50/30">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold tracking-wide text-amber-700">{c.code}</span>
                        {c.level && <Badge variant="outline" className="text-[10px]">{c.level}</Badge>}
                      </div>
                      <h3 className="font-semibold leading-snug mt-1 line-clamp-2">{c.name}</h3>
                      {c.department && <p className="text-[11px] text-muted-foreground mt-1">{c.department}</p>}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseDirectory;