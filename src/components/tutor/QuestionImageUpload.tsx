import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Image, Link, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import imageCompression from "browser-image-compression";

interface QuestionImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  questionId?: string;
}

// Compression options for optimal file size
const compressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

export async function compressImage(file: File): Promise<File> {
  try {
    const compressedFile = await imageCompression(file, compressionOptions);
    console.log(`Compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`);
    return compressedFile;
  } catch (error) {
    console.error("Compression failed, using original:", error);
    return file;
  }
}

export async function uploadQuestionImage(file: File): Promise<string> {
  // Compress the image first
  const compressedFile = await compressImage(file);
  
  // Generate unique filename
  const fileExt = "webp";
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `questions/${fileName}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("question-images")
    .upload(filePath, compressedFile);

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("question-images")
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

export function QuestionImageUpload({ value, onChange, questionId }: QuestionImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(value || "");
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a valid image (JPEG, PNG, GIF, or WebP)");
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size must be less than 10MB");
      return;
    }

    setUploading(true);

    try {
      const publicUrl = await uploadQuestionImage(file);
      onChange(publicUrl);
      toast.success("Image uploaded & optimized!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await handleFileUpload(file);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) await handleFileUpload(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      toast.success("Image URL added");
    }
  };

  const handleRemoveImage = () => {
    onChange("");
    setUrlInput("");
  };

  return (
    <div className="space-y-3">
      <Label>Question Image (Optional)</Label>
      
      {value ? (
        <div className="relative rounded-lg border border-border overflow-hidden">
          <img
            src={value}
            alt="Question diagram"
            className="w-full max-h-48 object-contain bg-muted"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemoveImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-2">
              <Link className="h-4 w-4" />
              URL
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-3">
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragging 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Input
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                disabled={uploading}
                className="hidden"
                id="question-image-upload"
              />
              <label
                htmlFor="question-image-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                    <span className="text-sm text-muted-foreground">Compressing & uploading...</span>
                  </>
                ) : (
                  <>
                    <Image className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {isDragging ? "Drop image here" : "Click or drag image to upload"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Auto-compressed to WebP (max 1MB)
                    </span>
                  </>
                )}
              </label>
            </div>
          </TabsContent>
          
          <TabsContent value="url" className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://example.com/image.png"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <Button type="button" onClick={handleUrlSubmit} disabled={!urlInput.trim()}>
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter a direct URL to an image (for diagrams, charts, etc.)
            </p>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
