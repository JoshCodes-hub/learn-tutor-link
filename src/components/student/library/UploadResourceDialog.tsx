import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Loader2, FileText, Image as ImageIcon, Headphones, File as FileIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { saveResource } from "@/lib/userResources";
import { kindFromFile } from "@/lib/extractText";

const MATERIAL_TYPES = [
  { value: "outline",  label: "📑 Course Outline" },
  { value: "notes",    label: "📝 Lecture Notes" },
  { value: "past_q",   label: "📚 Past Questions" },
  { value: "slides",   label: "🎞️ Slides" },
  { value: "other",    label: "📁 Other" },
] as const;

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

  const [files, setFiles] = useState<File[]>([]);
  const [materialType, setMaterialType] = useState<string>("outline");
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
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const ext = (f.name.split(".").pop() || "bin").toLowerCase();
        const title = f.name.replace(/\.[^.]+$/, "");
        await saveResource({
          userId: user.id,
          kind: kindFromFile(f),
          title,
          folder: folder.trim() || "General",
          blob: f,
          mime: f.type || "application/octet-stream",
          ext,
          meta: { material_type: materialType, original_name: f.name },
        });
        okCount++;
      } catch (e) {
        console.error(e);
        toast.error(`Failed: ${f.name}`);
      }
      setProgress({ done: i + 1, total: files.length });
    }
    setUploading(false);
    if (okCount > 0) {
      toast.success(`${okCount} file${okCount > 1 ? "s" : ""} added to your Library`);
      qc.invalidateQueries({ queryKey: ["user-resources", user.id] });
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!uploading) { onOpenChange(o); if (!o) reset(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" /> Upload to My Library
          </DialogTitle>
        </DialogHeader>

        {/* Drop zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-colors"
        >
          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Tap to choose files or drag & drop</p>
          <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, MD, images, audio · max 20 MB each</p>
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
            <Label className="text-xs">Material type</Label>
            <Select value={materialType} onValueChange={setMaterialType} disabled={uploading}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MATERIAL_TYPES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Course / Folder</Label>
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