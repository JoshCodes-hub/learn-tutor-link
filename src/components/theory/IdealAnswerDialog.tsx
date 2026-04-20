import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, FileText, List } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  question: string;
  marks?: number;
}

type Mode = "ideal" | "simplified" | "bullets";

export const IdealAnswerDialog = ({ open, onOpenChange, question, marks }: Props) => {
  const [mode, setMode] = useState<Mode>("ideal");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async (m: Mode) => {
    setMode(m);
    setLoading(true);
    setAnswer("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-ideal-answer", {
        body: { question, mode: m, marks },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnswer(data?.answer ?? "");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate answer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> AI Answer Builder
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={mode === "ideal" ? "default" : "outline"} onClick={() => generate("ideal")} disabled={loading}>
            <FileText className="w-4 h-4" /> Ideal Answer
          </Button>
          <Button size="sm" variant={mode === "simplified" ? "default" : "outline"} onClick={() => generate("simplified")} disabled={loading}>
            <Sparkles className="w-4 h-4" /> Simplify
          </Button>
          <Button size="sm" variant={mode === "bullets" ? "default" : "outline"} onClick={() => generate("bullets")} disabled={loading}>
            <List className="w-4 h-4" /> Bullet Points
          </Button>
        </div>

        <div className="mt-4 min-h-[200px] rounded-lg border border-border/50 bg-muted/30 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Generating...
            </div>
          ) : answer ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">Pick a style above to generate a model answer.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
