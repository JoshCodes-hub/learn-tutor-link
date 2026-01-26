import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, ZoomIn } from "lucide-react";

interface ImageZoomModalProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
  alt?: string;
}

export const ImageZoomModal = ({ imageUrl, isOpen, onClose, alt = "Question image" }: ImageZoomModalProps) => {
  if (!imageUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 overflow-hidden bg-background/95 backdrop-blur-sm border-border">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors"
          aria-label="Close image"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center justify-center p-4 min-h-[300px]">
          <img
            src={imageUrl}
            alt={alt}
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface ClickableQuestionImageProps {
  imageUrl: string | null;
  onImageClick: () => void;
  className?: string;
}

export const ClickableQuestionImage = ({ imageUrl, onImageClick, className = "" }: ClickableQuestionImageProps) => {
  if (!imageUrl) return null;

  return (
    <div 
      className={`mb-6 rounded-lg border border-border overflow-hidden bg-muted/30 cursor-pointer group relative ${className}`}
      onClick={onImageClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onImageClick();
        }
      }}
      aria-label="Click to expand image"
    >
      <img 
        src={imageUrl} 
        alt="Question diagram"
        className="w-full max-h-64 object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.02]"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 rounded-full p-2 shadow-lg">
          <ZoomIn className="w-5 h-5 text-foreground" />
        </div>
      </div>
    </div>
  );
};
