import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone,
  ArrowRight,
  Sparkles,
  Pin,
  Search,
  Calendar,
  Wrench,
  Gift,
  Lightbulb,
  Tag,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface Announcement {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  link_url: string | null;
  link_label: string | null;
  is_pinned: boolean;
  category: string;
  created_at: string;
}

const CATEGORIES = [
  { id: "all", label: "All", icon: Tag },
  { id: "general", label: "News", icon: Megaphone },
  { id: "feature", label: "Features", icon: Sparkles },
  { id: "event", label: "Events", icon: Calendar },
  { id: "promo", label: "Offers", icon: Gift },
  { id: "tips", label: "Tips", icon: Lightbulb },
  { id: "maintenance", label: "Updates", icon: Wrench },
] as const;

const CAT_BADGE: Record<string, string> = {
  general: "bg-amber-100 text-amber-800",
  feature: "bg-emerald-100 text-emerald-800",
  event: "bg-sky-100 text-sky-800",
  promo: "bg-pink-100 text-pink-800",
  tips: "bg-violet-100 text-violet-800",
  maintenance: "bg-slate-200 text-slate-700",
};

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const SELECT_COLS =
  "id,title,body,image_url,link_url,link_label,is_pinned,category,created_at";

export const PlatformAnnouncements = () => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [active, setActive] = useState<Announcement | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("platform_announcements")
        .select(SELECT_COLS)
        .in("audience", ["all", "students"])
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(40);
      if (!alive) return;
      setItems((data as any) ?? []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("platform-announcements-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_announcements" },
        () => load()
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q)
      );
    });
  }, [items, query, category]);

  // Available category counts (for chip visibility)
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    items.forEach((a) => {
      c[a.category] = (c[a.category] ?? 0) + 1;
    });
    return c;
  }, [items]);

  if (loading) {
    return (
      <div className="mb-4 sm:mb-6 h-40 sm:h-52 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-100/60 via-amber-50 to-white animate-pulse border border-amber-200/50" />
    );
  }

  if (items.length === 0) {
    return (
      <div className="mb-4 sm:mb-6 relative overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-white to-amber-50 p-4 sm:p-6">
        <div className="absolute -top-12 -right-10 w-44 h-44 rounded-full bg-amber-200/50 blur-3xl pointer-events-none" />
        <div className="relative flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30">
            <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-700">
              Announcements
            </p>
            <h3 className="font-display text-base sm:text-lg font-bold leading-tight mt-0.5">
              You're all caught up ✨
            </h3>
            <p className="text-[13px] sm:text-sm text-muted-foreground mt-1">
              New updates, tips, and events from the OverraPrep team will appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="mb-4 sm:mb-6" aria-label="Announcements">
      {/* Header + search */}
      <div className="flex items-center gap-2 mb-2.5 sm:mb-3">
        <Megaphone className="w-4 h-4 text-amber-700" />
        <h2 className="text-sm sm:text-base font-bold tracking-tight">
          Announcements
          <span className="ml-1.5 text-[11px] font-semibold text-muted-foreground">
            {filtered.length}
          </span>
        </h2>
        <div className="ml-auto relative w-32 sm:w-56">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="h-8 pl-7 pr-2 text-xs rounded-full bg-white/80 border-amber-200/60"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto -mx-1 px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map(({ id, label, icon: Icon }) => {
          const n = counts[id] ?? 0;
          if (id !== "all" && n === 0) return null;
          const active = category === id;
          return (
            <button
              key={id}
              onClick={() => setCategory(id)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition active:scale-95 border",
                active
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-white/80 text-amber-900 border-amber-200/70 hover:bg-amber-50"
              )}
            >
              <Icon className="w-3 h-3" />
              {label}
              <span
                className={cn(
                  "ml-0.5 px-1 rounded-full text-[10px] font-bold",
                  active ? "bg-white/25" : "bg-amber-100 text-amber-800"
                )}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards list (compact, taps open bottom sheet) */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-amber-200/60 bg-white p-5 text-center text-sm text-muted-foreground">
          No announcements match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {filtered.map((a) => (
            <motion.button
              key={a.id}
              type="button"
              onClick={() => setActive(a)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="group relative text-left overflow-hidden rounded-2xl border border-amber-200/60 bg-white shadow-[0_10px_28px_-18px_rgba(180,140,40,0.45)] active:scale-[0.99] transition"
            >
              {a.image_url ? (
                <div className="relative h-24 w-full overflow-hidden bg-gradient-to-br from-amber-500 to-amber-700">
                  <img
                    src={a.image_url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  {a.is_pinned && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/95 text-white text-[10px] font-bold uppercase tracking-wider">
                      <Pin className="w-2.5 h-2.5" /> Pinned
                    </span>
                  )}
                </div>
              ) : null}
              <div className="p-3 sm:p-3.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                      CAT_BADGE[a.category] ?? CAT_BADGE.general
                    )}
                  >
                    {a.category}
                  </span>
                  {!a.image_url && a.is_pinned && (
                    <span className="inline-flex items-center gap-0.5 text-amber-700 text-[10px] font-bold">
                      <Pin className="w-2.5 h-2.5" /> Pinned
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {formatRelative(a.created_at)}
                  </span>
                </div>
                <h3 className="font-display text-[15px] sm:text-base font-bold leading-snug line-clamp-2">
                  {a.title}
                </h3>
                <p className="text-[12.5px] text-muted-foreground line-clamp-2 mt-1 leading-snug">
                  {a.body}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                  Read more <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Bottom-sheet detail */}
      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent
          side="bottom"
          className="p-0 max-h-[92dvh] overflow-y-auto rounded-t-3xl border-t-2 border-amber-200/60"
        >
          <AnimatePresence>
            {active && (
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* drag handle */}
                <div className="flex justify-center pt-2 pb-1">
                  <span className="h-1.5 w-12 rounded-full bg-amber-200/80" />
                </div>

                {active.image_url ? (
                  <div className="relative h-44 sm:h-56 w-full overflow-hidden bg-gradient-to-br from-amber-500 to-amber-700">
                    <img
                      src={active.image_url}
                      alt={active.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/90 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
                          {active.category}
                        </span>
                        {active.is_pinned && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500/95 text-white text-[10px] font-bold uppercase tracking-wider">
                            <Pin className="w-2.5 h-2.5" /> Pinned
                          </span>
                        )}
                      </div>
                      <SheetTitle className="font-display text-xl sm:text-2xl font-bold leading-tight text-white drop-shadow-md">
                        {active.title}
                      </SheetTitle>
                    </div>
                  </div>
                ) : (
                  <SheetHeader className="px-5 pt-2 pb-0 text-left">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          CAT_BADGE[active.category] ?? CAT_BADGE.general
                        )}
                      >
                        {active.category}
                      </span>
                      {active.is_pinned && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider">
                          <Pin className="w-2.5 h-2.5" /> Pinned
                        </span>
                      )}
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        {formatRelative(active.created_at)}
                      </span>
                    </div>
                    <SheetTitle className="font-display text-xl sm:text-2xl font-bold leading-tight">
                      {active.title}
                    </SheetTitle>
                  </SheetHeader>
                )}

                <div className="px-5 py-4 sm:py-5">
                  {active.image_url && (
                    <div className="flex items-center gap-1.5 mb-3 text-[11px] text-muted-foreground">
                      <Sparkles className="w-3 h-3 text-amber-700" />
                      {formatRelative(active.created_at)}
                    </div>
                  )}
                  <SheetDescription asChild>
                    <p className="text-[14.5px] leading-relaxed text-foreground/90 whitespace-pre-line">
                      {active.body}
                    </p>
                  </SheetDescription>

                  {active.link_url && (
                    <Button
                      asChild
                      variant="hero"
                      size="lg"
                      className="w-full mt-5"
                    >
                      <a
                        href={active.link_url}
                        target={active.link_url.startsWith("http") ? "_blank" : undefined}
                        rel="noreferrer"
                      >
                        {active.link_label || "Open"}
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    className="w-full mt-2 text-muted-foreground"
                    onClick={() => setActive(null)}
                  >
                    <X className="w-4 h-4" /> Close
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SheetContent>
      </Sheet>
    </section>
  );
};

export default PlatformAnnouncements;