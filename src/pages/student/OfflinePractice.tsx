import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppScreen } from "@/components/app-shell/AppScreen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listOfflineSets, deleteOfflineSet, OfflineSet } from "@/lib/offlineQuizStore";
import { Download, HardDrive, Play, Trash2, WifiOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function OfflinePractice() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sets, setSets] = useState<OfflineSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    setSets(await listOfflineSets(user.id));
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const onUp = () => setOnline(true);
    const onDown = () => setOnline(false);
    window.addEventListener("online", onUp);
    window.addEventListener("offline", onDown);
    return () => {
      window.removeEventListener("online", onUp);
      window.removeEventListener("offline", onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const remove = async (id: string) => {
    await deleteOfflineSet(id);
    toast({ title: "Removed from device" });
    refresh();
  };

  return (
    <AppScreen
      back
      title="Offline Practice"
      subtitle={online ? "Saved sets — practice anywhere" : "You're offline — using saved sets"}
      right={
        !online ? <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600"><WifiOff className="w-3 h-3" /> Offline</Badge> : null
      }
    >
      <div className="max-w-2xl mx-auto space-y-4 pb-8">
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold leading-tight">Practice without network</p>
              <p className="text-xs text-muted-foreground mt-1">
                Download recommended CBT sets from the Readiness dashboard to drill anywhere — no signal needed.
              </p>
            </div>
          </div>
        </Card>

        {loading && <p className="text-center text-xs text-muted-foreground">Loading saved sets…</p>}

        {!loading && sets.length === 0 && (
          <Card className="p-8 text-center">
            <Download className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="font-display text-lg">No offline sets yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Tap "Download for offline" on any recommended quiz.</p>
            <Button onClick={() => navigate("/student/readiness")}>Go to Readiness</Button>
          </Card>
        )}

        {sets.map((s) => (
          <Card key={s.id} className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold leading-tight truncate">{s.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {s.question_count} questions · saved {formatDistanceToNow(new Date(s.downloaded_at), { addSuffix: true })}
              </p>
            </div>
            <Button size="sm" onClick={() => navigate(`/student/offline/${s.id}`)}>
              <Play className="w-3.5 h-3.5 mr-1" /> Start
            </Button>
            <Button size="sm" variant="ghost" onClick={() => remove(s.id)} aria-label="Remove">
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          </Card>
        ))}
      </div>
    </AppScreen>
  );
}
