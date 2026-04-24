import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEO } from "@/components/seo/SEO";
import { ArrowLeft, TrendingUp, Loader2, RefreshCw, BarChart3 } from "lucide-react";
import { toast } from "sonner";

interface Cluster {
  topic: string;
  count: number;
  years: number[];
  probability: "high" | "medium" | "low";
  sample_questions: { id: string; text: string; type: "cbt" | "theory"; year: number | null }[];
}

interface Course { id: string; code: string; name: string }

const PQIntelligence = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [totals, setTotals] = useState<{ cbt: number; theory: number }>({ cbt: 0, theory: 0 });
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const [filterProb, setFilterProb] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!courseId || !user) return;
    (async () => {
      const { data: c } = await supabase.from("courses").select("id, code, name").eq("id", courseId).single();
      if (c) setCourse(c as Course);
      setLoading(false);
    })();
  }, [courseId, user]);

  const analyze = async () => {
    if (!courseId) return;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-past-questions", {
        body: { course_id: courseId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setClusters(data?.clusters ?? []);
      setTotals(data?.totals ?? { cbt: 0, theory: 0 });
      if (!data?.clusters?.length) toast.info(data?.message ?? "No data to analyze yet.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to analyze";
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const filtered = useMemo(() => {
    return clusters.filter((c) => {
      if (filterProb !== "all" && c.probability !== filterProb) return false;
      if (filterType !== "all" && !c.sample_questions.some((q) => q.type === filterType)) return false;
      return true;
    });
  }, [clusters, filterProb, filterType]);

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
      <SEO title={`${course.code} Past Question Intelligence | OverraPrep AI`} description="AI-powered trends and probability analysis." />
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-5xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to={`/study-hub/${courseId}`}><ArrowLeft className="w-4 h-4" /> Study Hub</Link>
        </Button>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <Badge variant="outline" className="mb-2">{course.code}</Badge>
            <h1 className="font-display text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-primary" /> Past Question Intelligence
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-detected trends and exam probability across CBT and theory questions.
            </p>
          </div>
          <Button onClick={analyze} disabled={analyzing}>
            {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><RefreshCw className="w-4 h-4" /> {clusters.length ? "Re-analyze" : "Analyze Now"}</>}
          </Button>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          <Card className="glass-card">
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">CBT Questions</p>
              <p className="text-2xl font-display font-bold">{totals.cbt}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Theory Questions</p>
              <p className="text-2xl font-display font-bold">{totals.theory}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Topic Clusters</p>
              <p className="text-2xl font-display font-bold">{clusters.length}</p>
            </CardContent>
          </Card>
        </div>

        {clusters.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-4">
            <Select value={filterProb} onValueChange={setFilterProb}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Probabilities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="cbt">CBT Only</SelectItem>
                <SelectItem value="theory">Theory Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {clusters.length === 0 && !analyzing && (
          <Card className="glass-card">
            <CardContent className="py-16 text-center">
              <BarChart3 className="w-10 h-10 text-primary mx-auto mb-3" />
              <p className="font-display text-lg mb-1">No analysis yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Click <strong>Analyze Now</strong> to let AI scan past questions and detect topic trends.
              </p>
              <Button onClick={analyze}><RefreshCw className="w-4 h-4" /> Analyze Now</Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {filtered.map((c, i) => (
            <Card key={i} className="glass-card">
              <CardHeader>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1">
                    <CardTitle className="font-display text-lg">{c.topic}</CardTitle>
                    <CardDescription className="mt-1">
                      Appeared in {c.count} {c.count === 1 ? "question" : "questions"}
                      {c.years.length > 0 && ` · Years: ${c.years.join(", ")}`}
                    </CardDescription>
                  </div>
                  <Badge variant={c.probability === "high" ? "default" : c.probability === "medium" ? "secondary" : "outline"} className="capitalize text-sm px-3 py-1">
                    {c.probability} probability
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {c.sample_questions.slice(0, 3).map((q) => (
                    <div key={q.id} className="text-sm p-2.5 rounded-md bg-muted/30 border border-border/40">
                      <div className="flex gap-2 items-center mb-1">
                        <Badge variant="outline" className="text-[10px] capitalize">{q.type}</Badge>
                        {q.year && <span className="text-xs text-muted-foreground">{q.year}</span>}
                      </div>
                      <p className="leading-relaxed">{q.text}{q.text.length >= 220 && "..."}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default PQIntelligence;
