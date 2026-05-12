import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UserCog, ArrowRight, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getProfileCompleteness } from "@/lib/profileCompleteness";

interface CompleteProfileCardProps {
  profile: any;
  onDismiss?: () => void;
}

export const CompleteProfileCard = ({ profile, onDismiss }: CompleteProfileCardProps) => {
  const navigate = useNavigate();

  const { missing, percent } = useMemo(() => getProfileCompleteness(profile), [profile]);
  // Persistent dismissal: once a user dismisses (or finishes), it never nags again.
  const dismissKey = profile?.id ? `complete-profile-dismissed:${profile.id}` : null;
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined" || !dismissKey) return false;
    return localStorage.getItem(dismissKey) === "1";
  });

  // Auto-mark as permanently dismissed once the profile is complete so we don't re-show
  // even if the user later clears a field.
  useEffect(() => {
    if (dismissKey && missing.length === 0) {
      localStorage.setItem(dismissKey, "1");
    }
  }, [dismissKey, missing.length]);

  const handleDismiss = () => {
    if (dismissKey) localStorage.setItem(dismissKey, "1");
    setDismissed(true);
    onDismiss?.();
  };

  if (missing.length === 0 || dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-white to-amber-50/40 p-5 md:p-6 shadow-[0_8px_30px_-12px_rgba(180,140,40,0.25)] mb-6"
    >
      <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl" />
      <button
        onClick={handleDismiss}
        aria-label="Dismiss reminder"
        title="Don't show this again"
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-amber-100 text-amber-700 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="relative flex items-start gap-4">
        <div className="shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
          <UserCog className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-lg md:text-xl font-semibold text-foreground">
            Complete your profile
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            A complete profile unlocks tutor matching, leaderboards & personalized recommendations.
          </p>

          <div className="mt-3 flex items-center gap-3">
            <Progress value={percent} className="h-2 flex-1" />
            <span className="text-xs font-semibold text-amber-700 tabular-nums">{percent}%</span>
          </div>

          <ul className="mt-3 flex flex-wrap gap-1.5">
            {missing.slice(0, 5).map((f) => (
              <li
                key={f.key}
                className="text-[11px] px-2 py-1 rounded-full bg-white/80 border border-amber-200 text-amber-900 font-medium"
              >
                {f.label}
              </li>
            ))}
            {missing.length > 5 && (
              <li className="text-[11px] px-2 py-1 rounded-full bg-white/80 border border-amber-200 text-amber-900 font-medium">
                +{missing.length - 5} more
              </li>
            )}
          </ul>

          <div className="mt-4 flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => navigate("/profile/edit")}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md"
            >
              Complete now
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Takes ~2 minutes
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CompleteProfileCard;
