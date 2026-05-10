import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles, Trophy, AlertTriangle, Bookmark, BookmarkCheck, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { useBookmarkPlaylist, usePlaylistByAttempt } from "@/hooks/useRemediationPlaylists";

export default function MockExamResult() {
  const { examId, attemptId } = useParams<{ examId: string; attemptId: string }>();
  const nav = useNavigate();
  const [attempt, setAttempt] = useState<any>(null);
  const [topics, setTopics] = useState<Map<string, string>>(new Map());
  const [proctor, setProctor] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiBusy, setAiBusy] = useState(false);
  const [playlist, setPlaylist] = useState<string>("");
  const bookmark = useBookmarkPlaylist();
  const { data: existing, refetch: refetchExisting } = usePlaylistByAttempt(attemptId);

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      const { data } = await supabase
        .from("mock_exam_attempts")
        .select("*, exam:mock_exams(title, duration_min, total_questions)")
        .eq("id", attemptId).maybeSingle();
      setAttempt(data);
      const ids = ((data?.topic_breakdown ?? []) as any[]).map(t => t.topic_id).filter(Boolean);
      if (ids.length) {
        const { data: ts } = await supabase.from("topics").select("id, name").in("id", ids);
        setTopics(new Map((ts ?? []).map((t: any) => [t.id, t.name])));
      }
      const { data: ev } = await (supabase as any).from("exam_proctor_events")
        .select("*").eq("attempt_id", attemptId).order("occurred_at");
      setProctor(ev ?? []);
      setLoading(false);
    })();
  }, [attemptId]);

  const generatePlaylist = async () => {
    if (!attempt) return;
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-remediation-playlist", {
        body: { attempt_id: attempt.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setPlaylist((data as any).playlist || "");
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setAiBusy(false); }
  };

  const saveBookmark = async () => {
    if (!attempt || !playlist) return;
    try {
      const breakdown = ((attempt.topic_breakdown ?? []) as any[]).map(t => ({
        ...t, name: topics.get(t.topic_id) ?? "Topic",
      }));
      await bookmark.mutateAsync({
        title: `${attempt.exam?.title ?? "Mock"} — Remediation`,
        content: playlist,
        attemptId: attempt.id,
        examId: attempt.exam_id ?? null,
        topicBreakdown: breakdown,
      });
      toast.success("Saved to your playlists");
      refetchExisting();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading || !attempt) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  const pct = attempt.total ? Math.round((attempt.score / attempt.total) * 100) : 0;
  const breakdown = (attempt.topic_breakdown ?? []) as { topic_id: string; correct: number; total: number }[];
  const totalBlurMs = proctor.reduce((s, e) => s + (e.duration_ms || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO title="Exam Results" description="Mock exam result" />
      <header className="flex items-center gap-2 px-3 py-3 border-b">
        <Button variant="ghost" size="icon" onClick={() => nav("/exams")}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-base font-semibold flex-1">Results</h1>
        <Button variant="ghost" size="sm" onClick={() => nav("/remediation")}>
          <Bookmark className="w-4 h-4 mr-1" /> My Plans
        </Button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="rounded-2xl border-2 border-primary/20 bg-card p-6 text-center">
          <Trophy className={`w-12 h-12 mx-auto mb-2 ${pct >= 70 ? "text-amber-500" : "text-muted-foreground"}`} />
          <h2 className="text-3xl font-bold">{attempt.score} / {attempt.total}</h2>
          <p className="text-2xl font-semibold text-primary mt-1">{pct}%</p>
          <p className="text-xs text-muted-foreground mt-2">{attempt.exam?.title}</p>
        </div>

        {/* Proctoring summary */}
        {(proctor.length > 0 || (attempt.tab_blur_count ?? 0) > 0) && (
          <div className={`rounded-xl border p-4 ${proctor.length >= 3 ? "border-destructive/40 bg-destructive/5" : "border-amber-300 bg-amber-50 dark:bg-amber-950/20"}`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`w-4 h-4 ${proctor.length >= 3 ? "text-destructive" : "text-amber-600"}`} />
              <h3 className="font-semibold text-sm">Proctoring Summary</h3>
            </div>
            <p className="text-xs mb-2">
              <strong>{proctor.length || attempt.tab_blur_count}</strong> tab-switch{(proctor.length || attempt.tab_blur_count) === 1 ? "" : "es"} recorded
              {totalBlurMs > 0 && <> · away for <strong>{Math.round(totalBlurMs / 1000)}s</strong></>}
            </p>
            {proctor.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {proctor.slice(0, 10).map(e => (
                  <div key={e.id} className="text-[11px] flex justify-between gap-2">
                    <span className="text-muted-foreground"><Eye className="w-3 h-3 inline mr-1" />{e.kind}</span>
                    <span>{format(new Date(e.occurred_at), "p")}</span>
                    <span className="font-mono text-muted-foreground">{Math.round((e.duration_ms || 0) / 1000)}s</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {breakdown.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3">Per-topic breakdown</h3>
            <div className="space-y-2.5">
              {breakdown.map(t => {
                const p = t.total ? Math.round((t.correct / t.total) * 100) : 0;
                return (
                  <div key={t.topic_id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="truncate pr-2">{topics.get(t.topic_id) ?? "Topic"}</span>
                      <span className="text-muted-foreground">{t.correct}/{t.total} · {p}%</span>
                    </div>
                    <Progress value={p} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" /> AI Remediation Playlist
          </h3>
          {!playlist && !existing ? (
            <Button onClick={generatePlaylist} disabled={aiBusy} className="w-full">
              {aiBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate study plan from results
            </Button>
          ) : (
            <>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{playlist || existing?.content || ""}</ReactMarkdown>
              </div>
              <div className="flex gap-2 mt-4">
                {existing ? (
                  <Button variant="secondary" disabled className="flex-1">
                    <BookmarkCheck className="w-4 h-4 mr-1.5" /> Saved
                  </Button>
                ) : (
                  <Button onClick={saveBookmark} disabled={bookmark.isPending} className="flex-1">
                    <Bookmark className="w-4 h-4 mr-1.5" /> Bookmark Plan
                  </Button>
                )}
                <Button variant="outline" onClick={() => nav("/remediation")}>View All</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
