import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import DashboardNav from "@/components/layout/DashboardNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEO } from "@/components/seo/SEO";
import { toast } from "sonner";
import { BookOpen, Plus, Search, Trash2 } from "lucide-react";

interface Course {
  id: string;
  code: string;
  name: string;
  department: string | null;
  level: string | null;
}

const TutorCourses = () => {
  const { user, isLoading: authLoading, hasRole } = useAuth();
  const navigate = useNavigate();
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
    if (!authLoading && user && !hasRole("tutor") && !hasRole("admin")) navigate("/dashboard");
  }, [user, authLoading, hasRole, navigate]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [cs, mine] = await Promise.all([
      supabase.from("courses").select("id, code, name, department, level").eq("is_active", true).order("code"),
      (supabase as any).from("tutor_courses").select("course_id").eq("tutor_id", user.id),
    ]);
    setAllCourses((cs.data as any) ?? []);
    setPickedIds(((mine.data as any) ?? []).map((r: any) => r.course_id));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const picked = useMemo(() => allCourses.filter(c => pickedIds.includes(c.id)), [allCourses, pickedIds]);
  const browseable = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCourses.filter(c => {
      if (pickedIds.includes(c.id)) return false;
      if (!q) return true;
      return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || (c.department || "").toLowerCase().includes(q);
    });
  }, [allCourses, pickedIds, search]);

  const pick = async (id: string) => {
    if (!user) return;
    setBusy(id);
    const { error } = await (supabase as any).from("tutor_courses").insert({ tutor_id: user.id, course_id: id });
    setBusy(null);
    if (error) { toast.error("Could not add"); return; }
    toast.success("Added to your courses");
    load();
  };

  const drop = async (id: string) => {
    if (!user) return;
    setBusy(id);
    const { error } = await (supabase as any).from("tutor_courses").delete().eq("tutor_id", user.id).eq("course_id", id);
    setBusy(null);
    if (error) { toast.error("Could not remove"); return; }
    toast.success("Removed");
    load();
  };

  if (authLoading || loading) {
    return <div className="min-h-screen bg-background"><Navbar /><div className="flex justify-center pt-32"><LoadingSpinner /></div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="My Courses | Tutor" description="Pick the courses you handle." />
      <Navbar />
      <div className="pt-16 md:pt-[72px]"><DashboardNav role="tutor" /></div>
      <main className="container mx-auto px-4 pt-6 pb-16 max-w-5xl">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold mb-1">Courses I Handle</h1>
          <p className="text-muted-foreground">Pick the courses you teach. Students can find you under these.</p>
        </div>

        <Tabs defaultValue="picked">
          <TabsList>
            <TabsTrigger value="picked">My Courses ({picked.length})</TabsTrigger>
            <TabsTrigger value="browse">Pick Courses</TabsTrigger>
          </TabsList>

          <TabsContent value="picked" className="mt-4">
            {picked.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">You haven't picked any courses yet.</CardContent></Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {picked.map(c => (
                  <Card key={c.id} className="glass-card">
                    <CardHeader>
                      <Badge variant="outline" className="mb-2 w-fit">{c.code}</Badge>
                      <CardTitle className="text-base font-display">{c.name}</CardTitle>
                      <CardDescription>{c.level ? `${c.level} Level` : ""} {c.department ? `· ${c.department}` : ""}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" asChild><Link to="/lecture-notes">Manage notes</Link></Button>
                      <Button size="sm" variant="ghost" disabled={busy === c.id} onClick={() => drop(c.id)}><Trash2 className="w-4 h-4" /></Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="browse" className="mt-4 space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            {browseable.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No more courses to pick.</CardContent></Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {browseable.map(c => (
                  <Card key={c.id} className="glass-card">
                    <CardHeader>
                      <Badge variant="outline" className="mb-2 w-fit">{c.code}</Badge>
                      <CardTitle className="text-base font-display">{c.name}</CardTitle>
                      <CardDescription>{c.level ? `${c.level} Level` : ""} {c.department ? `· ${c.department}` : ""}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button size="sm" className="w-full" disabled={busy === c.id} onClick={() => pick(c.id)}>
                        <Plus className="w-4 h-4 mr-1" /> Pick this course
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TutorCourses;
