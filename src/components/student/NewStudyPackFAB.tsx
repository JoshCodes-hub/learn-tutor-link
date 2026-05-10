import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles } from "lucide-react";

const ALLOWED_PREFIXES = ["/student/dashboard", "/study-hub", "/study-packs"];

export const NewStudyPackFAB = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, primaryRole } = useAuth();

  if (!user || primaryRole !== "student") return null;
  if (!ALLOWED_PREFIXES.some(p => location.pathname.startsWith(p))) return null;

  return (
    <motion.button
      type="button"
      onClick={() => navigate("/study-hub?upload=1")}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4, type: "spring", stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      aria-label="Create new Study Pack"
      className="fixed bottom-20 right-4 md:bottom-6 z-30 h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-[0_14px_30px_-10px_rgba(180,140,40,0.7)] flex flex-col items-center justify-center gap-0.5 active:shadow-[0_8px_18px_-8px_rgba(180,140,40,0.7)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Sparkles className="w-4 h-4" />
      <span className="text-[9px] font-bold leading-tight">New<br/>Study Pack</span>
    </motion.button>
  );
};

export default NewStudyPackFAB;
