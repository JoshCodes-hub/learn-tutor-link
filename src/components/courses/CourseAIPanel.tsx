import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, Layers, ClipboardList, Loader2, RefreshCw, X, CheckCircle2, XCircle, History, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { runLibraryAI, type LibraryAIAction } from "@/lib/libraryAI";
import { saveResource, type UserResource } from "@/lib/userResources";
import { listCourseAIGenerations, type AIGenRow, type AIGenStatus } from "@/lib/aiGenerationHistory";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

interface Props {
  courseId: string;
  courseCode: string;
  topicId?: string | null;
}

interface DocRow { id: string; title: string; file_url: string; file_type: string | null; topic_id: string | null }

const ACTION_META: Record<LibraryAIAction, { label: string; icon: typeof Layers; tone: string }> = {
  summary:    { label: "Summary",      icon: FileText,      tone: "text-sky-600" },
  flashcards: { label: "Flashcards",   icon: Layers,        tone: "text-orange-600" },
  quiz:       { label: "Practice quiz", icon: ClipboardList, tone: "text-violet-600" },
};

const StatusIcon = ({ s }: { s: AIGenStatus }) => {
  if (s === "completed") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
  if (s === "failed") return <XCircle className="w-3.5 h-3.5 text-destructive" />;
  if (s === "cancelled") return <X className="w-3.5 h-3.5 text-muted-foreground" />;
  return <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />;
};

/** Wraps a lecture_notes row as a UserResource-like object that runLibraryAI can use. */
async function ingestLectureNote(doc: DocRow, userId: string, courseCode: string, courseId: string, topicId?: string | null): Promise<UserResource> {
  // Download and save into user_resources so libraryAI can extract via signed URL.
  const res = await fetch(doc.file_url);
  if (!res.ok) throw new Error("Could not download document");
  const blob = await res.blob();
  const ext = (doc.file_type || blob.type || "pdf").split("/").pop() || "pdf";
  return await saveResource({
    userId,
    kind: ext === "pdf" ? "pdf" : "note",
    title: doc.title,
    folder: courseCode,
    blob,
    mime: blob.type || "application/pdf",
    ext,
    meta: { source: "lecture_note", lecture_note_id: doc.id, course_code: courseCode },
    courseId,
    topicId: topicId ?? doc.topic_id ?? null,
  });
}

export const CourseAIPanel = ({ courseId, courseCode, topicId }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<{ docId: string; action: LibraryAIAction } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const abortRef = useRef<AbortController | null>(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["course-ai-docs", courseId, topicId],
    enabled: !!courseId,
    queryFn: async () => {
      let q = supabase
        .from("lecture_notes")
        .select("id, title, file_url, file_type, topic_id")
        .eq("course_id", courseId)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(40);
      if (topicId) q = q.eq("topic_id", topicId);
      const { data } = await q;
      return (data ?? []) as DocRow[];
    },
  });

  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ["course-ai-history", courseId, user?.id],
    enabled: !!courseId && !!user?.id,
    queryFn: () => listCourseAIGenerations(courseId),
    staleTime: 30_000,
  });

  const run = async (doc: DocRow, action: LibraryAIAction) => {
    if (!user?.id) return;
    const key = doc.id;
    setErrors((e) => ({ ...e, [key]: "" }));
    setBusy({ docId: doc.id, action });
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      // 1) Ensure we have a user_resources copy (idempotent-ish: always save fresh; cheap)
      const resource = await ingestLectureNote(doc, user.id, courseCode, courseId, topicId);
      // 2) Run AI scoped to this course/topic
      await runLibraryAI(resource, action, user.id, {
        signal: ac.signal,
        courseId,
        topicId: topicId ?? doc.topic_id ?? null,
      });
      toast.success(`${ACTION_META[action].label} ready in your Library`);
      qc.invalidateQueries({ queryKey: ["user-resources", user.id] });
      refetchHistory();
    } catch (e) {
      const msg = (e as any)?.name === "AbortError" ? "Cancelled" : (e instanceof Error ? e.message : "AI generation failed");
      setErrors((er) => ({ ...er, [key]: msg }));
      if (msg !== "Cancelled") toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const cancel = () => abortRef.current?.abort();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground p-6 text-center">Loading documents…</p>;
  }
  if (!docs.length) {
    return (
      <Card className="p-5 text-center">
        <Sparkles className="w-7 h-7 text-amber-500 mx-auto mb-2" />
        <h3 className="font-semibold">No documents yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Tutors haven't uploaded materials for this course yet. Once they do, you can generate AI study packs from each one here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {docs.map((d) => {
          const isBusy = busy?.docId === d.id;
          return (
            <Card key={d.id} className="p-3">
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug line-clamp-2">{d.title}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(Object.keys(ACTION_META) as LibraryAIAction[]).map((a) => {
                      const M = ACTION_META[a];
                      const Icon = M.icon;
                      const running = isBusy && busy?.action === a;
                      return (
                        <Button
                          key={a}
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs gap-1"
                          disabled={isBusy}
                          onClick={() => run(d, a)}
                        >
                          {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className={`w-3 h-3 ${M.tone}`} />}
                          {M.label}
                        </Button>
                      );
                    })}
                    {isBusy && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive" onClick={cancel}>
                        <X className="w-3 h-3 mr-1" /> Cancel
                      </Button>
                    )}
                  </div>
                  {errors[d.id] && errors[d.id] !== "Cancelled" && (
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-destructive">
                      <span className="truncate">{errors[d.id]}</span>
                      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[11px]" onClick={() => busy && run(d, busy.action)}>
                        <RefreshCw className="w-3 h-3 mr-1" /> Retry
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Course-scoped history */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold">Recent AI activity in {courseCode}</span>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => refetchHistory()} aria-label="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
        {history.length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> No AI generations scoped to this course yet.
          </p>
        ) : (
          <ul className="divide-y max-h-72 overflow-y-auto">
            {history.slice(0, 30).map((r: AIGenRow) => (
              <li key={r.id} className="px-3 py-2 flex items-center gap-2 text-sm">
                <StatusIcon s={r.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{r.resource_label || "Untitled"}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">{r.kind}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </p>
                </div>
                {r.status === "completed" && r.output_ref && r.kind === "quiz" && (
                  <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                    <Link to={`/ai-quiz/${r.output_ref}`}><ExternalLink className="w-3.5 h-3.5" /></Link>
                  </Button>
                )}
                {r.status === "completed" && r.output_ref && r.kind !== "quiz" && (
                  <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                    <Link to="/library"><ExternalLink className="w-3.5 h-3.5" /></Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default CourseAIPanel;