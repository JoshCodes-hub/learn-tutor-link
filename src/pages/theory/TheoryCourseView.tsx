import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ChevronRight, ArrowLeft, Calendar, Plus, PenLine } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { CreateTheoryQuestionDialog } from "@/components/theory/CreateTheoryQuestionDialog";

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
  const { hasRole } = useAuth();
  const canCreate = hasRole("tutor") || hasRole("admin");
  const [course, setCourse] = useState<{ code: string; name: string } | null>(null);
  const [questions, setQuestions] = useState<TheoryQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const load = async () => {
    if (!courseId) return;
    const [{ data: c }, { data: qs }] = await Promise.all([
      supabase.from("courses").select("code, name").eq("id", courseId).single(),
      supabase
        .from("theory_questions")
        .select("id, question_text, difficulty, marks, year, source")
        .eq("course_id", courseId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false }),
    ]);
    setCourse(c);
    setQuestions(qs ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${course?.code ?? "Theory"} – Theory Prep`} description="Written/theory question practice with AI evaluation." />
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <Button asChild variant="ghost" size="sm" className="mb-4"><Link to="/theory"><ArrowLeft className="w-4 h-4" /> All Courses</Link></Button>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold">{course?.code}</h1>
                <p className="text-muted-foreground">{course?.name}</p>
              </div>
              {canCreate && (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4" /> Add Theory Question
                </Button>
              )}
            </div>

            {questions.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-12 text-center">
                  <PenLine className="w-10 h-10 text-primary mx-auto mb-3" />
                  <p className="font-display text-lg mb-1">No theory questions yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {canCreate
                      ? "Create the first written/essay question for this course."
                      : "A tutor hasn't added theory questions for this course yet. Check back soon."}
                  </p>
                  {canCreate && (
                    <Button onClick={() => setCreateOpen(true)}>
                      <Plus className="w-4 h-4" /> Add First Question
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {questions.map((q) => (
                  <Card key={q.id} className="glass-card hover:shadow-lg transition-all">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-base font-medium leading-relaxed line-clamp-3 flex-1">{q.question_text}</CardTitle>
                        <Badge variant="secondary">{q.marks} marks</Badge>
                      </div>
                      <CardDescription className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="capitalize">{q.difficulty}</Badge>
                        {q.year && <Badge variant="outline"><Calendar className="w-3 h-3 mr-1" />{q.year}</Badge>}
                        {q.source && <Badge variant="outline">{q.source}</Badge>}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild className="w-full sm:w-auto"><Link to={`/theory/question/${q.id}`}>Attempt Question <ChevronRight className="w-4 h-4 ml-1" /></Link></Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {courseId && (
        <CreateTheoryQuestionDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          courseId={courseId}
          onCreated={load}
        />
      )}
    </div>
  );
};

export default TheoryCourseView;
