import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyCourses } from "@/hooks/useMyCourses";
import Navbar from "@/components/layout/Navbar";
import DashboardNav from "@/components/layout/DashboardNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO } from "@/components/seo/SEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BookOpen, Plus, Search, Trash2, Lock } from "lucide-react";
import { MyCoursesGrid } from "@/components/courses/MyCoursesGrid";

interface Course {
  id: string;
  code: string;
  name: string;
  department: string | null;
  level: string | null;
  description: string | null;
}

const MyCourses = () => {
  const { user, profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { courseIds, refresh } = useMyCourses();
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

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

  const studentLevel = (profile as any)?.level as string | undefined;

  const enrolled = useMemo(
    () => allCourses.filter((c) => courseIds.includes(c.id)),
    [allCourses, courseIds]
  );

  const browseable = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCourses.filter((c) => {
      if (courseIds.includes(c.id)) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.department || "").toLowerCase().includes(q)
      );
    });
  }, [allCourses, courseIds, search, studentLevel]);

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

  const unenroll = async (id: string) => {
    if (!user) return;
    setBusy(id);
    const { error } = await (supabase as any)
      .from("student_courses")
      .delete()
      .eq("student_id", user.id)
      .eq("course_id", id);
    setBusy(null);
    if (error) {
      toast.error("Could not remove");
      return;
    }
    toast.success("Removed");
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

  return (
    <div className="min-h-screen bg-background">
      <SEO title="My Courses | OverraPrep AI" description="Manage your enrolled courses." />
      <Navbar />
      <div className="pt-16 md:pt-[72px]"><DashboardNav role="student" /></div>
      <main className="container mx-auto px-4 pt-6 pb-16 max-w-5xl">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold mb-1">My Courses</h1>
          <p className="text-muted-foreground">
            {studentLevel
              ? `Showing ${studentLevel} Level courses available to you`
              : <>Set your level in <Link to="/profile/edit" className="text-primary underline">your profile</Link> to unlock level-specific courses</>}
          </p>
        </div>

        <Tabs defaultValue="enrolled">
          <TabsList>
            <TabsTrigger value="enrolled">Enrolled ({enrolled.length})</TabsTrigger>
            <TabsTrigger value="browse">Browse Courses</TabsTrigger>
          </TabsList>

          <TabsContent value="enrolled" className="mt-4">
            <MyCoursesGrid emptyMessage="You haven't added any courses yet. Switch to Browse to get started." />
          </TabsContent>

          <TabsContent value="browse" className="mt-4 space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by code or name (e.g. CSC 201)" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>

            {browseable.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                {studentLevel ? "No matching courses for your level." : "No courses match your search."}
              </CardContent></Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {browseable.map((c) => {
                  const locked = isLocked(c);
                  return (
                    <Card
                      key={c.id}
                      className={`glass-card transition-all relative ${
                        locked ? "opacity-75 grayscale-[35%]" : "hover:shadow-elegant"
                      }`}
                    >
                      {locked && (
                        <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          <Lock className="w-3 h-3" /> {c.level} Only
                        </div>
                      )}
                      <CardHeader>
                        <Badge variant="outline" className="mb-2 w-fit">{c.code}</Badge>
                        <CardTitle className="text-base font-display">{c.name}</CardTitle>
                        {(c.level || c.department) && (
                          <CardDescription>{c.level ? `${c.level} Level` : ""}{c.level && c.department ? " · " : ""}{c.department || ""}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        {locked ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            asChild
                          >
                            <Link to="/profile/edit">
                              <Lock className="w-4 h-4 mr-1" /> Switch to {c.level} Level
                            </Link>
                          </Button>
                        ) : (
                          <Button size="sm" className="w-full" disabled={busy === c.id} onClick={() => enroll(c.id)}>
                            <Plus className="w-4 h-4 mr-1" /> Add to my courses
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            {!studentLevel && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> All active courses are shown until you set your level.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MyCourses;
