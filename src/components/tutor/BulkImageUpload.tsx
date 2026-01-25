import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Upload, X, Image, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { uploadQuestionImage } from "./QuestionImageUpload";

interface UploadedImage {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  url?: string;
  error?: string;
}

interface BulkImageUploadProps {
  onImagesUploaded: (urls: string[]) => void;
  onClose: () => void;
}

export function BulkImageUpload({ onImagesUploaded, onClose }: BulkImageUploadProps) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(file => {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: Invalid file type`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: File too large (max 10MB)`);
        return false;
      }
      return true;
    });

    const newImages: UploadedImage[] = validFiles.map(file => ({
      file,
      status: "pending"
    }));

    setImages(prev => [...prev, ...newImages]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAllImages = async () => {
    if (images.length === 0) return;

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      if (image.status === "success") {
        if (image.url) uploadedUrls.push(image.url);
        continue;
      }

      setImages(prev => prev.map((img, idx) => 
        idx === i ? { ...img, status: "uploading" as const } : img
      ));

      try {
        const url = await uploadQuestionImage(image.file);
        uploadedUrls.push(url);
        setImages(prev => prev.map((img, idx) => 
          idx === i ? { ...img, status: "success" as const, url } : img
        ));
      } catch (error: any) {
        setImages(prev => prev.map((img, idx) => 
          idx === i ? { ...img, status: "error" as const, error: error.message } : img
        ));
      }
    }

    setIsUploading(false);
    
    if (uploadedUrls.length > 0) {
      toast.success(`${uploadedUrls.length} images uploaded & optimized!`);
      onImagesUploaded(uploadedUrls);
    }
  };

  const successCount = images.filter(img => img.status === "success").length;
  const errorCount = images.filter(img => img.status === "error").length;
  const progress = images.length > 0 ? (successCount / images.length) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Bulk Image Upload</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Drop Zone */}
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging 
            ? "border-primary bg-primary/5 scale-[1.02]" 
            : "border-border hover:border-primary/50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleInputChange}
          className="hidden"
          id="bulk-image-upload"
        />
        <label htmlFor="bulk-image-upload" className="cursor-pointer flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-medium">
              {isDragging ? "Drop images here" : "Drag & drop multiple images"}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to select files • Auto-compressed to WebP
            </p>
          </div>
        </label>
      </div>

      {/* Image List */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>{images.length} images selected</span>
            {successCount > 0 && (
              <span className="text-success">{successCount} uploaded</span>
            )}
          </div>

          {isUploading && (
            <Progress value={progress} className="h-2" />
          )}

          <ScrollArea className="h-48 rounded-lg border">
            <div className="p-3 space-y-2">
              {images.map((image, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                    <img 
                      src={URL.createObjectURL(image.file)} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{image.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(image.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {image.status === "pending" && (
                      <Image className="h-4 w-4 text-muted-foreground" />
                    )}
                    {image.status === "uploading" && (
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    )}
                    {image.status === "success" && (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                    {image.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    {image.status !== "uploading" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {errorCount > 0 && (
            <p className="text-sm text-destructive">
              {errorCount} image(s) failed to upload
            </p>
          )}

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={uploadAllImages}
              disabled={isUploading || images.length === 0}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload All ({images.length})
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
