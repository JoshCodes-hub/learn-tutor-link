import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Loader2, FileText, Image as ImageIcon, Headphones, File as FileIcon, Info, Sparkles, Layers, Brain, BookOpen } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { saveResource } from "@/lib/userResources";
import { kindFromFile } from "@/lib/extractText";
import { track } from "@/lib/analytics";
import { runLibraryAI, suggestedActionForMaterial } from "@/lib/libraryAI";

type MaterialType = "outline" | "notes" | "past_q" | "slides" | "other";

const MATERIAL_TYPES: {
  value: MaterialType; label: string; hint: string; suggestion: string; icon: typeof Layers;
}[] = [
  {
    value: "outline",
    label: "📑 Course Outline",
    hint: "The syllabus or topic list for a course (best for AI study aids).",
    suggestion: "We'll suggest generating Flashcards from each topic.",
    icon: Layers,
  },
  {
    value: "notes",
    label: "📝 Lecture Notes",
    hint: "Class notes, handouts, or your own written summaries.",
    suggestion: "We'll suggest generating a Summary you can revise from.",
    icon: BookOpen,
  },
  {
    value: "past_q",
    label: "📚 Past Questions",
    hint: "Previous exam papers or test questions.",
    suggestion: "We'll suggest generating a Practice Quiz to test yourself.",
    icon: Brain,
  },
  { value: "slides", label: "🎞️ Slides", hint: "Lecture slide decks (PDF / PPT exported as PDF).", suggestion: "Great for Flashcards or a quick Summary.", icon: Layers },
  { value: "other",  label: "📁 Other",  hint: "Anything else you want kept in your library.", suggestion: "Saved for safekeeping — AI tools still work on text files.", icon: FileIcon },
];

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existingFolders: string[];
}

const fileIcon = (f: File) => {
  if (f.type.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
  if (f.type.startsWith("audio/")) return <Headphones className="w-4 h-4" />;
  if (f.type === "application/pdf") return <FileText className="w-4 h-4" />;
  return <FileIcon className="w-4 h-4" />;
};

export const UploadResourceDialog = ({ open, onOpenChange, existingFolders }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  // Analytics: count how often the dialog is opened
  useEffect(() => {
    if (open) void track("upload_dialog_opened", {});
  }, [open]);

  const [files, setFiles] = useState<File[]>([]);
  const [materialType, setMaterialType] = useState<MaterialType>("outline");
  const activeType = MATERIAL_TYPES.find((m) => m.value === materialType)!;
  const [folder, setFolder] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const reset = () => {
    setFiles([]);
    setMaterialType("outline");
    setFolder("");
    setProgress(null);
  };

  const addFiles = (list: FileList | File[] | null) => {
    if (!list) return;
    const arr = Array.from(list);
    const valid: File[] = [];
    for (const f of arr) {
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name} is over 20 MB and was skipped.`);
        continue;
      }
      valid.push(f);
    }
    setFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (!user?.id) { toast.error("Please sign in first"); return; }
    if (!files.length) { toast.error("Choose at least one file"); return; }
    setUploading(true);
    setProgress({ done: 0, total: files.length });
    let okCount = 0;
    const savedResources: Awaited<ReturnType<typeof saveResource>>[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const ext = (f.name.split(".").pop() || "bin").toLowerCase();
        const title = f.name.replace(/\.[^.]+$/, "");
        const saved = await saveResource({
          userId: user.id,
          kind: kindFromFile(f),
          title,
          folder: folder.trim() || "General",
          blob: f,
          mime: f.type || "application/octet-stream",
          ext,
          meta: { material_type: materialType, original_name: f.name },
        });
        savedResources.push(saved);
        okCount++;
        void track("upload_completed", {
          material_type: materialType,
          mime: f.type || ext,
          size_bytes: f.size,
          folder: folder.trim() || "General",
        });
      } catch (e) {
        console.error(e);
        toast.error(`Failed: ${f.name}`);
        void track("upload_failed", {
          material_type: materialType,
          reason: e instanceof Error ? e.message : "unknown",
        });
      }
      setProgress({ done: i + 1, total: files.length });
    }
    setUploading(false);
    if (okCount > 0) {
      toast.success(`${okCount} file${okCount > 1 ? "s" : ""} added to your Library`);
      qc.invalidateQueries({ queryKey: ["user-resources", user.id] });
      reset();
      onOpenChange(false);

      // Auto-generate AI study aids based on selected template — fire-and-forget
      // so the dialog closes immediately and the user can keep working.
      const action = suggestedActionForMaterial(materialType);
      if (action) {
        const aiCandidates = savedResources.filter(
          (r) => r.kind === "pdf" || r.kind === "note",
        );
        if (aiCandidates.length) {
          void track("auto_generate_started", {
            action,
            material_type: materialType,
            count: aiCandidates.length,
          });
          const label =
            action === "flashcards" ? "flashcards"
            : action === "summary"   ? "summary"
            :                          "practice quiz";
          toast.loading(`Auto-generating ${label}…`, { id: "auto-ai" });
          (async () => {
            let ok = 0;
            for (const r of aiCandidates) {
              try {
                await runLibraryAI(r, action, user.id);
                ok++;
              } catch (err) {
                console.error("auto AI failed", err);
                void track("auto_generate_failed", {
                  action,
                  reason: err instanceof Error ? err.message : "unknown",
                });
              }
            }
            toast.dismiss("auto-ai");
            qc.invalidateQueries({ queryKey: ["user-resources", user.id] });
            if (ok > 0) {
              toast.success(`${label.charAt(0).toUpperCase() + label.slice(1)} ready in your Library ✨`);
              void track("auto_generate_completed", { action, ok_count: ok });
            }
          })();
        }
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!uploading) { onOpenChange(o); if (!o) reset(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" /> Upload to My Library
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Save your study materials and turn them into AI flashcards, summaries & quizzes.
          </p>
        </DialogHeader>

        <TooltipProvider delayDuration={150}>
        {/* Drop zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-colors"
        >
          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Tap to choose files or drag & drop</p>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-semibold text-foreground/80">Supported:</span> PDF · DOCX · TXT · MD · images (JPG/PNG) · audio (MP3/WAV)
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Max 20 MB per file · multiple files supported</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.docx,.txt,.md,image/*,audio/*"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {/* File chips */}
        {files.length > 0 && (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm">
                {fileIcon(f)}
                <span className="truncate flex-1">{f.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                <button
                  onClick={() => removeFile(i)}
                  disabled={uploading}
                  className="p-1 rounded hover:bg-destructive/10 text-destructive disabled:opacity-50"
                  aria-label="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Material type + folder */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              Material type
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label="What is this?" className="text-muted-foreground hover:text-foreground">
                    <Info className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] text-xs">
                  Pick <b>Course Outline</b> for syllabi (gets a gold accent + AI flashcards shortcut),
                  <b> Lecture Notes</b> for handouts, or <b>Past Questions</b> for previous exam papers.
                </TooltipContent>
              </Tooltip>
            </Label>
            <Select value={materialType} onValueChange={(v) => setMaterialType(v as MaterialType)} disabled={uploading}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MATERIAL_TYPES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <div className="flex flex-col">
                      <span>{m.label}</span>
                      <span className="text-[10px] text-muted-foreground">{m.hint}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              Course / Folder
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label="Folder help" className="text-muted-foreground hover:text-foreground">
                    <Info className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-xs">
                  Group items by course code (e.g. <b>CSC 201</b>) so they show up together in your sidebar.
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="e.g. CSC 201"
              list="library-folders"
              disabled={uploading}
              className="h-10"
            />
            <datalist id="library-folders">
              {existingFolders.map((f) => <option key={f} value={f} />)}
            </datalist>
          </div>
        </div>

        {/* Smart suggestion based on selected material type */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 flex items-start gap-2.5">
          <div className="h-7 w-7 shrink-0 rounded-lg bg-amber-100 grid place-items-center">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
          </div>
          <div className="text-xs leading-relaxed">
            <p className="font-semibold text-amber-900">
              Recommended after upload
            </p>
            <p className="text-amber-900/80 mt-0.5">{activeType.suggestion}</p>
            <p className="text-[11px] text-amber-900/70 mt-1">
              Tip: tap the <b>✨ AI</b> button on any card in your Library to generate flashcards, summaries or quizzes.
            </p>
          </div>
        </div>
        </TooltipProvider>

        {progress && (
          <p className="text-xs text-muted-foreground text-center">
            Uploading {progress.done}/{progress.total}…
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={uploading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={uploading || !files.length}>
            {uploading ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4 mr-1.5" /> Upload {files.length || ""}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadResourceDialog;