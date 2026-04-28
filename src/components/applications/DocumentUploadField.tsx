import { useRef, useState } from "react";
import { Upload, FileText, CheckCircle2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { uploadApplicationFile, validateFile, MAX_DOC_BYTES, MAX_IMAGE_BYTES } from "@/lib/applicationUploads";

interface Props {
  userId: string;
  kind: string;            // e.g. "gov-id", "certificate"
  label: string;
  description?: string;
  required?: boolean;
  accept?: "image" | "doc"; // doc = pdf|image
  value: string | null;
  onChange: (url: string | null) => void;
}

export default function DocumentUploadField({
  userId,
  kind,
  label,
  description,
  required,
  accept = "doc",
  value,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    const maxBytes = accept === "image" ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;
    const err = validateFile(file, { accept, maxBytes });
    if (err) return toast.error(err);

    setUploading(true);
    const url = await uploadApplicationFile(userId, file, kind);
    setUploading(false);
    if (!url) return toast.error("Upload failed. Try again.");
    onChange(url);
    toast.success(`${label} uploaded`);
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {description && <p className="text-xs text-muted-foreground -mt-1">{description}</p>}

      {value ? (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-success/30 bg-success/5">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="flex-1 text-sm text-foreground truncate underline-offset-2 hover:underline"
          >
            {accept === "image" ? "Image uploaded" : "Document uploaded"} — view
          </a>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-destructive p-1"
            aria-label="Remove"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : accept === "image" ? (
            <Upload className="w-5 h-5 text-muted-foreground" />
          ) : (
            <FileText className="w-5 h-5 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            {uploading ? "Uploading…" : `Click to upload ${accept === "image" ? "image" : "PDF or image"}`}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept === "image" ? "image/*" : "image/*,application/pdf"}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
