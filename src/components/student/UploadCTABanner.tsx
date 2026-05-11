import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Sparkles, X, FileText, Brain, Layers } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { track } from "@/lib/analytics";

const STORAGE_KEY_PREFIX = "overra_upload_welcome_dismissed_";

/**
 * Dashboard CTA card that always offers a one-tap "Upload Document" shortcut.
 * On first visit (or right after a fresh sign-in) it expands into a richer
 * welcome banner with an "Upload Now" CTA. The expanded variant is dismissible
 * per-user via localStorage.
 */
export const UploadCTABanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const key = STORAGE_KEY_PREFIX + user.id;
    const dismissed = localStorage.getItem(key) === "1";
    // Once dismissed, the welcome banner stays dismissed across sessions until
    // the user *explicitly* asks to see it again (e.g. by clearing the flag).
    // The compact "Upload Document" CTA always remains available below.
    // Always clear any stale fresh-login marker so it can never re-trigger.
    sessionStorage.removeItem("overra_fresh_login");
    if (!dismissed) setShowWelcome(true);
  }, [user?.id]);

  const dismissWelcome = () => {
    if (user?.id) localStorage.setItem(STORAGE_KEY_PREFIX + user.id, "1");
    setShowWelcome(false);
  };

  const goUpload = (variant: "welcome" | "compact") => {
    void track("upload_cta_clicked", { surface: "dashboard_banner", variant });
    navigate("/library?upload=1");
  };

  return (
    <section aria-label="Upload your study materials" className="mb-5 sm:mb-6">
      <AnimatePresence initial={false} mode="wait">
        {showWelcome ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-amber-100/60 to-white p-3.5 sm:p-5 shadow-[0_8px_24px_-12px_rgba(180,140,40,0.35)]"
          >
            <button
              onClick={dismissWelcome}
              aria-label="Dismiss"
              className="absolute top-1.5 right-1.5 p-1.5 rounded-full hover:bg-amber-200/60 text-amber-800/70"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-2.5 sm:gap-3 mb-3 pr-7">
              <div className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 grid place-items-center shadow-md">
                <Sparkles className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-[15px] sm:text-lg font-bold text-amber-950 leading-snug">
                  Turn your notes into study super-powers
                </h3>
                <p className="text-[11.5px] sm:text-sm text-amber-900/80 mt-0.5 leading-snug">
                  Upload outlines, notes or past questions — get instant flashcards, summaries & quizzes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap mb-3 text-[10.5px] sm:text-[11px] text-amber-900/80">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/70 border border-amber-200 whitespace-nowrap">
                <FileText className="w-3 h-3" /> PDF · DOCX · TXT
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/70 border border-amber-200 whitespace-nowrap">
                <Layers className="w-3 h-3" /> Auto Flashcards
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/70 border border-amber-200 whitespace-nowrap">
                <Brain className="w-3 h-3" /> AI Quizzes
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => goUpload("welcome")}
                className="inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-sm font-bold shadow-md flex-1 sm:flex-none active:scale-[0.98] transition-transform"
              >
                <Upload className="w-4 h-4" /> Upload Now
              </button>
              <button
                onClick={dismissWelcome}
                className="px-3 h-10 rounded-xl text-sm font-semibold text-amber-900/80 hover:bg-amber-200/40 shrink-0"
              >
                Later
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="compact"
            type="button"
            onClick={() => goUpload("compact")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="w-full group relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-3 sm:p-4 text-left flex items-center gap-3 shadow-[0_4px_18px_-12px_rgba(180,140,40,0.3)] hover:shadow-[0_10px_26px_-14px_rgba(180,140,40,0.5)] transition-all"
          >
            <div className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 grid place-items-center shadow-md">
              <Upload className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-[14px] sm:text-base font-bold text-foreground leading-tight truncate">
                Upload Document
              </div>
              <div className="text-[11px] sm:text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                Outlines, notes or past questions — auto flashcards & quizzes
              </div>
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-amber-700 shrink-0 group-hover:translate-x-0.5 transition-transform">
              Open →
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </section>
  );
};

export default UploadCTABanner;
