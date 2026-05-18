import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CloudDownload, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import {
  cacheMaterialFromUrl, getCachedMaterial, removeCachedMaterial,
} from "@/lib/offlineLibraryCache";
import { toast } from "sonner";

interface Props {
  materialId: string;
  title: string;
  url: string;
  courseId: string;
  courseCode?: string;
  onChange?: () => void;
}

export const CourseOfflineButton = ({ materialId, title, url, courseId, courseCode, onChange }: Props) => {
  const [cached, setCached] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    getCachedMaterial(materialId).then((c) => { if (alive) setCached(!!c); }).catch(() => setCached(false));
    return () => { alive = false; };
  }, [materialId]);

  const download = async () => {
    setBusy(true); setProgress(0);
    try {
      await cacheMaterialFromUrl({
        id: materialId, title, url, course_id: courseId, course_code: courseCode,
        onProgress: (l, t) => setProgress(t ? Math.round((l / t) * 100) : null),
      });
      setCached(true);
      toast.success("Saved for offline use");
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message || "Could not download for offline");
    } finally {
      setBusy(false); setProgress(null);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await removeCachedMaterial(materialId);
      setCached(false);
      toast.success("Removed from offline storage");
      onChange?.();
    } finally {
      setBusy(false);
    }
  };

  if (cached === null) {
    return (
      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled>
        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> …
      </Button>
    );
  }

  if (busy && progress !== null) {
    return (
      <div className="flex items-center gap-1.5 min-w-[110px]">
        <Progress value={progress} className="h-1.5 flex-1" />
        <span className="text-[10px] text-muted-foreground tabular-nums">{progress}%</span>
      </div>
    );
  }

  if (cached) {
    return (
      <Button size="sm" variant="outline" onClick={remove} disabled={busy} className="h-7 px-2 text-xs border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
        {busy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
        Offline
        <Trash2 className="w-3 h-3 ml-1.5 opacity-60" />
      </Button>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={download} disabled={busy} className="h-7 px-2 text-xs">
      {busy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CloudDownload className="w-3 h-3 mr-1" />}
      Offline
    </Button>
  );
};

export default CourseOfflineButton;