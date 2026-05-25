import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useUserResources } from "@/hooks/useUserResources";
import { getResourceSignedUrl, KIND_META, type ResourceKind, type UserResource } from "@/lib/userResources";
import { useAuth } from "@/hooks/useAuth";
import { useStudentScope } from "@/hooks/useStudentScope";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { SEO } from "@/components/seo/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Library as LibraryIcon, Search, Folder, Trash2, ExternalLink, Loader2,
  Image as ImageIcon, FileText, Headphones, Upload, BarChart3,
  CloudDownload, History, GraduationCap, MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import UploadResourceDialog from "@/components/student/library/UploadResourceDialog";
import OutlineActionsMenu from "@/components/student/library/OutlineActionsMenu";
import FlashcardStudyDialog, { type Flashcard } from "@/components/student/library/FlashcardStudyDialog";
import { listCachedMaterialIds } from "@/lib/offlineLibraryCache";
import { PageHeader, LevelChip } from "@/components/shell/PageHeader";
import { FilterRail, type FilterChip } from "@/components/shell/FilterRail";
import { EmptyState } from "@/components/shell/EmptyState";

const KIND_FILTERS: { id: string; label: string; kinds: ResourceKind[]; emoji: string }[] = [
  { id: "all", label: "All", kinds: [], emoji: "✨" },
  { id: "pdf", label: "PDFs", kinds: ["pdf"], emoji: "📄" },
  { id: "note", label: "Notes", kinds: ["note"], emoji: "📝" },
  { id: "audio", label: "Audio", kinds: ["audio"], emoji: "🎧" },
  { id: "flashcard", label: "Flashcards", kinds: ["flashcard"], emoji: "🃏" },
  { id: "image", label: "Images", kinds: ["image"], emoji: "🖼️" },
  { id: "study_pack", label: "AI Packs", kinds: ["study_pack"], emoji: "✨" },
];

const PreviewIcon = ({ kind }: { kind: ResourceKind }) => {
  if (kind === "image") return <ImageIcon className="w-6 h-6" />;
  if (kind === "audio") return <Headphones className="w-6 h-6" />;
  return <FileText className="w-6 h-6" />;
};

const Library = () => {
  const { primaryRole } = useAuth();
  const { level: studentLevel, label: scopeLabel, hasScope } = useStudentScope();
  const [searchParams, setSearchParams] = useSearchParams();
  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as
    "admin" | "tutor" | "student";

  const { data: resources = [], isLoading, remove } = useUserResources();
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [activeKindFilter, setActiveKindFilter] = useState<string>("all");
  const [outlinesOnly, setOutlinesOnly] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    listCachedMaterialIds().then((ids) => setCachedIds(new Set(ids))).catch(() => {});
  }, []);

  useEffect(() => {
    if (searchParams.get("upload") === "1") {
      setUploadOpen(true);
      // Clean the URL so refresh / back doesn't reopen forever
      const next = new URLSearchParams(searchParams);
      next.delete("upload");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [studyCards, setStudyCards] = useState<Flashcard[] | null>(null);
  const [studyTitle, setStudyTitle] = useState("");
  const [previewing, setPreviewing] = useState<UserResource | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const folders = useMemo(() => {
    const s = new Set<string>();
    resources.forEach((r) => s.add(r.folder || "General"));
    return Array.from(s).sort();
  }, [resources]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const active = KIND_FILTERS.find((k) => k.id === activeKindFilter);
    const kinds = active?.kinds ?? [];
    return resources.filter((r) => {
      if (activeFolder && r.folder !== activeFolder) return false;
      if (kinds.length && !kinds.includes(r.kind)) return false;
      if (outlinesOnly && (r.meta as any)?.material_type !== "outline") return false;
      if (q && !r.title.toLowerCase().includes(q) && !r.folder.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [resources, search, activeFolder, activeKindFilter, outlinesOnly]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: resources.length };
    KIND_FILTERS.forEach((kf) => {
      if (kf.kinds.length) c[kf.id] = resources.filter((r) => kf.kinds.includes(r.kind)).length;
    });
    return c;
  }, [resources]);

  const chips: FilterChip[] = KIND_FILTERS.map((k) => ({
    id: k.id,
    label: (
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden>{k.emoji}</span> {k.label}
      </span>
    ),
    count: counts[k.id] ?? 0,
  }));

  const openPreview = async (r: UserResource) => {
    setPreviewing(r);
    setPreviewUrl(null);
    setPreviewLoading(true);
    const url = await getResourceSignedUrl(r.storage_path, 600);
    setPreviewUrl(url);
    setPreviewLoading(false);
    if (!url) toast.error("Could not open file");
    // If this is a saved flashcard JSON, parse and open the study dialog
    if (r.kind === "flashcard" && url) {
      try {
        const json = await (await fetch(url)).json();
        if (Array.isArray(json?.cards) && json.cards.length) {
          setStudyTitle(r.title);
          setStudyCards(json.cards);
          setPreviewing(null);
        }
      } catch { /* fall through to default preview */ }
    }
  };

  const closePreview = () => {
    setPreviewing(null);
    setPreviewUrl(null);
  };

  const handleDelete = async (r: UserResource) => {
    if (!confirm(`Delete "${r.title}" from your Library?`)) return;
    try {
      await remove.mutateAsync(r);
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <>
      <SEO title="My Library" description="Your private study resources — PDFs, notes, audio, flashcards." url="https://overraprep.com/library" />
      <div className="min-h-screen bg-background pb-24">
        <DashboardNav role={navRole} />
        <DashboardBreadcrumb role={navRole} />

        <main className="container mx-auto px-4 py-6 max-w-6xl">
          <PageHeader
            eyebrow={
              scopeLabel ? (
                <LevelChip label={`Library · ${scopeLabel}`} />
              ) : (
                <Link to="/profile/edit" className="inline-flex items-center gap-1 text-xs text-amber-700 underline">
                  <GraduationCap className="w-3.5 h-3.5" /> Set your level
                </Link>
              )
            }
            title="My Library"
            subtitle="Upload outlines, lecture notes, audio and past questions — then turn them into flashcards, summaries and quizzes with AI."
            actions={
              <>
                <Button asChild variant="outline" size="icon" title="Upload analytics">
                  <Link to="/library/analytics"><BarChart3 className="w-4 h-4" /></Link>
                </Button>
                <Button asChild variant="outline" size="icon" title="Offline downloads">
                  <Link to="/library/offline-downloads"><CloudDownload className="w-4 h-4" /></Link>
                </Button>
                <Button asChild variant="outline" size="icon" title="AI history">
                  <Link to="/ai-history"><History className="w-4 h-4" /></Link>
                </Button>
                <Button
                  onClick={() => setUploadOpen(true)}
                  className="gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md"
                >
                  <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Upload</span>
                </Button>
              </>
            }
          />

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your library…"
              className="pl-9 bg-white/80 backdrop-blur"
            />
          </div>

          <FilterRail
            chips={chips}
            active={activeKindFilter}
            onChange={setActiveKindFilter}
            trailing={
              <button
                onClick={() => setOutlinesOnly((v) => !v)}
                className={`shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-full border text-xs font-semibold transition-all ${
                  outlinesOnly
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-background text-foreground border-border hover:border-amber-400"
                }`}
              >
                📑 Outlines only
              </button>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
            {/* Folder sidebar */}
            <aside className="space-y-1 md:sticky md:top-[140px] md:self-start">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2 px-1">
                Folders
              </p>
              <button
                onClick={() => setActiveFolder(null)}
                className={`w-full flex items-center gap-2 px-3 h-9 rounded-lg text-sm transition-colors ${
                  activeFolder === null ? "bg-amber-500/10 text-amber-700 font-semibold border border-amber-300/60" : "hover:bg-muted border border-transparent"
                }`}
              >
                <Folder className="w-4 h-4" /> All
                <span className="ml-auto text-xs text-muted-foreground">{resources.length}</span>
              </button>
              {folders.map((f) => {
                const count = resources.filter((r) => r.folder === f).length;
                return (
                  <button
                    key={f}
                    onClick={() => setActiveFolder(f)}
                    className={`w-full flex items-center gap-2 px-3 h-9 rounded-lg text-sm transition-colors ${
                      activeFolder === f ? "bg-amber-500/10 text-amber-700 font-semibold border border-amber-300/60" : "hover:bg-muted border border-transparent"
                    }`}
                  >
                    <Folder className="w-4 h-4" /> <span className="truncate">{f}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{count}</span>
                  </button>
                );
              })}
            </aside>

            {/* Grid */}
            <section>
              {isLoading ? (
                <div className="grid place-items-center py-16 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={<LibraryIcon className="w-6 h-6" />}
                  title={resources.length === 0 ? "Your library is empty" : "Nothing matches this filter"}
                  description={
                    resources.length === 0
                      ? "Upload your course outlines, lecture notes or past questions to get started."
                      : "Try clearing filters or switching folders."
                  }
                  action={
                    resources.length === 0 ? (
                      <Button
                        onClick={() => setUploadOpen(true)}
                        className="gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                      >
                        <Upload className="w-4 h-4" /> Upload your first file
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => { setActiveKindFilter("all"); setOutlinesOnly(false); setActiveFolder(null); }}>
                        Clear filters
                      </Button>
                    )
                  }
                />
              ) : (
                <div className="space-y-2">
                  {filtered.map((r) => {
                    const isOutline = (r.meta as any)?.material_type === "outline";
                    const matId = (r.meta as any)?.material_id as string | undefined;
                    const isOffline = !!matId && cachedIds.has(matId);
                    return (
                    <button
                      key={r.id}
                      onClick={() => openPreview(r)}
                      className={`w-full text-left flex items-center gap-3 p-3 pr-2 rounded-xl border bg-white hover:shadow-sm transition-all group ${
                        isOutline
                          ? "border-amber-300/80 bg-gradient-to-r from-amber-50/60 to-white"
                          : "border-border hover:border-amber-300"
                      }`}
                    >
                      <div
                        className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${
                          isOutline ? "bg-amber-500/15 text-amber-700" : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        <PreviewIcon kind={r.kind} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isOutline && (
                            <Badge className="text-[10px] h-4 px-1.5 bg-amber-500 hover:bg-amber-500 text-white">Outline</Badge>
                          )}
                          {isOffline && (
                            <Badge className="text-[10px] h-4 px-1.5 bg-emerald-500 hover:bg-emerald-500 text-white gap-0.5">
                              <CloudDownload className="w-2.5 h-2.5" /> Offline
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 capitalize">
                            {KIND_META[r.kind].emoji} {r.kind.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="font-semibold text-sm leading-snug line-clamp-1 mt-1">{r.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          <Folder className="w-3 h-3" /> {r.folder}
                          <span aria-hidden>·</span>
                          {format(new Date(r.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {(r.kind === "pdf" || r.kind === "note" || r.kind === "study_pack" || isOutline) && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <OutlineActionsMenu resource={r} />
                          </div>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(r); }}
                          className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-2 rounded-md hover:bg-destructive/10 text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      <UploadResourceDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        existingFolders={folders}
      />

      <FlashcardStudyDialog
        open={!!studyCards}
        onOpenChange={(o) => { if (!o) setStudyCards(null); }}
        cards={studyCards || []}
        title={studyTitle}
      />

      {/* Preview dialog */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && closePreview()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewing && <PreviewIcon kind={previewing.kind} />}
              <span className="truncate">{previewing?.title}</span>
            </DialogTitle>
          </DialogHeader>
          {previewLoading && (
            <div className="grid place-items-center py-10 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
          {previewing && previewUrl && (
            <div className="space-y-3">
              {previewing.kind === "image" ? (
                <img src={previewUrl} alt={previewing.title} className="w-full max-h-[70vh] object-contain rounded-lg" />
              ) : previewing.kind === "audio" ? (
                <audio src={previewUrl} controls className="w-full" />
              ) : previewing.kind === "pdf" ? (
                <iframe src={previewUrl} className="w-full h-[70vh] rounded-lg border border-border" title={previewing.title} />
              ) : previewing.mime?.startsWith("text/") ? (
                <TextPreview url={previewUrl} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-3">In-app preview not available for this file type.</p>
                  <Button variant="outline" asChild>
                    <a href={previewUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-4 h-4 mr-1.5" /> Open in new tab
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

const TextPreview = ({ url }: { url: string }) => {
  const [text, setText] = useState<string | null>(null);
  useMemo(() => {
    fetch(url).then((r) => r.text()).then(setText).catch(() => setText("(unable to load)"));
  }, [url]);
  return (
    <pre className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/30 p-4 rounded-lg max-h-[70vh] overflow-y-auto">
      {text ?? "Loading…"}
    </pre>
  );
};

export default Library;
