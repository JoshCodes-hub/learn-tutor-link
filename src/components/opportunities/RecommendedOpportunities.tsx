import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import { useOpportunityBookmarks, type Opportunity } from "@/hooks/useOpportunities";

export default function RecommendedOpportunities({ limit = 4 }: { limit?: number }) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["recommended-opportunities", limit],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("recommend_opportunities", { _limit: limit });
      if (error) throw error;
      return (data ?? []) as Opportunity[];
    },
  });
  const { data: bookmarks = new Set<string>() } = useOpportunityBookmarks();

  if (isLoading || items.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <h2 className="font-display text-sm font-bold tracking-tight">Recommended for you</h2>
      </div>
      <p className="text-[11.5px] text-muted-foreground mb-3">
        Matched to your department, level and university.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((op) => (
          <OpportunityCard key={op.id} op={op} bookmarked={bookmarks.has(op.id)} />
        ))}
      </div>
    </section>
  );
}