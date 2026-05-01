import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, ArrowRight, Sparkles, Pin, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  link_url: string | null;
  link_label: string | null;
  is_pinned: boolean;
  created_at: string;
}

const ROTATE_MS = 6500;

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

export const PlatformAnnouncements = () => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("platform_announcements")
        .select("id,title,body,image_url,link_url,link_label,is_pinned,created_at")
        .in("audience", ["all", "students"])
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);
      if (!alive) return;
      setItems((data as any) ?? []);
      setLoading(false);
    })();

    const channel = supabase
      .channel("platform-announcements-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_announcements" },
        async () => {
          const { data } = await supabase
            .from("platform_announcements")
            .select("id,title,body,image_url,link_url,link_label,is_pinned,created_at")
            .in("audience", ["all", "students"])
            .order("is_pinned", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(10);
          if (alive) setItems((data as any) ?? []);
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [items.length]);

  if (loading) {
    return (
      <div className="mb-6 h-44 sm:h-52 rounded-3xl bg-gradient-to-br from-amber-100/60 via-amber-50 to-white animate-pulse border border-amber-200/50" />
    );
  }

  if (items.length === 0) {
    return (
      <div className="mb-6 relative overflow-hidden rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-white to-amber-50 p-5 sm:p-6">
        <div className="absolute -top-12 -right-10 w-44 h-44 rounded-full bg-amber-200/50 blur-3xl pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30">
            <Megaphone className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-700">
              Announcements
            </p>
            <h3 className="font-display text-lg font-bold text-foreground leading-tight mt-0.5">
              You're all caught up ✨
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              New updates, tips, and events from the OverraPrep team will appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const current = items[idx];

  return (
    <div className="mb-6">
      <div className="relative overflow-hidden rounded-3xl border border-amber-200/60 bg-white shadow-[0_18px_50px_-22px_rgba(180,140,40,0.45)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {/* Image header (if any) */}
            {current.image_url ? (
              <div className="relative h-40 sm:h-48 md:h-56 w-full overflow-hidden bg-gradient-to-br from-amber-500 to-amber-700">
                <img
                  src={current.image_url}
                  alt={current.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-amber-800 text-[10px] font-bold tracking-wider uppercase shadow-sm">
                    <Sparkles className="w-3 h-3" />
                    Announcement
                  </span>
                  {current.is_pinned && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/95 text-white text-[10px] font-bold tracking-wider uppercase shadow-sm">
                      <Pin className="w-3 h-3" />
                      Pinned
                    </span>
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 text-white">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/95 mb-1">
                    {formatRelative(current.created_at)}
                  </p>
                  <h3
                    className="font-display text-xl sm:text-2xl font-bold leading-tight"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}
                  >
                    {current.title}
                  </h3>
                </div>
              </div>
            ) : (
              <div className="relative px-5 sm:px-6 pt-5 pb-2 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white">
                <div className="absolute -top-12 -right-8 w-44 h-44 rounded-full bg-white/20 blur-3xl pointer-events-none" />
                <div className="relative flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 text-amber-800 text-[10px] font-bold tracking-wider uppercase">
                    <Sparkles className="w-3 h-3" />
                    Announcement
                  </span>
                  {current.is_pinned && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-900/40 backdrop-blur text-white text-[10px] font-bold tracking-wider uppercase">
                      <Pin className="w-3 h-3" />
                      Pinned
                    </span>
                  )}
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100/90 ml-auto">
                    {formatRelative(current.created_at)}
                  </span>
                </div>
                <h3
                  className="font-display text-xl sm:text-2xl font-bold leading-tight"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}
                >
                  {current.title}
                </h3>
              </div>
            )}

            {/* Body */}
            <div className="px-5 sm:px-6 py-4 bg-gradient-to-b from-white to-amber-50/40">
              <p className="text-sm sm:text-[15px] text-foreground/85 leading-relaxed line-clamp-3">
                {current.body}
              </p>
              {current.link_url && (
                <a
                  href={current.link_url}
                  target={current.link_url.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="group mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 hover:text-amber-800 transition"
                >
                  {current.link_label || "Learn more"}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </a>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        {items.length > 1 && (
          <>
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
              <button
                onClick={() => setIdx((i) => (i - 1 + items.length) % items.length)}
                aria-label="Previous announcement"
                className="w-7 h-7 rounded-full bg-white/85 hover:bg-white text-amber-800 backdrop-blur-md shadow-sm flex items-center justify-center transition active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIdx((i) => (i + 1) % items.length)}
                aria-label="Next announcement"
                className="w-7 h-7 rounded-full bg-white/85 hover:bg-white text-amber-800 backdrop-blur-md shadow-sm flex items-center justify-center transition active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 sm:px-6 pb-3 flex items-center justify-center gap-1.5 bg-gradient-to-b from-amber-50/40 to-amber-50/60">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  aria-label={`Go to announcement ${i + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    i === idx
                      ? "w-7 bg-gradient-to-r from-amber-500 to-amber-700"
                      : "w-1.5 bg-amber-300/50 hover:bg-amber-400/70"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PlatformAnnouncements;
