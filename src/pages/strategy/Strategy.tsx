import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, BookOpen, X, Calendar, Save } from "lucide-react";
import { toast } from "sonner";

interface PlanDay { day: number; focus: string; tasks: string[]; estimated_minutes: number; }
interface Plan { summary: string; what_to_read: string[]; what_to_skip: string[]; days: PlanDay[]; }

const Strategy = () => {
  const { user, profile, primaryRole } = useAuth();
  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as "admin" | "tutor" | "student";
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(7);

  const generate = async () => {
    setLoading(true);
    setPlan(null);
    try {
      const meta = (profile?.academic_metadata as any) || {};
      const { data, error } = await supabase.functions.invoke("generate-study-plan", {
        body: {
          academic_path: profile?.academic_path,
          target: meta.target_course || meta.level || meta.department,
          subjects: meta.subjects || [],
          days,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPlan(data.plan);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  const savePlan = async () => {
    if (!plan || !user) return;
    const { error } = await supabase.from("study_plans").insert({
      user_id: user.id,
      title: `${days}-Day Strategy Plan`,
      plan_data: plan as any,
    });
    if (error) toast.error("Couldn't save plan");
    else toast.success("Plan saved to your dashboard");
  };

  return (
    <>
      <SEO title="Exam Strategy Engine" description="Get a personalized AI-built study plan tailored to your academic path." url="https://overraprep.com/strategy" />
      <div className="min-h-screen bg-background">
        <DashboardNav role={navRole} />
        <DashboardBreadcrumb role={navRole} />
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-primary" /> Exam Strategy Engine
            </h1>
            <p className="text-muted-foreground mt-1">AI builds a personalized plan: what to read, what to skip, and how to spend each day.</p>
          </div>

          <Card className="mb-8">
            <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Plan length:</label>
                <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="bg-muted rounded-md px-3 py-1.5 text-sm border border-border">
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
              <Button onClick={generate} disabled={loading} className="ml-auto">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Plan</>}
              </Button>
            </CardContent>
          </Card>

          {plan && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{plan.summary}</p>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> What to Read</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {plan.what_to_read?.map((x, i) => (<li key={i} className="flex gap-2"><span className="text-primary">•</span>{x}</li>))}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display flex items-center gap-2"><X className="w-5 h-5 text-destructive" /> What to Skip</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {plan.what_to_skip?.map((x, i) => (<li key={i} className="flex gap-2"><span className="text-destructive">•</span>{x}</li>))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> Daily Roadmap</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {plan.days?.map((d) => (
                    <div key={d.day} className="border border-border/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Day {d.day}: {d.focus}</h4>
                        <Badge variant="outline">{d.estimated_minutes} min</Badge>
                      </div>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        {d.tasks?.map((t, i) => (<li key={i} className="flex gap-2"><span>✓</span>{t}</li>))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Button onClick={savePlan} variant="outline" className="w-full"><Save className="w-4 h-4 mr-2" /> Save Plan</Button>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default Strategy;
