import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2 } from "lucide-react";

interface CoverCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  /** Aspect ratio (width / height). Default 4 (banner). */
  aspect?: number;
  /** Output width in px. */
  outputWidth?: number;
  /** Called with the cropped image as a JPEG Blob. */
  onCropped: (blob: Blob) => Promise<void> | void;
  saving?: boolean;
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.crossOrigin = "anonymous";
    image.src = url;
  });

async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area,
  outputWidth: number,
  aspect: number,
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");

  const outputHeight = Math.round(outputWidth / aspect);
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))),
      "image/jpeg",
      0.92,
    );
  });
}

export const CoverCropDialog = ({
  open,
  onOpenChange,
  imageSrc,
  aspect = 4,
  outputWidth = 1600,
  onCropped,
  saving = false,
}: CoverCropDialogProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, areaPx: Area) => {
    setCroppedAreaPixels(areaPx);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, outputWidth, aspect);
    await onCropped(blob);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adjust your cover photo</DialogTitle>
          <DialogDescription>
            Drag to position. Use the slider to zoom. Your image will be saved as a wide banner.
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full h-72 bg-muted/50 rounded-xl overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="horizontal-cover"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="zoom-slider" className="text-xs text-muted-foreground">
            Zoom
          </Label>
          <Slider
            id="zoom-slider"
            min={1}
            max={3}
            step={0.05}
            value={[zoom]}
            onValueChange={(v) => setZoom(v[0])}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !croppedAreaPixels}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving cover…
              </>
            ) : (
              "Save cover"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CoverCropDialog;
