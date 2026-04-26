import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO } from "@/components/seo/SEO";
import { LifeBuoy, Plus, ChevronRight, Sparkles } from "lucide-react";
import { CreateSurvivalKitDialog } from "@/components/tutor/CreateSurvivalKitDialog";

interface Kit {
  id: string;
  course_id: string;
  tutor_id: string;
  title: string;
  description: string | null;
  contents: any;
  token_cost: number;
  course?: { code: string; name: string } | null;
}

const SurvivalKits = () => {
  const { primaryRole, hasRole } = useAuth();
  const [searchParams] = useSearchParams();
  const courseFilter = searchParams.get("course");
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as "admin" | "tutor" | "student";
  const canCreate = hasRole("tutor") || hasRole("admin");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("course_survival_kits")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (courseFilter) q = q.eq("course_id", courseFilter);
    const { data } = await q;
    const rows = (data ?? []) as any[];
    const courseIds = Array.from(new Set(rows.map((r) => r.course_id)));
    const courseMap = new Map<string, { code: string; name: string }>();
    if (courseIds.length) {
      const { data: cs } = await supabase.from("courses").select("id, code, name").in("id", courseIds);
      (cs ?? []).forEach((c) => courseMap.set(c.id, { code: c.code, name: c.name }));
    }
    setKits(rows.map((r) => ({ ...r, course: courseMap.get(r.course_id) ?? null })) as Kit[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [courseFilter]);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Course Survival Kits | OverraPrep AI" description="Tutor-curated bundles: notes, past-question summaries, likely questions and model answers." />
      <Navbar />
      <div className="pt-16 md:pt-[72px]">
        <DashboardNav role={navRole} />
        <DashboardBreadcrumb role={navRole} />
      </div>
      <main className="container mx-auto px-4 pt-6 pb-16">
        <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <LifeBuoy className="w-4 h-4" /> Survival Kits
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">Course Survival Kits</h1>
            <p className="text-muted-foreground max-w-2xl">
              All-in-one bundles by top tutors: notes + past-question summary + likely questions + model answers — for one course, in one place.
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> New Kit</Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : kits.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
              <p className="font-display text-lg mb-1">No survival kits yet</p>
              <p className="text-sm text-muted-foreground">
                {canCreate ? "Be the first tutor to publish a kit for your course." : "Tutors haven't published kits yet — check back soon."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kits.map((k) => (
              <Card key={k.id} className="glass-card hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="font-display text-lg line-clamp-2">{k.title}</CardTitle>
                    {k.token_cost > 0 ? (
                      <Badge variant="secondary">{k.token_cost} tokens</Badge>
                    ) : (
                      <Badge className="bg-primary/15 text-primary border-primary/30">Free</Badge>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {k.course?.code ? <span className="font-semibold">{k.course.code}</span> : null} {k.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {k.contents?.notes_url && <Badge variant="outline">Notes</Badge>}
                    {k.contents?.summary && <Badge variant="outline">PQ Summary</Badge>}
                    {Array.isArray(k.contents?.likely_questions) && k.contents.likely_questions.length > 0 && (
                      <Badge variant="outline">{k.contents.likely_questions.length} likely Qs</Badge>
                    )}
                    {Array.isArray(k.contents?.model_answers) && k.contents.model_answers.length > 0 && (
                      <Badge variant="outline">{k.contents.model_answers.length} model answers</Badge>
                    )}
                  </div>
                  <Button asChild className="w-full">
                    <Link to={`/survival-kits/${k.id}`}>Open Kit <ChevronRight className="w-4 h-4 ml-auto" /></Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <CreateSurvivalKitDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={load} />
    </div>
  );
};

export default SurvivalKits;
