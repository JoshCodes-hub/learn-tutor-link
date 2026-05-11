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
    // Show welcome if not dismissed yet, OR if a fresh sign-in flag is set.
    const freshLogin = sessionStorage.getItem("overra_fresh_login") === "1";
    if (!dismissed || freshLogin) {
      setShowWelcome(true);
      sessionStorage.removeItem("overra_fresh_login");
    }
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
    <section aria-label="Upload your study materials" className="mb-6">
      <AnimatePresence initial={false} mode="wait">
        {showWelcome ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-amber-100/60 to-white p-4 sm:p-5 shadow-[0_8px_24px_-12px_rgba(180,140,40,0.35)]"
          >
            <button
              onClick={dismissWelcome}
              aria-label="Dismiss"
              className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-amber-200/60 text-amber-800/70"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 mb-3 pr-6">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 grid place-items-center shadow-md">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-amber-950 leading-tight">
                  Welcome back! Turn your notes into study super-powers.
                </h3>
                <p className="text-xs sm:text-sm text-amber-900/80 mt-0.5">
                  Upload your course outline, lecture notes, or past questions — we’ll generate flashcards, summaries & quizzes instantly.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-3 text-[11px] text-amber-900/80">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/70 border border-amber-200">
                <FileText className="w-3 h-3" /> PDF · DOCX · TXT
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/70 border border-amber-200">
                <Layers className="w-3 h-3" /> Auto Flashcards
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/70 border border-amber-200">
                <Brain className="w-3 h-3" /> AI Quizzes
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => goUpload("welcome")}
                className="inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-sm font-bold shadow-md flex-1 sm:flex-none"
              >
                <Upload className="w-4 h-4" /> Upload Now
              </button>
              <button
                onClick={dismissWelcome}
                className="px-3 h-10 rounded-xl text-sm font-semibold text-amber-900/80 hover:bg-amber-200/40"
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
            className="w-full group relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 text-left flex items-center gap-3 shadow-[0_4px_18px_-12px_rgba(180,140,40,0.3)] hover:shadow-[0_10px_26px_-14px_rgba(180,140,40,0.5)] transition-all"
          >
            <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 grid place-items-center shadow-md">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-sm sm:text-base font-bold text-foreground leading-tight">
                Upload Document
              </div>
              <div className="text-[11px] sm:text-xs text-muted-foreground leading-tight mt-0.5">
                Outlines, notes, past questions — generate flashcards & quizzes
              </div>
            </div>
            <span className="text-xs font-bold text-amber-700 shrink-0 group-hover:translate-x-0.5 transition-transform">
              Upload →
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </section>
  );
};

export default UploadCTABanner;
