import { useMemo, useState } from "react";
import { useUserResources } from "@/hooks/useUserResources";
import { getResourceSignedUrl, KIND_META, type ResourceKind, type UserResource } from "@/lib/userResources";
import { useAuth } from "@/hooks/useAuth";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { SEO } from "@/components/seo/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Library, Search, Folder, Trash2, ExternalLink, Loader2, Image as ImageIcon, FileText, Headphones,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const ALL_KINDS: ResourceKind[] = ["pdf", "image", "note", "flashcard", "study_pack", "audio"];

const PreviewIcon = ({ kind }: { kind: ResourceKind }) => {
  if (kind === "image") return <ImageIcon className="w-6 h-6" />;
  if (kind === "audio") return <Headphones className="w-6 h-6" />;
  return <FileText className="w-6 h-6" />;
};

const Library = () => {
  const { primaryRole } = useAuth();
  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as
    "admin" | "tutor" | "student";

  const { data: resources = [], isLoading, remove } = useUserResources();
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [activeKinds, setActiveKinds] = useState<Set<ResourceKind>>(new Set());
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
    return resources.filter((r) => {
      if (activeFolder && r.folder !== activeFolder) return false;
      if (activeKinds.size && !activeKinds.has(r.kind)) return false;
      if (q && !r.title.toLowerCase().includes(q) && !r.folder.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [resources, search, activeFolder, activeKinds]);

  const toggleKind = (k: ResourceKind) => {
    setActiveKinds((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };

  const openPreview = async (r: UserResource) => {
    setPreviewing(r);
    setPreviewUrl(null);
    setPreviewLoading(true);
    const url = await getResourceSignedUrl(r.storage_path, 600);
    setPreviewUrl(url);
    setPreviewLoading(false);
    if (!url) toast.error("Could not open file");
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
          {/* Header */}
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Library className="w-6 h-6 text-primary" /> My Library
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your private collection — saved Study Packs, audio narrations, notes & PDFs.
            </p>
          </div>

          {/* Search + kind chips */}
          <div className="flex flex-col gap-3 mb-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your library…"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_KINDS.map((k) => {
                const on = activeKinds.has(k);
                return (
                  <button
                    key={k}
                    onClick={() => toggleKind(k)}
                    className={`text-xs px-3 h-7 rounded-full border transition-colors ${
                      on
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {KIND_META[k].emoji} {KIND_META[k].label}
                  </button>
                );
              })}
              {activeKinds.size > 0 && (
                <button
                  onClick={() => setActiveKinds(new Set())}
                  className="text-xs px-3 h-7 rounded-full text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
            {/* Folder sidebar */}
            <aside className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Folders</p>
              <button
                onClick={() => setActiveFolder(null)}
                className={`w-full flex items-center gap-2 px-3 h-9 rounded-lg text-sm transition-colors ${
                  activeFolder === null ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
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
                      activeFolder === f ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
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
                <Card className="p-10 text-center">
                  <Library className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="font-semibold">Your library is empty</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tap "Save to Library" inside any Study Pack or audio narration to keep it here.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.map((r) => (
                    <Card
                      key={r.id}
                      className="p-4 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group"
                      onClick={() => openPreview(r)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
                          <PreviewIcon kind={r.kind} />
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(r); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="font-semibold text-sm leading-tight line-clamp-2 mb-1">{r.title}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {KIND_META[r.kind].emoji} {r.kind.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          <Folder className="w-2.5 h-2.5 mr-1" />{r.folder}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {format(new Date(r.created_at), "MMM d, yyyy")}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

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
