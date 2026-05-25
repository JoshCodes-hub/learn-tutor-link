import { Link } from "react-router-dom";
import { ArrowLeft, Upload, Megaphone, BookOpen, Briefcase, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SEO } from "@/components/seo/SEO";
import { useActivityFeed } from "@/hooks/useActivityFeed";

const ICONS: Record<string, any> = {
  uploaded_note: Upload,
  posted_quiz: BookOpen,
  announced: Megaphone,
  posted_opportunity: Briefcase,
  featured_spotlight: Star,
};

function describe(e: any) {
  const t = e.meta?.title ?? "";
  switch (e.verb) {
    case "uploaded_note": return `New lecture note: ${t}`;
    case "posted_quiz": return `New quiz: ${t}`;
    case "announced": return `Tutor announcement: ${t}`;
    case "posted_opportunity": return `New opportunity: ${t}`;
    case "featured_spotlight": return `Spotlight: ${t}`;
    default: return e.verb;
  }
}

export default function ActivityFeed() {
  const { data: items = [], isLoading } = useActivityFeed(50);
  return (
    <>
      <SEO title="Activity Feed — OverraPrep AI" description="What's happening across your academic ecosystem." />
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-amber-100/70 sticky top-0 z-30">
          <div className="container mx-auto px-4 h-14 flex items-center gap-3">
            <Link to="/student/dashboard" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
            <h1 className="font-display text-base font-bold">Activity</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-5 max-w-2xl">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-12">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Nothing here yet.</p>
          ) : (
            <ul className="rounded-2xl border border-amber-100/70 bg-card divide-y divide-amber-50">
              {items.map((e) => {
                const Icon = ICONS[e.verb] ?? Star;
                return (
                  <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="h-8 w-8 shrink-0 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-amber-700" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-medium text-foreground truncate">{describe(e)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </main>
      </div>
    </>
  );
}