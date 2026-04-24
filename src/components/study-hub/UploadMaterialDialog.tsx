import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  onUploaded: () => void;
}

const ACCEPTED = ".pdf,.docx,.doc,.pptx,.ppt,.txt,.md";
const MAX_BYTES = 20 * 1024 * 1024; // 20MB

export const UploadMaterialDialog = ({ open, onOpenChange, courseId, onUploaded }: Props) => {
  const { user, hasRole } = useAuth();
  const canPublish = hasRole("tutor") || hasRole("admin");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">(canPublish ? "public" : "private");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setTitle("");
      setDescription("");
      setVisibility(canPublish ? "public" : "private");
    }
  }, [open, canPublish]);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast.error("File too large (max 20MB)");
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ""));
  };

  const submit = async () => {
    if (!user || !file || !title.trim()) {
      toast.error("Pick a file and add a title");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const materialId = crypto.randomUUID();
      const path = `${user.id}/${materialId}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("study-materials")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { data: signed } = await supabase.storage
        .from("study-materials")
        .createSignedUrl(path, 60 * 60 * 24 * 365);

      const { error: insErr } = await supabase.from("study_materials").insert({
        id: materialId,
        course_id: courseId,
        owner_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        file_url: signed?.signedUrl ?? "",
        file_path: path,
        file_type: file.type || ext,
        file_size: file.size,
        visibility,
      });
      if (insErr) throw insErr;

      toast.success("Material uploaded");
      onUploaded();
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" /> Upload Study Material
          </DialogTitle>
          <DialogDescription>
            PDF, DOCX, PPTX, or text up to 20MB. AI will generate summaries on demand.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              type="file"
              accept={ACCEPTED}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-xs text-muted-foreground mt-1">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} />
          </div>

          <div>
            <Label htmlFor="desc">Description (optional)</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>

          <div>
            <Label>Visibility</Label>
            <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as "public" | "private")} className="mt-2">
              {canPublish && (
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="public" id="vpub" className="mt-1" />
                  <Label htmlFor="vpub" className="font-normal cursor-pointer">
                    <span className="font-medium">Public</span>
                    <p className="text-xs text-muted-foreground">All students in this course can view it.</p>
                  </Label>
                </div>
              )}
              <div className="flex items-start gap-2">
                <RadioGroupItem value="private" id="vpriv" className="mt-1" />
                <Label htmlFor="vpriv" className="font-normal cursor-pointer">
                  <span className="font-medium">Private</span>
                  <p className="text-xs text-muted-foreground">Only you can view it.</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={uploading || !file || !title.trim()}>
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : "Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
