import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Sparkles, History, RefreshCw, ExternalLink, Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listAIGenerationsForResource, type AIGenRow } from "@/lib/aiGenerationHistory";

interface Props {
  resourceId: string;
  onQuickOpen?: (outputRef: string, kind: AIGenRow["kind"]) => void;
  onRerun?: (kind: AIGenRow["kind"]) => void;
}

const kindLabel: Record<AIGenRow["kind"], string> = {
  quiz: "Practice quiz",
  flashcards: "Flashcards",
  summary: "Study summary",
  audio: "Audio lesson",
};

const StatusIcon = ({ s }: { s: AIGenRow["status"] }) => {
  if (s === "completed") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
  if (s === "failed") return <XCircle className="w-3.5 h-3.5 text-destructive" />;
  if (s === "cancelled") return <X className="w-3.5 h-3.5 text-muted-foreground" />;
  return <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />;
};

export const GenerationHistoryPanel = ({ resourceId, onQuickOpen, onRerun }: Props) => {
  const [rows, setRows] = useState<AIGenRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const r = await listAIGenerationsForResource(resourceId);
    setRows(r);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [resourceId]);

  return (
    <div className="rounded-lg border bg-card/50">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold">Generation history</span>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={refresh} aria-label="Refresh">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>
      {loading ? (
        <div className="p-4 text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="p-4 text-xs text-muted-foreground flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" /> No AI generations yet — pick an action above.
        </div>
      ) : (
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.id} className="px-3 py-2 flex items-center gap-2 text-sm">
              <StatusIcon s={r.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{kindLabel[r.kind]}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">{r.status}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                </p>
              </div>
              {r.status === "completed" && r.output_ref && onQuickOpen && (
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onQuickOpen(r.output_ref!, r.kind)}>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              )}
              {onRerun && (
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onRerun(r.kind)}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GenerationHistoryPanel;