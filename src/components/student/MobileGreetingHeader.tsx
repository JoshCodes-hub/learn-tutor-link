import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Flame } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Mobile-first greeting header that mirrors the product mockup:
 *   [avatar (gold ring)]  Good morning,                  [bell + badge]
 *                         Welcome back, {name} 👋
 *                         Let's make today productive.
 *
 *   [🔥 On a N-day study streak! 🔥]
 *
 * Renders only on small screens (sm:hidden). Desktop continues to use the
 * existing sticky brand header.
 */
export const MobileGreetingHeader = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [streak, setStreak] = useState<number>(0);
  const [unread, setUnread] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: s }, { count }] = await Promise.all([
        supabase
          .from("study_streaks")
          .select("current_streak")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false),
      ]);
      if (cancelled) return;
      setStreak(s?.current_streak ?? 0);
      setUnread(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning,";
    if (h < 17) return "Good afternoon,";
    return "Good evening,";
  })();

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="sm:hidden mb-4"
      aria-label="Welcome"
    >
      <div className="flex items-start gap-3">
        <Link
          to="/profile/edit"
          aria-label="Edit profile"
          className="shrink-0 rounded-full p-[2px] bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 shadow-[0_4px_12px_-4px_rgba(180,140,40,0.45)]"
        >
          <Avatar className="h-12 w-12 ring-2 ring-white">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || ""} />
            <AvatarFallback className="bg-gradient-to-br from-amber-100 to-amber-200 text-amber-800 font-bold">
              {firstName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-muted-foreground leading-tight">{greeting}</p>
          <h1 className="font-display text-[20px] font-extrabold tracking-tight text-foreground leading-tight truncate">
            Welcome back, {firstName} <span aria-hidden>👋</span>
          </h1>
          <p className="text-[11.5px] text-muted-foreground leading-tight mt-0.5 truncate">
            Let's make today productive.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/notifications")}
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
          className="relative shrink-0 h-11 w-11 rounded-full bg-white border border-amber-100 shadow-sm flex items-center justify-center hover:bg-amber-50 active:scale-95 transition"
        >
          <Bell className="h-5 w-5 text-amber-700" strokeWidth={2} />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </div>

      {/* Streak chip */}
      <div className="mt-3">
        <div className="inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full border border-amber-300/70 bg-gradient-to-r from-amber-50 to-amber-100/60 text-amber-800 text-[12px] font-semibold shadow-[0_2px_8px_-4px_rgba(180,140,40,0.35)]">
          <Flame className="h-3.5 w-3.5 text-amber-600" />
          {streak > 0
            ? <>On a <span className="font-extrabold">{streak}-day</span> study streak!</>
            : <>Start your study streak today!</>}
          <Flame className="h-3.5 w-3.5 text-amber-600" />
        </div>
      </div>
    </motion.header>
  );
};

export default MobileGreetingHeader;
