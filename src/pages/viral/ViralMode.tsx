import { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Flame, Gauge, Hourglass, Share2 } from "lucide-react";
import { toast } from "sonner";

const MODE_META: Record<string, { title: string; tagline: string; icon: any; mode: string }> = {
  "exam-tomorrow": { title: "Exam Tomorrow — Cram Mode", tagline: "Top 20 likely questions + 1-page cheat sheet.", icon: Flame, mode: "exam-tomorrow" },
  "can-i-pass": { title: "Can I Pass?", tagline: "Get an honest readiness verdict you can share.", icon: Gauge, mode: "can-i-pass" },
  "two-hours-left": { title: "2 Hours Left", tagline: "Bite-sized last-minute tips, subject by subject.", icon: Hourglass, mode: "two-hours-left" },
};

const ViralMode = () => {
  const { mode = "" } = useParams();
  const { profile, primaryRole } = useAuth();
  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as "admin" | "tutor" | "student";
  const meta = MODE_META[mode];
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  if (!meta) return <Navigate to="/student/dashboard" replace />;

  const Icon = meta.icon;

  const generate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const md = (profile?.academic_metadata as any) || {};
      const { data, error } = await supabase.functions.invoke("viral-mode", {
        body: {
          mode: meta.mode,
          academic_path: profile?.academic_path,
          subjects: md.subjects || [],
          target: md.target_course || md.department || md.level,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data.result);
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const share = async () => {
    const text = mode === "can-i-pass" && result
      ? `My OverraPrep AI readiness: ${result.score}/100 — ${result.verdict}! 🎓`
      : `Just used OverraPrep AI's ${meta.title}. 🔥`;
    if (navigator.share) {
      try { await navigator.share({ title: meta.title, text, url: window.location.href }); } catch {}
    } else {
      await navigator.clipboard.writeText(`${text} ${window.location.href}`);
      toast.success("Copied to clipboard!");
    }
  };

  return (
    <>
      <SEO title={meta.title} description={meta.tagline} url={`https://overraprep.com/${mode}`} />
      <div className="min-h-screen bg-background">
        <DashboardNav role={navRole} />
        <DashboardBreadcrumb role={navRole} />
        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <Icon className="w-8 h-8 text-primary" /> {meta.title}
            </h1>
            <p className="text-muted-foreground mt-1">{meta.tagline}</p>
          </div>

          {!result && (
            <Card>
              <CardContent className="p-8 text-center space-y-4">
                <Icon className="w-16 h-16 mx-auto text-primary/50" />
                <p className="text-muted-foreground">Tap below and the AI will tailor everything to your path & subjects.</p>
                <Button onClick={generate} disabled={loading} size="lg">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Building...</> : <><Flame className="w-4 h-4 mr-2" /> Activate {meta.title}</>}
                </Button>
              </CardContent>
            </Card>
          )}

          {result && mode === "exam-tomorrow" && (
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>📋 Cheat Sheet</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {result.cheat_sheet?.map((c: string, i: number) => (
                      <li key={i} className="flex gap-2"><span className="text-primary">•</span>{c}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>🎯 Top 20 Likely Questions</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {result.top_questions?.map((q: any, i: number) => (
                    <div key={i} className="border border-border/50 rounded-lg p-3">
                      <p className="font-medium text-sm mb-1">Q{i + 1}. {q.q}</p>
                      <p className="text-sm text-muted-foreground">{q.answer}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {result && mode === "can-i-pass" && (
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-8 text-center">
                <p className="text-sm uppercase tracking-wider text-muted-foreground mb-2">Readiness Score</p>
                <p className="font-display text-7xl font-bold text-primary">{result.score}</p>
                <Badge className="mt-3" variant={result.verdict === "Pass" ? "default" : "outline"}>{result.verdict}</Badge>
                <p className="mt-4 text-lg font-medium">{result.headline}</p>
              </div>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Why this score</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {result.reasons?.map((r: string, i: number) => <li key={i}>• {r}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Next steps</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {result.next_steps?.map((r: string, i: number) => <li key={i}>✓ {r}</li>)}
                  </ul>
                </div>
                <Button onClick={share} variant="outline" className="w-full"><Share2 className="w-4 h-4 mr-2" /> Share Result</Button>
              </CardContent>
            </Card>
          )}

          {result && mode === "two-hours-left" && (
            <div className="space-y-3">
              {result.tips?.map((t: any, i: number) => (
                <Card key={i}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0">{t.minutes}m</Badge>
                    <div>
                      <p className="font-semibold text-sm">{t.subject}</p>
                      <p className="text-sm text-muted-foreground">{t.tip}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {result && (
            <div className="mt-6 flex gap-2">
              <Button onClick={generate} variant="outline" className="flex-1" disabled={loading}>Regenerate</Button>
              <Button onClick={share} className="flex-1"><Share2 className="w-4 h-4 mr-2" /> Share</Button>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default ViralMode;
