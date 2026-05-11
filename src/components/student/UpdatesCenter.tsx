import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Megaphone, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { DashboardNotificationCard } from "./DashboardNotificationCard";
import { PlatformAnnouncements } from "./PlatformAnnouncements";
import { cn } from "@/lib/utils";

/**
 * Unified Updates Center — single card that toggles between personal
 * Notifications and platform Announcements. Replaces the two separate
 * dashboard cards so updates live in one organized surface.
 */
export const UpdatesCenter = () => {
  const [tab, setTab] = useState<"notifications" | "announcements">("notifications");
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  return (
    <section aria-label="Updates" className="mb-5">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <div className="flex items-center gap-1.5 bg-amber-50/60 border border-amber-100 rounded-full p-1">
          <button
            type="button"
            onClick={() => setTab("notifications")}
            className={cn(
              "relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition",
              tab === "notifications"
                ? "bg-white text-amber-800 shadow-sm"
                : "text-amber-700/70 hover:text-amber-800"
            )}
          >
            <Bell className="w-3.5 h-3.5" /> Notifications
            {unreadCount > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("announcements")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition",
              tab === "announcements"
                ? "bg-white text-amber-800 shadow-sm"
                : "text-amber-700/70 hover:text-amber-800"
            )}
          >
            <Megaphone className="w-3.5 h-3.5" /> Announcements
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate("/notifications")}
          className="text-[11.5px] font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
        >
          Open all <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
        >
          {tab === "notifications" ? <DashboardNotificationCard /> : <PlatformAnnouncements />}
        </motion.div>
      </AnimatePresence>
    </section>
  );
};

export default UpdatesCenter;
