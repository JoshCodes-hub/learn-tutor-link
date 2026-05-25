import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Layers, ArrowRight } from "lucide-react";

/**
 * Lightweight flashcard completion strip for the Course Hub flashcards tab.
 * Shows % reviewed (SRS repetitions >= 1) and a "Continue review" CTA.
 */
export const FlashcardProgressStrip = ({ courseId }: { courseId: string }) => {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["course-flash-progress", courseId, user?.id],
    enabled: !!user?.id && !!courseId,
    queryFn: async () => {
      const { data: fcs } = await supabase.from("flashcards").select("id").eq("course_id", courseId).limit(2000);
      const ids = (fcs ?? []).map((r: any) => r.id);
      if (!ids.length) return { total: 0, reviewed: 0 };
      const { data: srs } = await supabase
        .from("srs_cards")
        .select("repetitions, source_id")
        .eq("user_id", user!.id)
        .in("source_id", ids);
      const reviewed = (srs ?? []).filter((c: any) => (c.repetitions ?? 0) >= 1).length;
      return { total: ids.length, reviewed };
    },
  });

  if (!data || data.total === 0) return null;
  const pct = Math.round((data.reviewed / data.total) * 100);

  return (
    <Card className="p-3 mb-3 flex items-center gap-3 bg-gradient-to-br from-white to-amber-50/40 border-amber-100">
      <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
        <Layers className="w-4.5 h-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-semibold">Flashcard mastery</p>
          <span className="text-[11px] font-bold text-amber-700">{pct}%</span>
        </div>
        <Progress value={pct} className="h-1.5" />
        <p className="text-[11px] text-muted-foreground mt-1">{data.reviewed}/{data.total} cards reviewed — counts toward your Exam Readiness</p>
      </div>
      <Button asChild size="sm" variant="outline" className="h-8 shrink-0">
        <Link to={`/review?course=${courseId}`}>Continue <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
      </Button>
    </Card>
  );
};

export default FlashcardProgressStrip;