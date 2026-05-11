import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ArrowRight, CheckCheck, Sparkles } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";

/**
 * Compact, premium notification card for the student dashboard.
 * Shows up to 3 latest notifications with an unread badge and a "See more"
 * link to /notifications. Tapping a row marks it read and follows its link.
 */
export const DashboardNotificationCard = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const top = notifications.slice(0, 3);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Recent notifications"
      className="relative overflow-hidden rounded-2xl border border-amber-100/80 bg-gradient-to-br from-white via-white to-amber-50/40 shadow-[0_4px_18px_-8px_rgba(180,140,40,0.25)]"
    >
      <div className="pointer-events-none absolute -top-12 -right-10 h-32 w-32 rounded-full blur-3xl bg-amber-200/40" />

      <header className="relative flex items-center justify-between gap-2 px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative h-8 w-8 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-200 flex items-center justify-center">
            <Bell className="h-4 w-4 text-amber-700" strokeWidth={2.2} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
          <div className="min-w-0">
            <h3 className="font-serif text-[15px] font-semibold text-foreground leading-tight truncate">
              Notifications
            </h3>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {unreadCount > 0 ? `${unreadCount} new update${unreadCount > 1 ? "s" : ""}` : "You're all caught up"}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllAsRead()}
            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800 px-2 py-1 rounded-md hover:bg-amber-50 transition"
            aria-label="Mark all as read"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all
          </button>
        )}
      </header>

      <div className="relative px-2 pb-2">
        {isLoading ? (
          <div className="space-y-1.5 px-2 py-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-amber-50/60 animate-pulse" />
            ))}
          </div>
        ) : top.length === 0 ? (
          <div className="px-3 py-5 text-center">
            <Sparkles className="h-5 w-5 text-amber-500 mx-auto mb-1.5" />
            <p className="text-[12.5px] text-muted-foreground">
              No notifications yet. Keep studying — updates will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            <AnimatePresence initial={false}>
              {top.map((n) => (
                <motion.li
                  key={n.id}
                  layout
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  transition={{ duration: 0.25 }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.is_read) markAsRead(n.id);
                      if (n.link) navigate(n.link);
                      else navigate("/notifications");
                    }}
                    className={cn(
                      "w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-xl transition group",
                      "hover:bg-amber-50/80 active:scale-[0.99]",
                      !n.is_read && "bg-amber-50/60"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 rounded-full shrink-0",
                        n.is_read ? "bg-muted-foreground/30" : "bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.18)]"
                      )}
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-[13px] leading-tight truncate",
                        n.is_read ? "font-medium text-foreground/90" : "font-semibold text-foreground"
                      )}>
                        {n.title}
                      </p>
                      <p className="text-[11.5px] text-muted-foreground line-clamp-1 mt-0.5">
                        {n.message}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground/80 mt-1 whitespace-nowrap">
                      {formatDistanceToNowStrict(new Date(n.created_at), { addSuffix: false })}
                    </span>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => navigate("/notifications")}
        className="relative w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-[12.5px] font-semibold text-amber-800 border-t border-amber-100/70 hover:bg-amber-50/60 transition group"
      >
        See more
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </button>
    </motion.section>
  );
};

export default DashboardNotificationCard;