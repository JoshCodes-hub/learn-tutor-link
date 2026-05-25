import { Link } from "react-router-dom";
import { Bookmark, ExternalLink, Calendar } from "lucide-react";
import { format, isAfter } from "date-fns";
import type { Opportunity } from "@/hooks/useOpportunities";
import { useToggleOpportunityBookmark } from "@/hooks/useOpportunities";

const CATEGORY_LABEL: Record<string, string> = {
  internship: "Internship",
  scholarship: "Scholarship",
  hackathon: "Hackathon",
  competition: "Competition",
  tech_program: "Tech Program",
  career: "Career",
};

export function OpportunityCard({ op, bookmarked }: { op: Opportunity; bookmarked: boolean }) {
  const toggle = useToggleOpportunityBookmark();
  const deadlineDate = op.deadline ? new Date(op.deadline) : null;
  const expired = deadlineDate ? !isAfter(deadlineDate, new Date()) : false;

  return (
    <article className="group rounded-2xl border border-amber-100/70 bg-card p-4 hover:border-amber-200 hover:shadow-[0_6px_18px_-10px_rgba(180,140,40,0.25)] transition-all">
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/70 text-amber-800">
          {CATEGORY_LABEL[op.category] ?? op.category}
        </span>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); toggle.mutate({ id: op.id, current: bookmarked }); }}
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
          className="p-1 rounded-md hover:bg-amber-50"
        >
          <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-amber-500 text-amber-600" : "text-muted-foreground"}`} />
        </button>
      </div>

      <Link to={`/opportunities/${op.id}`} className="block">
        <h3 className="font-display text-[15px] font-bold text-foreground leading-snug line-clamp-2">
          {op.title}
        </h3>
        <p className="text-[12.5px] text-muted-foreground mt-1">{op.organization}</p>
      </Link>

      <div className="mt-3 flex items-center justify-between text-[11.5px]">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          {deadlineDate ? (
            <span className={expired ? "text-rose-600" : ""}>
              {expired ? "Closed" : `Closes ${format(deadlineDate, "MMM d")}`}
            </span>
          ) : (
            <span>Rolling</span>
          )}
        </span>
        {op.apply_url && (
          <a
            href={op.apply_url}
            target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 font-bold"
          >
            Apply <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </article>
  );
}