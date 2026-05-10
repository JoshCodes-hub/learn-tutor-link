import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, Plus, Loader2, FileText, StickyNote, Sparkles, Link as LinkIcon,
  Trash2, Upload, ChevronRight,
} from "lucide-react";
import {
  useCurriculum, useCurriculumMutations, useTopics, useTopicMutations,
  useMaterials, useMaterialMutations, uploadTutorMaterialFile,
  type TutorTopic, type MaterialKind,
} from "@/hooks/useTutorCurricula";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const KIND_META: Record<MaterialKind, { label: string; icon: typeof FileText }> = {
  pdf: { label: "PDF", icon: FileText },
  note: { label: "Note", icon: StickyNote },
  flashcard_set: { label: "Flashcards", icon: Sparkles },
  link: { label: "Link", icon: LinkIcon },
};

export default function TutorCurriculumBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole, isLoading: authLoading } = useAuth();
  const { data: curriculum, isLoading } = useCurriculum(id);
  const { update, remove } = useCurriculumMutations();
  const { data: topics = [] } = useTopics(id);
  const tMut = useTopicMutations(id);
  const topicIds = useMemo(() => topics.map(t => t.id), [topics]);
  const { data: materials = [] } = useMaterials(topicIds);
  const mMut = useMaterialMutations(topicIds);

  const [showTopic, setShowTopic] = useState(false);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicSummary, setTopicSummary] = useState("");
  const [activeTopic, setActiveTopic] = useState<TutorTopic | null>(null);
  const [showAddMat, setShowAddMat] = useState<MaterialKind | null>(null);
  const [matTitle, setMatTitle] = useState("");
  const [matText, setMatText] = useState("");
  const [matUrl, setMatUrl] = useState("");
  const [matFile, setMatFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusyTopicId, setAiBusyTopicId] = useState<string | null>(null);

  if (!authLoading && (!user || !hasRole("tutor"))) { navigate("/auth"); return null; }
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!curriculum) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Curriculum not found</div>;

  const matsByTopic = (tid: string) => materials.filter(m => m.topic_id === tid);

  const addTopic = async () => {
    if (!topicTitle.trim()) return;
    await tMut.create.mutateAsync({
      title: topicTitle.trim(),
      summary: topicSummary.trim() || undefined,
      order_index: topics.length,
    });
    setTopicTitle(""); setTopicSummary(""); setShowTopic(false);
    toast.success("Topic added");
  };

  const submitMaterial = async () => {
    if (!activeTopic || !showAddMat) return;
    if (!matTitle.trim()) return toast.error("Title required");
    setBusy(true);
    try {
      let storage_path: string | null = null;
      let mime: string | null = null;
      let size: number | null = null;
      if (showAddMat === "pdf") {
        if (!matFile) return toast.error("Pick a file");
        const u = await uploadTutorMaterialFile({
          tutorId: user!.id, curriculumId: curriculum.id, topicId: activeTopic.id, file: matFile,
        });
        storage_path = u.path; mime = u.mime; size = u.size;
      }
      await mMut.create.mutateAsync({
        topic_id: activeTopic.id,
        kind: showAddMat,
        title: matTitle.trim(),
        storage_path,
        content_text: showAddMat === "note" ? matText : null,
        external_url: showAddMat === "link" ? matUrl.trim() : null,
        meta: mime ? { mime, size } : {},
        order_index: matsByTopic(activeTopic.id).length,
      } as never);
      toast.success("Material added");
      setShowAddMat(null); setMatTitle(""); setMatText(""); setMatUrl(""); setMatFile(null);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const generateFlashcards = async (topic: TutorTopic) => {
    const seed = matsByTopic(topic.id).find(m => m.kind === "note" && m.content_text);
    const sourceText = seed?.content_text || topic.summary || "";
    if (!sourceText || sourceText.trim().length < 30) {
      return toast.error("Add a Note material or topic summary (30+ chars) first.");
    }
    setAiBusyTopicId(topic.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-tutor-flashcards", {
        body: { content: sourceText, count: 12, topic_title: topic.title },
      });
      if (error) throw error;
      const cards = (data as { flashcards?: Array<{ question: string; answer: string }> })?.flashcards || [];
      if (cards.length === 0) return toast.error("AI returned no flashcards. Try a longer source.");
      await mMut.create.mutateAsync({
        topic_id: topic.id, kind: "flashcard_set",
        title: `AI Flashcards (${cards.length})`,
        storage_path: null, content_text: null, external_url: null,
        meta: { cards } as never,
        order_index: matsByTopic(topic.id).length,
      } as never);
      toast.success(`Generated ${cards.length} flashcards`);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || "AI generation failed";
      toast.error(msg);
    } finally { setAiBusyTopicId(null); }
  };

  return (
    <>
      <SEO title={`${curriculum.title} · Builder`} description="Curriculum builder" noindex url={`https://overraprep.com/tutor/curricula/${curriculum.id}`} />
      <div className="min-h-screen bg-background">
        <DashboardNav role="tutor" />
        <DashboardBreadcrumb role="tutor" />
        <main className="container mx-auto px-4 py-6 max-w-5xl">
          <Link to="/tutor/curricula" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to my curricula
          </Link>

          <div className="rounded-2xl border border-border bg-card p-5 mb-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <h1 className="font-display text-2xl font-bold text-foreground">{curriculum.title}</h1>
                {curriculum.description && <p className="text-sm text-muted-foreground mt-1">{curriculum.description}</p>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline" size="sm"
                  onClick={async () => {
                    const { findOrCreateContextThread } = await import("@/hooks/useChatThreads");
                    try {
                      const id = await findOrCreateContextThread({
                        userId: user!.id,
                        context_kind: "tutor_curriculum",
                        context_id: curriculum.id,
                        title: `${curriculum.title} · Discussion`,
                      });
                      navigate(`/chat/${id}`);
                    } catch (e: any) { toast.error(e.message); }
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-1.5" /> Open Discussion
                </Button>
                <Badge variant={curriculum.is_published ? "default" : "secondary"}>
                  {curriculum.is_published ? "Published" : "Draft"}
                </Badge>
                <Switch
                  checked={curriculum.is_published}
                  onCheckedChange={(v) => update.mutate({ id: curriculum.id, patch: { is_published: v } })}
                  aria-label="Publish"
                />
              </div>
            </div>
          </div>

          <Tabs defaultValue="topics">
            <TabsList>
              <TabsTrigger value="topics">Topics ({topics.length})</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="topics" className="space-y-4 mt-4">
              <div className="flex justify-end">
                <Button onClick={() => setShowTopic(true)}><Plus className="w-4 h-4 mr-1.5" /> Add Topic</Button>
              </div>

              {topics.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center bg-muted/20">
                  <p className="text-sm text-muted-foreground">No topics yet. Add your first topic to start uploading materials.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topics.map((t) => {
                    const ms = matsByTopic(t.id);
                    return (
                      <div key={t.id} className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground">{t.title}</h3>
                            {t.summary && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{t.summary}</p>}
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => {
                            if (confirm(`Delete topic "${t.title}"?`)) tMut.remove.mutate(t.id);
                          }}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>

                        {ms.length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {ms.map((m) => {
                              const Icon = KIND_META[m.kind].icon;
                              return (
                                <li key={m.id} className="flex items-center justify-between text-sm rounded-lg bg-muted/40 px-3 py-2">
                                  <span className="flex items-center gap-2 truncate">
                                    <Icon className="w-4 h-4 text-primary shrink-0" />
                                    <span className="truncate">{m.title}</span>
                                    <Badge variant="outline" className="text-[10px] ml-1">{KIND_META[m.kind].label}</Badge>
                                  </span>
                                  <Button variant="ghost" size="icon" onClick={() => mMut.remove.mutate({ id: m.id, storage_path: m.storage_path })}>
                                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                  </Button>
                                </li>
                              );
                            })}
                          </ul>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          {(["pdf", "note", "link"] as MaterialKind[]).map((k) => {
                            const Icon = KIND_META[k].icon;
                            return (
                              <Button key={k} variant="outline" size="sm" onClick={() => { setActiveTopic(t); setShowAddMat(k); }}>
                                <Icon className="w-3.5 h-3.5 mr-1.5" /> {KIND_META[k].label}
                              </Button>
                            );
                          })}
                          <Button
                            size="sm"
                            onClick={() => generateFlashcards(t)}
                            disabled={aiBusyTopicId === t.id}
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                          >
                            {aiBusyTopicId === t.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                            AI Flashcards
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="settings" className="mt-4 space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input
                    defaultValue={curriculum.title}
                    onBlur={(e) => e.target.value !== curriculum.title && update.mutate({ id: curriculum.id, patch: { title: e.target.value } })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    defaultValue={curriculum.description || ""}
                    rows={3}
                    onBlur={(e) => e.target.value !== (curriculum.description || "") && update.mutate({ id: curriculum.id, patch: { description: e.target.value } })}
                  />
                </div>
                <div className="pt-2 border-t border-border">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirm(`Delete "${curriculum.title}"? This removes all topics and materials.`)) {
                        remove.mutate(curriculum.id, { onSuccess: () => navigate("/tutor/curricula") });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" /> Delete Curriculum
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Add Topic dialog */}
      <Dialog open={showTopic} onOpenChange={setShowTopic}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Topic</DialogTitle>
            <DialogDescription>Group your materials under a topic.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Title *</Label><Input value={topicTitle} onChange={(e) => setTopicTitle(e.target.value)} placeholder="e.g. Newton's Laws" /></div>
            <div className="space-y-1.5"><Label>Summary</Label><Textarea value={topicSummary} onChange={(e) => setTopicSummary(e.target.value)} rows={3} placeholder="Short overview (used as AI seed if no notes attached)" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTopic(false)}>Cancel</Button>
            <Button onClick={addTopic} disabled={tMut.create.isPending}>
              {tMut.create.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Material dialog */}
      <Dialog open={!!showAddMat} onOpenChange={(o) => !o && setShowAddMat(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{showAddMat ? `Add ${KIND_META[showAddMat].label}` : ""}</DialogTitle>
            <DialogDescription>
              Attached to topic: <span className="font-medium text-foreground">{activeTopic?.title}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Title *</Label><Input value={matTitle} onChange={(e) => setMatTitle(e.target.value)} placeholder="Material title" /></div>
            {showAddMat === "pdf" && (
              <div className="space-y-1.5">
                <Label>File *</Label>
                <Input type="file" accept="application/pdf,image/*,.docx,.pptx" onChange={(e) => setMatFile(e.target.files?.[0] || null)} />
              </div>
            )}
            {showAddMat === "note" && (
              <div className="space-y-1.5">
                <Label>Content</Label>
                <Textarea value={matText} onChange={(e) => setMatText(e.target.value)} rows={6} placeholder="Paste or write notes here..." />
              </div>
            )}
            {showAddMat === "link" && (
              <div className="space-y-1.5">
                <Label>URL *</Label>
                <Input value={matUrl} onChange={(e) => setMatUrl(e.target.value)} placeholder="https://..." />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMat(null)}>Cancel</Button>
            <Button onClick={submitMaterial} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
