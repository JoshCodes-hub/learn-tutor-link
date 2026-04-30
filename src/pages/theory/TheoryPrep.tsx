import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PenLine, ChevronRight, BookOpen, Search, Sparkles, Target, Trophy, Bot } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO } from "@/components/seo/SEO";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { PremiumStatCard } from "@/components/dashboard/PremiumStatCard";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface Course {
  id: string;
  code: string;
  name: string;
  department: string | null;
  question_count: number;
  attempted: number;
  avg_score: number | null;
}

const TheoryPrep = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { user, profile, primaryRole } = useAuth();
  const navigate = useNavigate();
  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as "admin" | "tutor" | "student";

  useEffect(() => {
    (async () => {
      const { data: courseData } = await supabase
        .from("courses").select("id, code, name, department")
        .eq("is_active", true).order("code");
      if (!courseData) { setLoading(false); return; }

      // counts per course
      const enriched = await Promise.all(
        courseData.map(async (c) => {
          const [{ count }, attempts] = await Promise.all([
            supabase.from("theory_questions").select("id", { count: "exact", head: true }).eq("course_id", c.id).eq("is_approved", true),
            user
              ? supabase.from("theory_attempts").select("ai_score, question_id, theory_questions!inner(course_id)").eq("user_id", user.id).eq("status", "submitted").eq("theory_questions.course_id", c.id)
              : Promise.resolve({ data: [] as any[] }),
          ]);
          const list = (attempts as any).data ?? [];
          const scores = list.map((a: any) => a.ai_score).filter((s: number | null) => typeof s === "number");
          const avg = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null;
          const uniqAttempted = new Set(list.map((a: any) => a.question_id)).size;
          return { ...c, question_count: count ?? 0, attempted: uniqAttempted, avg_score: avg };
        })
      );
      setCourses(enriched);
      setLoading(false);
    })();
  }, [user]);

  const filtered = courses.filter((c) =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalQuestions = courses.reduce((s, c) => s + c.question_count, 0);
  const totalAttempted = courses.reduce((s, c) => s + c.attempted, 0);
  const overallAvg = (() => {
    const withScore = courses.filter(c => c.avg_score !== null);
    if (!withScore.length) return 0;
    return Math.round(withScore.reduce((s, c) => s + (c.avg_score ?? 0), 0) / withScore.length);
  })();

  const quickPractice = () => {
    const candidates = courses.filter(c => c.question_count > 0 && c.attempted < c.question_count);
    const pool = candidates.length ? candidates : courses.filter(c => c.question_count > 0);
    if (!pool.length) { toast.info("No questions available yet."); return; }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    navigate(`/theory/${pick.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Theory Exam Prep | OverraPrep AI" description="Practice written/theory exam questions with AI-powered evaluation and feedback." />
      <Navbar />
      <div className="pt-16 md:pt-[72px]">
        <DashboardNav role={navRole} />
        <DashboardBreadcrumb role={navRole} />
      </div>
      <main className="container mx-auto px-4 pt-6 pb-16 max-w-6xl space-y-6">
        <DashboardHero
          role={navRole}
          fullName={profile?.full_name}
          avatarUrl={profile?.avatar_url}
          subtitle={
            <>Master written exams with AI grading, hints, model answers and a dedicated theory coach. Designed for 300L+ courses.</>
          }
          actions={
            <Button onClick={quickPractice} className="bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md">
              <Sparkles className="w-4 h-4" /> Quick Practice
            </Button>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <PremiumStatCard icon={BookOpen} label="Courses" value={courses.length} tone="gold" delay={0} />
          <PremiumStatCard icon={PenLine} label="Total Questions" value={totalQuestions} tone="sapphire" delay={0.05} />
          <PremiumStatCard icon={Target} label="Questions Attempted" value={totalAttempted} tone="emerald" delay={0.1} />
          <PremiumStatCard icon={Trophy} label="Avg Score" value={overallAvg} suffix="%" tone="violet" progress={overallAvg} delay={0.15} />
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search courses by code or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/80 border-amber-100 focus-visible:ring-amber-300"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : filtered.length === 0 ? (
          <Card className="border-amber-100 bg-amber-50/40">
            <CardContent className="py-12 text-center text-muted-foreground">
              No courses match your search.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c, i) => {
              const progress = c.question_count > 0 ? Math.round((c.attempted / c.question_count) * 100) : 0;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.4) }}
                >
                  <Card className="group relative h-full overflow-hidden border border-amber-100/60 bg-gradient-to-br from-white via-white to-amber-50/30 hover:shadow-[0_12px_36px_-12px_rgba(180,140,40,0.30)] hover:-translate-y-0.5 transition-all">
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-300/60 via-amber-500/60 to-transparent" />
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <CardTitle className="font-serif text-lg">{c.code}</CardTitle>
                          <CardDescription className="line-clamp-2">{c.name}</CardDescription>
                        </div>
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200">{c.question_count} Q</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {c.question_count > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{c.attempted}/{c.question_count} attempted</span>
                            {c.avg_score !== null && (
                              <span className="font-semibold text-amber-700">{c.avg_score}% avg</span>
                            )}
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-amber-100/60 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                              className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
                            />
                          </div>
                        </div>
                      )}
                      <Button asChild className="w-full bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white" variant={c.question_count > 0 ? "default" : "outline"}>
                        <Link to={`/theory/${c.id}`}>
                          <PenLine className="w-4 h-4" /> {c.question_count > 0 ? (c.attempted > 0 ? "Continue" : "Start Practice") : "Open"} <ChevronRight className="w-4 h-4 ml-auto" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        <Card className="border-amber-100 bg-gradient-to-br from-white via-amber-50/40 to-white">
          <CardContent className="p-6 flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold">Need objective practice?</h3>
                <p className="text-sm text-muted-foreground">Switch to CBT mode for multiple-choice questions or get an AI coach inside any theory course.</p>
              </div>
            </div>
            <Button asChild variant="outline" className="border-amber-200 hover:bg-amber-50">
              <Link to="/dashboard">Go to CBT Quizzes</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TheoryPrep;
