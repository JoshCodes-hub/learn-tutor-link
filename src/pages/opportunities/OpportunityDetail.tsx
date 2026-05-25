import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, ExternalLink, Bookmark, Check } from "lucide-react";
import { format } from "date-fns";
import { SEO } from "@/components/seo/SEO";
import { useOpportunity, useOpportunityBookmarks, useToggleOpportunityBookmark } from "@/hooks/useOpportunities";
import { useMyApplicationFor, useSetApplicationStatus, type AppStatus } from "@/hooks/useOpportunityApplications";
import { toast } from "sonner";

export default function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: op, isLoading } = useOpportunity(id);
  const { data: bookmarks = new Set<string>() } = useOpportunityBookmarks();
  const toggle = useToggleOpportunityBookmark();
  const { data: myApp } = useMyApplicationFor(id);
  const setStatus = useSetApplicationStatus();

  if (isLoading || !op) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }
  const isBookmarked = bookmarks.has(op.id);
  const status: AppStatus | null = (myApp?.status as AppStatus | undefined) ?? null;
  const STATUSES: { v: AppStatus; label: string }[] = [
    { v: "interested", label: "Interested" },
    { v: "applied", label: "Applied" },
    { v: "accepted", label: "Accepted" },
    { v: "rejected", label: "Rejected" },
  ];

  return (
    <>
      <SEO title={`${op.title} — Opportunity Hub`} description={op.description.slice(0, 150)} />
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-amber-100/70 sticky top-0 z-30">
          <div className="container mx-auto px-4 h-14 flex items-center gap-3">
            <Link to="/opportunities" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
            <h1 className="font-display text-base font-bold truncate">{op.title}</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-2xl">
          {op.cover_image_url && (
            <img src={op.cover_image_url} alt={op.title} className="w-full h-44 object-cover rounded-2xl mb-4 border border-amber-100/70" />
          )}
          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/70 text-amber-800">
            {op.category}
          </span>
          <h2 className="font-display text-xl font-bold mt-2">{op.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{op.organization}{op.university ? ` · ${op.university}` : ""}</p>

          <div className="flex items-center gap-2 mt-3 text-[12.5px] text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {op.deadline ? <>Deadline: {format(new Date(op.deadline), "MMMM d, yyyy")}</> : "Rolling deadline"}
          </div>

          <div className="prose prose-sm mt-5 whitespace-pre-wrap text-foreground">
            {op.description}
          </div>

          <div className="flex items-center gap-3 mt-6">
            {op.apply_url && (
              <a href={op.apply_url} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-lg text-sm">
                Apply now <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button
              onClick={() => toggle.mutate({ id: op.id, current: isBookmarked })}
              className="inline-flex items-center gap-2 border border-amber-200 px-4 py-2 rounded-lg text-sm font-semibold text-amber-800 hover:bg-amber-50"
            >
              <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-amber-500" : ""}`} />
              {isBookmarked ? "Saved" : "Save"}
            </button>
          </div>

          <div className="mt-6 border-t border-amber-100/70 pt-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Your application
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => {
                const active = status === s.v;
                return (
                  <button key={s.v}
                    onClick={() => setStatus.mutate(
                      { opportunityId: op.id, status: s.v },
                      { onSuccess: () => toast.success(`Marked as ${s.label.toLowerCase()}`) },
                    )}
                    className={`text-[12px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border transition-colors inline-flex items-center gap-1 ${
                      active ? "bg-amber-500 border-amber-500 text-white"
                             : "bg-card border-amber-100/70 text-muted-foreground hover:border-amber-200"
                    }`}>
                    {active && <Check className="h-3 w-3" />} {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}