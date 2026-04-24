import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO } from "@/components/seo/SEO";
import { ArrowLeft, FileText, Lock, Globe, Plus, Trash2, Sparkles } from "lucide-react";
import { UploadMaterialDialog } from "@/components/study-hub/UploadMaterialDialog";
import { MaterialAIPanel } from "@/components/study-hub/MaterialAIPanel";
import { toast } from "sonner";

interface Material {
  id: string;
  title: string;
  description: string | null;
  file_type: string;
  file_size: number;
  visibility: "public" | "private";
  owner_id: string;
  created_at: string;
}

interface Course {
  id: string;
  code: string;
  name: string;
}

const StudyHubCourse = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [openMaterial, setOpenMaterial] = useState<Material | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const load = async () => {
    if (!courseId) return;
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from("courses").select("id, code, name").eq("id", courseId).single(),
      supabase
        .from("study_materials")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false }),
    ]);
    if (c) setCourse(c as Course);
    setMaterials((m as Material[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (user && courseId) load();
  }, [user, courseId]);

  const handleDelete = async (mat: Material) => {
    if (!confirm(`Delete "${mat.title}"? This removes the file and all AI artifacts.`)) return;
    const { error } = await supabase.from("study_materials").delete().eq("id", mat.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Material deleted");
    setOpenMaterial(null);
    load();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center pt-32"><LoadingSpinner /></div>
      </div>
    );
  }
  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-24 text-center">Course not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${course.code} Study Hub | OverraPrep AI`} description="AI-powered study materials." />
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-5xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/study-hub"><ArrowLeft className="w-4 h-4" /> All Courses</Link>
        </Button>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <Badge variant="outline" className="mb-2">{course.code}</Badge>
            <h1 className="font-display text-3xl font-bold">{course.name}</h1>
            <p className="text-muted-foreground mt-1">Study materials & AI-generated study aids</p>
          </div>
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="w-4 h-4" /> Upload Material
          </Button>
        </div>

        {materials.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-16 text-center">
              <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
              <p className="font-display text-lg mb-1">No materials yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your first PDF, slide deck, or notes to start generating AI summaries and flashcards.
              </p>
              <Button onClick={() => setUploadOpen(true)}>
                <Plus className="w-4 h-4" /> Upload Material
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {materials.map((m) => (
              <Card
                key={m.id}
                className="glass-card hover:border-primary/50 hover:shadow-elegant transition-all cursor-pointer"
                onClick={() => setOpenMaterial(m)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="font-display text-base line-clamp-2">{m.title}</CardTitle>
                      {m.description && (
                        <CardDescription className="line-clamp-2 mt-1">{m.description}</CardDescription>
                      )}
                    </div>
                    <Badge variant={m.visibility === "public" ? "secondary" : "outline"} className="shrink-0">
                      {m.visibility === "public" ? <Globe className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                      {m.visibility}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    {(m.file_size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  {m.owner_id === user?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleDelete(m); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <UploadMaterialDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        courseId={courseId!}
        onUploaded={load}
      />

      {openMaterial && (
        <MaterialAIPanel
          material={openMaterial}
          open={!!openMaterial}
          onOpenChange={(v) => !v && setOpenMaterial(null)}
        />
      )}
    </div>
  );
};

export default StudyHubCourse;
