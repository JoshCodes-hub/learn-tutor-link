import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Sparkles, Layers, FileText, ClipboardList, Loader2, AlertTriangle, CheckCircle2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { type UserResource } from "@/lib/userResources";
import { runLibraryAI, type LibraryAIAction } from "@/lib/libraryAI";
import { FlashcardStudyDialog, type Flashcard } from "./FlashcardStudyDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface Props {
  resource: UserResource;
}

const STAGES: Record<LibraryAIAction, string[]> = {
  flashcards: ["Opening your file", "Extracting text", "Asking AI for flashcards", "Saving to your Library"],
  summary:    ["Opening your file", "Extracting text", "Building a structured summary", "Saving to your Library"],
  quiz:       ["Opening your file", "Extracting text", "Writing practice questions", "Saving to your Library"],
};

const LABELS: Record<LibraryAIAction, string> = {
  flashcards: "Flashcards",
  summary: "Study summary",
  quiz: "Practice quiz",
};

export const OutlineActionsMenu = ({ resource }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [studyOpen, setStudyOpen] = useState(false);
  const [action, setAction] = useState<LibraryAIAction | null>(null);
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const busy = !!action && !done && !error && !cancelled;

  useEffect(() => {
    if (!busy) return;
    const targets = [25, 55, 85, 95];
    const target = targets[stage] ?? 95;
    const id = setInterval(() => {
      setProgress((p) => (p < target ? Math.min(target, p + 2) : p));
    }, 120);
    return () => clearInterval(id);
  }, [busy, stage]);

  const run = async (a: LibraryAIAction) => {
    if (!user?.id) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setAction(a); setStage(0); setProgress(8); setError(null); setDone(false); setCancelled(false);
    try {
      setStage(1);
      setTimeout(() => setStage((s) => Math.max(s, 2)), 600);
      const out = await runLibraryAI(resource, a, user.id, { signal: ac.signal });
      setStage(3); setProgress(100); setDone(true);
      qc.invalidateQueries({ queryKey: ["user-resources", user.id] });
      if (a === "flashcards" && out.cards?.length) {
        setCards(out.cards as Flashcard[]);
        toast.success(`${out.cards.length} flashcards ready`);
      } else if (a === "summary") {
        toast.success("Summary saved to your Library");
      } else if (a === "quiz") {
        if (out.saved?.id) (window as any).__lastSavedQuizId = out.saved.id;
        toast.success("Practice quiz saved to Library");
      }
    } catch (e) {
      console.error(e);
      if ((e as any)?.name === "AbortError") {
        setCancelled(true);
        toast.info("Generation cancelled");
      } else {
        setError(e instanceof Error ? e.message : "Generation failed");
      }
    }
  };

  const cancel = () => { abortRef.current?.abort(); };

  const closeDialog = () => {
    const wasFlash = action === "flashcards" && cards.length > 0 && done;
    const wasQuiz = action === "quiz" && done;
    const savedQuizId = wasQuiz ? (window as any).__lastSavedQuizId as string | undefined : undefined;
    setAction(null); setProgress(0); setStage(0); setError(null); setDone(false); setCancelled(false);
    if (wasFlash) setStudyOpen(true);
    if (wasQuiz && savedQuizId) {
      (window as any).__lastSavedQuizId = undefined;
      navigate(`/ai-quiz/${savedQuizId}`);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="default"
            className="h-8 gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-sm"
            onClick={(e) => e.stopPropagation()}
            disabled={busy}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span className="text-xs font-semibold">AI</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuLabel className="text-xs">Generate from this material</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => run("flashcards")} disabled={busy}>
            <Layers className="w-4 h-4 mr-2 text-orange-600" /> Flashcards
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => run("summary")} disabled={busy}>
            <FileText className="w-4 h-4 mr-2 text-sky-600" /> Study summary
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => run("quiz")} disabled={busy}>
            <ClipboardList className="w-4 h-4 mr-2 text-violet-600" /> Practice quiz
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!action} onOpenChange={(o) => { if (!o && !busy) closeDialog(); }}>
        <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Sparkles className="w-4 h-4 text-amber-500" />
              {action ? LABELS[action] : "Generating"}
            </DialogTitle>
          </DialogHeader>

          {!error && !done && action && (
            <div className="space-y-3">
              <Progress value={progress} className="h-2" />
              <ul className="space-y-1.5">
                {STAGES[action].map((label, i) => (
                  <li key={label} className="flex items-center gap-2 text-xs">
                    {i < stage ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : i === stage ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                    )}
                    <span className={i <= stage ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-muted-foreground">You can leave this dialog open while AI works — usually 5–15s.</p>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={cancel} className="gap-1.5 text-muted-foreground hover:text-destructive">
                  <X className="w-3.5 h-3.5" /> Cancel
                </Button>
              </div>
            </div>
          )}

          {cancelled && !error && !done && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <X className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="leading-snug">Generation cancelled.</span>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={closeDialog}>Close</Button>
                <Button size="sm" onClick={() => action && run(action)} className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white">
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="leading-snug">{error}</span>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={closeDialog}>Close</Button>
                <Button size="sm" onClick={() => action && run(action)} className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white">
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </Button>
              </div>
            </div>
          )}

          {done && !error && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="w-4 h-4" /> Saved to your Library.
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" onClick={closeDialog} className="bg-amber-500 hover:bg-amber-600 text-white">
                  {action === "flashcards" && cards.length ? "Start studying" : "Done"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <FlashcardStudyDialog
        open={studyOpen}
        onOpenChange={setStudyOpen}
        cards={cards}
        title={`Flashcards — ${resource.title}`}
      />
    </>
  );
};

export default OutlineActionsMenu;
