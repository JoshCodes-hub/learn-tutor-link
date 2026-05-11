import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Sparkles, Layers, FileText, ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { type UserResource } from "@/lib/userResources";
import { runLibraryAI, type LibraryAIAction } from "@/lib/libraryAI";
import { FlashcardStudyDialog, type Flashcard } from "./FlashcardStudyDialog";

interface Props {
  resource: UserResource;
}

export const OutlineActionsMenu = ({ resource }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<null | LibraryAIAction>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [studyOpen, setStudyOpen] = useState(false);

  const run = async (action: LibraryAIAction) => {
    if (!user?.id) return;
    setBusy(action);
    try {
      toast.loading("Reading your file…", { id: "lib-ai" });
      const out = await runLibraryAI(resource, action, user.id);
      toast.dismiss("lib-ai");
      qc.invalidateQueries({ queryKey: ["user-resources", user.id] });
      if (action === "flashcards" && out.cards?.length) {
        setCards(out.cards as Flashcard[]);
        setStudyOpen(true);
        toast.success(`${out.cards.length} flashcards ready 🎉`);
      } else if (action === "summary") {
        toast.success("Summary saved to your Library 📝");
      } else if (action === "quiz") {
        toast.success("Practice quiz saved to Library");
      }
    } catch (e) {
      toast.dismiss("lib-ai");
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
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
            disabled={!!busy}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span className="text-xs font-semibold">AI</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuLabel className="text-xs">Generate from this material</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => run("flashcards")} disabled={!!busy}>
            <Layers className="w-4 h-4 mr-2 text-orange-600" /> Flashcards
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => run("summary")} disabled={!!busy}>
            <FileText className="w-4 h-4 mr-2 text-sky-600" /> Study summary
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => run("quiz")} disabled={!!busy}>
            <ClipboardList className="w-4 h-4 mr-2 text-violet-600" /> Practice quiz
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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