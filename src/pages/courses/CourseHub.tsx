import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { SEO } from "@/components/seo/SEO";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen, FileText, Layers, ClipboardList, Image as ImageIcon, Sparkles,
  Download, ExternalLink, Settings, MessageSquare, Headphones,
} from "lucide-react";
import CourseProgressCard from "@/components/courses/CourseProgressCard";
import CourseOfflineButton from "@/components/courses/CourseOfflineButton";
import CourseTopicsStrip from "@/components/courses/CourseTopicsStrip";
import { CourseChat } from "@/components/course/CourseChat";
import { useTrackCourseOpen } from "@/hooks/useRecentlyOpenedCourses";

const CourseHub = () => {
  const { courseId = "" } = useParams();
  const { user, primaryRole } = useAuth();
  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as
    "admin" | "tutor" | "student";
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  useTrackCourseOpen(courseId);

  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, code, name, department, level, description, created_by")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["course-docs", courseId, topicFilter],
    enabled: !!courseId,
    queryFn: async () => {
      let q = supabase
        .from("lecture_notes")
        .select("id, title, description, file_url, file_type, created_at, view_count, download_count, topic_id")
        .eq("course_id", courseId)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (topicFilter) q = q.eq("topic_id", topicFilter);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ["course-quizzes", courseId, topicFilter],
    enabled: !!courseId,
    queryFn: async () => {
      let q = supabase
        .from("quizzes")
        .select("id, title, description, duration_minutes, question_count, is_premium, topic_id")
        .eq("course_id", courseId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (topicFilter) q = q.eq("topic_id", topicFilter);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: flashDecks = [] } = useQuery({
    queryKey: ["course-flashcards", courseId, topicFilter],
    enabled: !!courseId,
    queryFn: async () => {
      let q = supabase
        .from("flashcards")
        .select("id, front, back, subject, topic, created_at, topic_id")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (topicFilter) q = q.eq("topic_id", topicFilter);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: images = [] } = useQuery({
    queryKey: ["course-images", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data } = await supabase
        .from("course_images")
        .select("id, url, caption, created_at")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const canManage = useMemo(
    () => !!user && (primaryRole === "admin" || (primaryRole === "tutor" && course?.created_by === user.id)),
    [user, primaryRole, course],
  );

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav role={navRole} />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <p className="text-sm text-muted-foreground">Loading course…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${course.code} — ${course.name}`} description={`All documents, quizzes, flashcards, images and AI study packs for ${course.code}.`} />
      <DashboardNav role={navRole} />
      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
        <DashboardBreadcrumb role={navRole} />

        <header className="mt-2 mb-5 rounded-xl border bg-gradient-to-br from-white to-amber-50/40 p-4 md:p-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 border-0">{course.code}</Badge>
                {course.level && <Badge variant="outline" className="text-[10px]">{course.level}</Badge>}
                {course.department && <span className="text-[11px] text-muted-foreground">{course.department}</span>}
              </div>
              <h1 className="font-display text-xl md:text-2xl mt-1.5">{course.name}</h1>
              {course.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{course.description}</p>}
            </div>
            {canManage && (
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link to={`/tutor/courses/${course.id}/manage`}><Settings className="w-3.5 h-3.5 mr-1.5" /> Manage</Link>
              </Button>
            )}
          </div>
        </header>

        <CourseProgressCard
          courseId={course.id}
          courseCode={course.code}
          totalDocs={documents.length}
          totalQuizzes={quizzes.length}
          totalFlashcards={flashDecks.length}
        />

        <CourseTopicsStrip courseId={course.id} value={topicFilter} onChange={setTopicFilter} />

        <Tabs defaultValue="documents" className="w-full">
          <TabsList className="w-full overflow-x-auto justify-start gap-1 h-auto p-1 bg-muted/50">
            <TabsTrigger value="documents" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Documents</TabsTrigger>
            <TabsTrigger value="flashcards" className="gap-1.5"><Layers className="w-3.5 h-3.5" /> Flashcards</TabsTrigger>
            <TabsTrigger value="quizzes" className="gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Quizzes</TabsTrigger>
            <TabsTrigger value="images" className="gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Images</TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5"><Sparkles className="w-3.5 h-3.5" /> AI Packs</TabsTrigger>
            <TabsTrigger value="audio" className="gap-1.5"><Headphones className="w-3.5 h-3.5" /> Audio</TabsTrigger>
            <TabsTrigger value="discuss" className="gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Discussion</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="mt-4">
            {documents.length === 0 ? (
              <EmptyState icon={<FileText className="w-6 h-6" />} text="No documents uploaded for this course yet." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {documents.map((d: any) => (
                  <Card key={d.id} className="p-3 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm leading-snug line-clamp-1">{d.title}</h3>
                      {d.description && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{d.description}</p>}
                      <div className="mt-2 flex gap-1.5 flex-wrap">
                        <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
                          <a href={d.file_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3 mr-1" /> Open</a>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
                          <a href={d.file_url} download><Download className="w-3 h-3 mr-1" /> Save</a>
                        </Button>
                        <CourseOfflineButton
                          materialId={d.id}
                          title={d.title}
                          url={d.file_url}
                          courseId={course.id}
                          courseCode={course.code}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="flashcards" className="mt-4">
            {flashDecks.length === 0 ? (
              <EmptyState icon={<Layers className="w-6 h-6" />} text="No flashcards yet — tutors can add some from Manage." />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {flashDecks.map((c: any) => (
                  <Card key={c.id} className="p-3">
                    <p className="text-sm font-semibold line-clamp-2">{c.front}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">{c.back}</p>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quizzes" className="mt-4">
            {quizzes.length === 0 ? (
              <EmptyState icon={<ClipboardList className="w-6 h-6" />} text="No quizzes assigned to this course yet." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {quizzes.map((q: any) => (
                  <Link key={q.id} to={`/quiz/${q.id}`}>
                    <Card className="p-3 hover:border-amber-300 transition">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
                          <ClipboardList className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm line-clamp-2">{q.title}</h3>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {q.question_count} questions · {q.duration_minutes} min
                          </p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="images" className="mt-4">
            {images.length === 0 ? (
              <EmptyState icon={<ImageIcon className="w-6 h-6" />} text="No images or visual materials uploaded yet." />
            ) : (
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((img: any) => (
                  <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer" className="group block">
                    <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                      <img src={img.url} alt={img.caption || "Course image"} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                    </div>
                    {img.caption && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{img.caption}</p>}
                  </a>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai" className="mt-4">
            <Card className="p-5 text-center">
              <Sparkles className="w-7 h-7 text-amber-500 mx-auto mb-2" />
              <h3 className="font-semibold">AI Study Packs</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Generate flashcards, structured summaries and practice quizzes from any of this course's documents — straight from your Library.
              </p>
              <Button asChild className="mt-3 bg-amber-500 hover:bg-amber-600 text-white">
                <Link to="/library">Open Library</Link>
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="audio" className="mt-4">
            <Card className="p-5 text-center">
              <Headphones className="w-7 h-7 text-amber-500 mx-auto mb-2" />
              <h3 className="font-semibold">Audio Lessons</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Listen to this course's materials on the go. Convert any document to audio from your library.
              </p>
              <Button asChild className="mt-3 bg-amber-500 hover:bg-amber-600 text-white">
                <Link to="/audio-learning">Open Audio Learning</Link>
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="discuss" className="mt-4">
            <CourseChat courseId={course.id} courseCode={course.code} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const EmptyState = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <Card className="p-8 text-center text-muted-foreground">
    <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-2">{icon}</div>
    <p className="text-sm">{text}</p>
  </Card>
);

export default CourseHub;