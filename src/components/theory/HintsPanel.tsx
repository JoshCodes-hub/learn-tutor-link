import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, Loader2, Eye, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Hint {
  level: "nudge" | "structure" | "direction";
  title: string;
  content: string;
}

interface Props {
  question: string;
  modelAnswer: string | null;
  keyPoints: string[];
  marks: number;
  disabled?: boolean;
}

const tagStyles: Record<Hint["level"], string> = {
  nudge: "bg-primary/5 border-primary/20",
  structure: "bg-primary/10 border-primary/30",
  direction: "bg-primary/15 border-primary/40",
};

export const HintsPanel = ({ question, modelAnswer, keyPoints, marks, disabled }: Props) => {
  const [loading, setLoading] = useState(false);
  const [hints, setHints] = useState<Hint[]>([]);
  const [revealed, setRevealed] = useState(0);

  const fetchHints = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("theory-hints", {
        body: { question, model_answer: modelAnswer, key_points: keyPoints, marks },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setHints(data.hints ?? []);
      setRevealed(1);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load hints");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" /> Need a hint?
        </CardTitle>
        {hints.length === 0 ? (
          <Button size="sm" variant="outline" onClick={fetchHints} disabled={loading || disabled}>
            {loading ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</>) : (<><Eye className="w-3.5 h-3.5" /> Show hints</>)}
          </Button>
        ) : revealed < hints.length ? (
          <Button size="sm" variant="outline" onClick={() => setRevealed((r) => Math.min(r + 1, hints.length))}>
            <ChevronRight className="w-3.5 h-3.5" /> Reveal next ({revealed}/{hints.length})
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">All hints revealed</span>
        )}
      </CardHeader>
      {hints.length > 0 && (
        <CardContent className="space-y-2">
          <AnimatePresence initial={false}>
            {hints.slice(0, revealed).map((h, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`rounded-lg border p-3 ${tagStyles[h.level]}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-primary">Hint {i + 1} · {h.level}</span>
                </div>
                <div className="text-sm font-medium mb-0.5">{h.title}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">{h.content}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </CardContent>
      )}
    </Card>
  );
};
