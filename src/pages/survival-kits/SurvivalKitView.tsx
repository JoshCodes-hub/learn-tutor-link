import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO } from "@/components/seo/SEO";
import { ArrowLeft, FileText, ListChecks, ScrollText, Sparkles, Download } from "lucide-react";

interface Kit {
  id: string;
  title: string;
  description: string | null;
  contents: {
    notes_url?: string;
    summary?: string;
    likely_questions?: string[];
    model_answers?: { question: string; answer: string }[];
  };
  token_cost: number;
  course?: { code: string; name: string } | null;
}

const SurvivalKitView = () => {
  const { kitId } = useParams<{ kitId: string }>();
  const [kit, setKit] = useState<Kit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!kitId) return;
      const { data } = await supabase
        .from("course_survival_kits")
        .select("*")
        .eq("id", kitId)
        .single();
      if (data) {
        const { data: c } = await supabase.from("courses").select("code, name").eq("id", (data as any).course_id).maybeSingle();
        setKit({ ...(data as any), course: c ?? null });
      }
      setLoading(false);
    })();
  }, [kitId]);

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="flex justify-center pt-32"><LoadingSpinner /></div></div>;
  if (!kit) return <div className="min-h-screen bg-background"><Navbar /><div className="container pt-24 text-center">Kit not found.</div></div>;

  const c = kit.contents ?? {};

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${kit.title} | Survival Kit`} description={kit.description ?? "Tutor-curated bundle for exam preparation."} />
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/survival-kits"><ArrowLeft className="w-4 h-4" /> All Kits</Link>
        </Button>

        <Card className="glass-card mb-6">
          <CardHeader>
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                {kit.course?.code && <Badge variant="outline" className="mb-2">{kit.course.code}</Badge>}
                <CardTitle className="font-display text-2xl md:text-3xl">{kit.title}</CardTitle>
                <CardDescription className="text-base mt-2">{kit.description}</CardDescription>
              </div>
              <Badge className="bg-primary/15 text-primary border-primary/30 text-base">
                {kit.token_cost > 0 ? `${kit.token_cost} tokens` : "Free Access"}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6">
          {c.notes_url && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Course Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild><a href={c.notes_url} target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4" /> Download Notes</a></Button>
              </CardContent>
            </Card>
          )}

          {c.summary && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2"><ScrollText className="w-5 h-5 text-primary" /> Past-Question Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.summary}</p>
              </CardContent>
            </Card>
          )}

          {Array.isArray(c.likely_questions) && c.likely_questions.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2"><ListChecks className="w-5 h-5 text-primary" /> Likely Questions</CardTitle>
                <CardDescription>{c.likely_questions.length} curated for this exam</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  {c.likely_questions.map((q, i) => <li key={i} className="leading-relaxed">{q}</li>)}
                </ol>
              </CardContent>
            </Card>
          )}

          {Array.isArray(c.model_answers) && c.model_answers.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Model Answers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {c.model_answers.map((m, i) => (
                  <div key={i} className="rounded-lg border border-border/60 bg-muted/20 p-4">
                    <p className="font-semibold text-sm mb-2">Q{i + 1}. {m.question}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{m.answer}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default SurvivalKitView;
