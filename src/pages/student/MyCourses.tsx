import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyCourses } from "@/hooks/useMyCourses";
import { useStudentScope } from "@/hooks/useStudentScope";
import Navbar from "@/components/layout/Navbar";
import DashboardNav from "@/components/layout/DashboardNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO } from "@/components/seo/SEO";
import { toast } from "sonner";
import { BookOpen, Plus, Search, Lock, GraduationCap, Sparkles, ArrowRight } from "lucide-react";
import { MyCoursesGrid } from "@/components/courses/MyCoursesGrid";
import { PageHeader, LevelChip } from "@/components/shell/PageHeader";
import { FilterRail, type FilterChip } from "@/components/shell/FilterRail";
import { SectionBlock } from "@/components/shell/SectionBlock";
import { EmptyState } from "@/components/shell/EmptyState";

interface Course {
  id: string;
  code: string;
  name: string;
  department: string | null;
  level: string | null;
  description: string | null;
}

const MyCourses = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { level: studentLevel, department, hasScope, label: scopeLabel } = useStudentScope();
  const navigate = useNavigate();
  const { courseIds, refresh } = useMyCourses();
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [view, setView] = useState<"enrolled" | "recommended" | "all">("enrolled");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, code, name, department, level, description")
        .eq("is_active", true)
        .order("code");
      setAllCourses((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  const enrolled = useMemo(
    () => allCourses.filter((c) => courseIds.includes(c.id)),
    [allCourses, courseIds]
  );

  const matchesScope = (c: Course) => {
    if (!hasScope) return true;
    if (c.level && c.level !== studentLevel) return false;
    if (department && c.department && c.department !== department) return false;
    return true;
  };

  const recommended = useMemo(
    () => allCourses.filter((c) => !courseIds.includes(c.id) && matchesScope(c)),
    [allCourses, courseIds, studentLevel, department, hasScope],
  );

  const browseable = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = view === "recommended" ? recommended : allCourses.filter((c) => !courseIds.includes(c.id));
    if (!q) return pool;
    return pool.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.department || "").toLowerCase().includes(q),
    );
  }, [allCourses, courseIds, recommended, search, view]);

  const isLocked = (c: Course) =>
    !!studentLevel && !!c.level && c.level !== studentLevel;

  const enroll = async (id: string) => {
    if (!user) return;
    setBusy(id);
    const { error } = await (supabase as any).from("student_courses").insert({ student_id: user.id, course_id: id });
    setBusy(null);
    if (error) {
      toast.error("Could not enroll");
      return;
    }
    toast.success("Course added to your list");
    refresh();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center pt-32"><LoadingSpinner /></div>
      </div>
    );
  }

  const chips: FilterChip[] = [
    { id: "enrolled", label: "Enrolled", count: enrolled.length },
    {
      id: "recommended",
      label: (
        <span className="inline-flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> For {studentLevel || "you"}
        </span>
      ),
      count: recommended.length,
    },
    { id: "all", label: "All courses" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO title="My Courses | OverraPrep AI" description="Manage your enrolled courses." />
      <Navbar />
      <div className="pt-16 md:pt-[72px]"><DashboardNav role="student" /></div>
      <main className="container mx-auto px-4 pt-6 pb-24 max-w-5xl">
        <PageHeader
          eyebrow={
            scopeLabel ? (
              <LevelChip label={scopeLabel} />
            ) : (
              <Link to="/profile/edit" className="inline-flex items-center gap-1 text-xs text-amber-700 underline">
                <GraduationCap className="w-3.5 h-3.5" /> Set your level to personalize
              </Link>
            )
          }
          title="My Courses"
          subtitle={
            hasScope
              ? `Curated for ${studentLevel} students. Your enrolled courses and what's recommended next.`
              : "Browse every active course. Set your level in your profile to see only what's relevant to you."
          }
          actions={
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search code or name (e.g. CSC 201)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/80 backdrop-blur"
              />
            </div>
          }
        />

        <FilterRail chips={chips} active={view} onChange={(v) => setView(v as typeof view)} />

        {view === "enrolled" ? (
          <SectionBlock
            title="Your enrolled courses"
            subtitle="Tap a course to open materials, quizzes, audio and discussions."
          >
            {enrolled.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="w-6 h-6" />}
                title="You haven't added any courses yet"
                description={
                  hasScope
                    ? `We've lined up ${recommended.length} ${studentLevel} courses for you.`
                    : "Browse all active courses or set your level for tailored picks."
                }
                action={
                  <Button onClick={() => setView("recommended")} className="gap-1.5">
                    <Sparkles className="w-4 h-4" /> See recommended
                  </Button>
                }
              />
            ) : (
              <MyCoursesGrid emptyMessage="" />
            )}

            {recommended.length > 0 && (
              <SectionBlock
                title={`Recommended for ${studentLevel || "you"}`}
                subtitle="One-tap add — only shown when they match your level and department."
                action={
                  <Button variant="ghost" size="sm" onClick={() => setView("recommended")} className="gap-1">
                    See all <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                }
                className="mt-10"
              >
                <RecommendedRow
                  courses={recommended.slice(0, 6)}
                  busy={busy}
                  onEnroll={enroll}
                />
              </SectionBlock>
            )}
          </SectionBlock>
        ) : (
          <SectionBlock
            title={
              view === "recommended"
                ? `${recommended.length} courses for ${studentLevel || "you"}`
                : "All active courses"
            }
            subtitle={
              view === "recommended"
                ? "Filtered to your academic level. Update your profile to change this."
                : "Browsing everything — courses outside your level appear locked."
            }
          >
            {browseable.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="w-6 h-6" />}
                title="No matching courses"
                description={
                  view === "recommended"
                    ? `Nothing new for ${studentLevel || "your level"} right now — check back soon.`
                    : "Try a different search term."
                }
              />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {browseable.map((c) => (
                  <BrowseCard
                    key={c.id}
                    course={c}
                    locked={isLocked(c)}
                    busy={busy === c.id}
                    onEnroll={() => enroll(c.id)}
                  />
                ))}
              </div>
            )}
          </SectionBlock>
        )}
      </main>
    </div>
  );
};

function RecommendedRow({
  courses,
  busy,
  onEnroll,
}: {
  courses: Course[];
  busy: string | null;
  onEnroll: (id: string) => void;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 snap-x">
      {courses.map((c) => (
        <div
          key={c.id}
          className="snap-start shrink-0 w-[260px] rounded-2xl border border-border bg-white p-4 hover:shadow-elegant hover:border-amber-300 transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-[10px] font-bold">{c.code}</Badge>
            {c.level && <span className="text-[10px] text-muted-foreground">{c.level}</span>}
          </div>
          <h3 className="font-display text-sm font-bold line-clamp-2 leading-snug min-h-[2.5rem]">
            {c.name}
          </h3>
          {c.department && (
            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{c.department}</p>
          )}
          <Button
            size="sm"
            className="w-full mt-3 h-8"
            disabled={busy === c.id}
            onClick={() => onEnroll(c.id)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add to my courses
          </Button>
        </div>
      ))}
    </div>
  );
}

function BrowseCard({
  course: c,
  locked,
  busy,
  onEnroll,
}: {
  course: Course;
  locked: boolean;
  busy: boolean;
  onEnroll: () => void;
}) {
  return (
    <Card
      className={`relative overflow-hidden transition-all border-border ${
        locked ? "opacity-70" : "hover:shadow-elegant hover:border-amber-300"
      }`}
    >
      {locked && (
        <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
          <Lock className="w-3 h-3" /> {c.level} only
        </div>
      )}
      <CardHeader className="pb-3">
        <Badge variant="outline" className="mb-2 w-fit font-bold">{c.code}</Badge>
        <CardTitle className="text-base font-display leading-snug">{c.name}</CardTitle>
        {(c.level || c.department) && (
          <CardDescription className="text-xs">
            {c.level ? `${c.level}` : ""}
            {c.level && c.department ? " · " : ""}
            {c.department || ""}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {locked ? (
          <Button size="sm" variant="outline" className="w-full" asChild>
            <Link to="/profile/edit">
              <Lock className="w-4 h-4 mr-1" /> Update level to enroll
            </Link>
          </Button>
        ) : (
          <Button size="sm" className="w-full" disabled={busy} onClick={onEnroll}>
            <Plus className="w-4 h-4 mr-1" /> Add to my courses
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default MyCourses;
