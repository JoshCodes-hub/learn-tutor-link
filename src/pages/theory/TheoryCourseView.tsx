import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ChevronRight, ArrowLeft, Calendar, Plus, PenLine, CheckCircle2, Filter } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { CreateTheoryQuestionDialog } from "@/components/theory/CreateTheoryQuestionDialog";
import { StudyCoachPanel } from "@/components/study-hub/StudyCoachPanel";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TheoryQ {
  id: string;
  question_text: string;
  difficulty: string;
  marks: number;
  year: number | null;
  source: string | null;
}

const TheoryCourseView = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, hasRole } = useAuth();
  const canCreate = hasRole("tutor") || hasRole("admin");
  const [course, setCourse] = useState<{ code: string; name: string } | null>(null);
  const [questions, setQuestions] = useState<TheoryQ[]>([]);
  const [attemptedIds, setAttemptedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<string>("all");

  const load = async () => {
    if (!courseId) return;
    const [{ data: c }, { data: qs }] = await Promise.all([
      supabase.from("courses").select("code, name").eq("id", courseId).single(),
      supabase.from("theory_questions")
        .select("id, question_text, difficulty, marks, year, source")
        .eq("course_id", courseId).eq("is_approved", true)
        .order("created_at", { ascending: false }),
    ]);
    setCourse(c);
    setQuestions(qs ?? []);

    if (user && qs?.length) {
      const { data: attempts } = await supabase
        .from("theory_attempts")
        .select("question_id")
        .eq("user_id", user.id)
        .eq("status", "submitted")
        .in("question_id", qs.map((q: any) => q.id));
      setAttemptedIds(new Set((attempts ?? []).map((a: any) => a.question_id)));
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [courseId, user]);

  const filtered = difficulty === "all" ? questions : questions.filter(q => q.difficulty === difficulty);
  const difficulties = Array.from(new Set(questions.map(q => q.difficulty)));

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${course?.code ?? "Theory"} – Theory Prep`} description="Written/theory question practice with AI evaluation." />
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-6xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/theory"><ArrowLeft className="w-4 h-4" /> All Courses</Link>
        </Button>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : (
          <>
            {/* Premium hero */}
            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative overflow-hidden rounded-3xl border border-amber-100/60 bg-gradient-to-br from-white via-amber-50/40 to-white shadow-[0_8px_40px_-16px_rgba(180,140,40,0.30)] p-6 md:p-8 mb-6"
            >
              <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-gradient-to-br from-amber-300/30 to-transparent blur-3xl" />
              <div className="relative flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shrink-0">
                    <PenLine className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2 border-amber-200 text-amber-800 bg-amber-50/60">{course?.code}</Badge>
                    <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight">{course?.name}</h1>
                    <p className="text-muted-foreground mt-1.5 text-sm flex flex-wrap gap-x-3 gap-y-1">
                      <span>{questions.length} {questions.length === 1 ? "question" : "questions"}</span>
                      {user && questions.length > 0 && (
                        <span className="flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {attemptedIds.size} attempted
                        </span>
                      )}
                      <span>· AI grading & coach included</span>
                    </p>
                  </div>
                </div>
                {canCreate && (
                  <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white">
                    <Plus className="w-4 h-4" /> Add Theory Question
                  </Button>
                )}
              </div>
            </motion.section>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {questions.length > 0 && difficulties.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <Button size="sm" variant={difficulty === "all" ? "default" : "outline"} onClick={() => setDifficulty("all")} className={difficulty === "all" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}>
                      All
                    </Button>
                    {difficulties.map(d => (
                      <Button key={d} size="sm" variant={difficulty === d ? "default" : "outline"} onClick={() => setDifficulty(d)} className={cn("capitalize", difficulty === d ? "bg-amber-600 hover:bg-amber-700 text-white" : "")}>
                        {d}
                      </Button>
                    ))}
                  </div>
                )}

                {filtered.length === 0 ? (
                  <Card className="border-amber-100 bg-gradient-to-br from-white to-amber-50/30">
                    <CardContent className="py-12 text-center">
                      <PenLine className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                      <p className="font-display text-lg mb-1">{questions.length === 0 ? "No theory questions yet" : "No questions match this filter"}</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        {canCreate && questions.length === 0
                          ? "Create the first written/essay question for this course."
                          : questions.length === 0
                            ? "A tutor hasn't added theory questions yet. Check back soon."
                            : "Try a different difficulty level."}
                      </p>
                      {canCreate && questions.length === 0 && (
                        <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                          <Plus className="w-4 h-4" /> Add First Question
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {filtered.map((q, i) => {
                      const done = attemptedIds.has(q.id);
                      return (
                        <motion.div
                          key={q.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                        >
                          <Card className={cn(
                            "border-amber-100/60 bg-gradient-to-br from-white to-amber-50/20 hover:shadow-[0_12px_36px_-12px_rgba(180,140,40,0.30)] hover:-translate-y-0.5 transition-all",
                            done && "border-emerald-200/70"
                          )}>
                            <CardHeader>
                              <div className="flex items-start justify-between gap-3">
                                <CardTitle className="text-base font-medium leading-relaxed line-clamp-3 flex-1">{q.question_text}</CardTitle>
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 shrink-0">{q.marks} marks</Badge>
                              </div>
                              <CardDescription className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="outline" className="capitalize">{q.difficulty}</Badge>
                                {q.year && <Badge variant="outline"><Calendar className="w-3 h-3 mr-1" />{q.year}</Badge>}
                                {q.source && <Badge variant="outline">{q.source}</Badge>}
                                {done && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" />Attempted</Badge>}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <Button asChild className={cn("w-full sm:w-auto", done ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white")}>
                                <Link to={`/theory/question/${q.id}`}>
                                  {done ? "Review Attempt" : "Attempt Question"} <ChevronRight className="w-4 h-4 ml-1" />
                                </Link>
                              </Button>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="lg:col-span-1 space-y-6">
                <div className="lg:sticky lg:top-24 space-y-6">
                  <StudyCoachPanel
                    course={course ? { code: course.code, name: course.name } : undefined}
                    materials={questions.slice(0, 20).map(q => ({ title: q.question_text.slice(0, 80), description: `${q.marks} marks · ${q.difficulty}${q.year ? ` · ${q.year}` : ""}` }))}
                    mode="theory"
                  />
                  {courseId && <LearningGoalsPanel courseId={courseId} />}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {courseId && (
        <CreateTheoryQuestionDialog open={createOpen} onOpenChange={setCreateOpen} courseId={courseId} onCreated={load} />
      )}
    </div>
  );
};

export default TheoryCourseView;
