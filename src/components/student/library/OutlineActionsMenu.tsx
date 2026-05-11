import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Sparkles, Layers, FileText, ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import {
  getResourceSignedUrl, saveResource, saveTextNote, type UserResource,
} from "@/lib/userResources";
import { extractTextFromFile } from "@/lib/extractText";
import { FlashcardStudyDialog, type Flashcard } from "./FlashcardStudyDialog";

interface Props {
  resource: UserResource;
}

/** Fetch the resource's bytes via signed URL and run client-side extraction. */
async function getTextForResource(r: UserResource): Promise<string> {
  // Notes (txt) we just fetch as text
  const url = await getResourceSignedUrl(r.storage_path, 600);
  if (!url) throw new Error("Could not open file");
  const blob = await (await fetch(url)).blob();
  const file = new File([blob], r.title || "material", { type: r.mime || blob.type });
  if (file.type.startsWith("text/") || /\.(txt|md)$/i.test(r.title)) return await file.text();
  const text = await extractTextFromFile(file);
  if (!text || text.length < 50) throw new Error("Couldn't extract enough text from this file. Image-only PDFs aren't supported yet.");
  return text;
}

export const OutlineActionsMenu = ({ resource }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<null | "flashcards" | "summary" | "quiz">(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [studyOpen, setStudyOpen] = useState(false);

  const run = async (action: "flashcards" | "summary" | "quiz") => {
    if (!user?.id) return;
    setBusy(action);
    try {
      toast.loading("Reading your file…", { id: "lib-ai" });
      const text = await getTextForResource(resource);
      toast.loading("AI is working…", { id: "lib-ai" });
      const { data, error } = await supabase.functions.invoke("library-ai", {
        body: {
          action,
          text,
          title: resource.title,
          count: action === "flashcards" ? 15 : action === "quiz" ? 10 : undefined,
          difficulty: "medium",
        },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const result = (data as any)?.result;
      toast.dismiss("lib-ai");

      if (action === "flashcards") {
        const list: Flashcard[] = (result?.cards || []).filter((c: any) => c?.front && c?.back);
        if (!list.length) throw new Error("No flashcards generated");
        // Save to library
        await saveResource({
          userId: user.id,
          kind: "flashcard",
          title: `Flashcards — ${resource.title}`,
          folder: resource.folder,
          blob: new Blob([JSON.stringify({ cards: list }, null, 2)], { type: "application/json" }),
          mime: "application/json",
          ext: "json",
          meta: { source_resource_id: resource.id, count: list.length },
        });
        qc.invalidateQueries({ queryKey: ["user-resources", user.id] });
        setCards(list);
        setStudyOpen(true);
        toast.success(`${list.length} flashcards ready 🎉`);
      } else if (action === "summary") {
        const lines = [
          `# ${result.title || resource.title}`,
          ``,
          `## Overview`,
          result.overview || "",
          ``,
          `## Key points`,
          ...(result.key_points || []).map((k: string) => `• ${k}`),
          ``,
          `## Must know`,
          ...(result.must_know || []).map((k: string) => `★ ${k}`),
        ].join("\n");
        await saveTextNote({
          userId: user.id,
          title: `Summary — ${resource.title}`,
          content: lines,
          folder: resource.folder,
          meta: { source_resource_id: resource.id, material_type: "summary" },
        });
        qc.invalidateQueries({ queryKey: ["user-resources", user.id] });
        toast.success("Summary saved to your Library 📝");
      } else if (action === "quiz") {
        const qs = result?.questions || [];
        if (!qs.length) throw new Error("No questions generated");
        await saveResource({
          userId: user.id,
          kind: "note",
          title: `Quiz — ${resource.title}`,
          folder: resource.folder,
          blob: new Blob([JSON.stringify({ questions: qs }, null, 2)], { type: "application/json" }),
          mime: "application/json",
          ext: "json",
          meta: { source_resource_id: resource.id, material_type: "quiz", count: qs.length },
        });
        qc.invalidateQueries({ queryKey: ["user-resources", user.id] });
        toast.success(`${qs.length}-question quiz saved to Library`);
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