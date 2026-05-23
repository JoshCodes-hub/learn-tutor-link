import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bell,
  Flame,
  Camera,
  Loader2,
  LogOut,
  Sparkles,
  ArrowRight,
  GraduationCap,
  RefreshCw,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { uploadToBucketWithVerification } from "@/lib/storageUpload";
import { toast } from "@/hooks/use-toast";
import { LevelSwitcherDialog } from "@/components/student/LevelSwitcherDialog";
import { useStudentLevel } from "@/hooks/useStudentLevel";
import { computeGlobalReadiness } from "@/lib/examReadiness";

/**
 * SignatureHero — the dashboard's anchor card on mobile.
 * One glorious gold-trimmed hero that combines greeting, profile avatar,
 * exam readiness ring, streak, level pill and a primary "Continue" CTA
 * so the student lands on a single, focused command center instead of a
 * wall of stacked cards.
 */
export const SignatureHero = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { level } = useStudentLevel();

  const [streak, setStreak] = useState(0);
  const [unread, setUnread] = useState(0);
  const [readiness, setReadiness] = useState<number | null>(null);
  const [continueTo, setContinueTo] = useState<{ to: string; label: string; sub?: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [localAvatar, setLocalAvatar] = useState<string | null>(() => {
    try { return localStorage.getItem("overra.avatar.last"); } catch { return null; }
  });
  const [levelOpen, setLevelOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    try {
      const cached = localStorage.getItem(`overra.avatar.${user.id}`);
      if (cached) setLocalAvatar(cached);
    } catch { /* noop */ }
  }, [user?.id]);

  useEffect(() => {
    const url = profile?.avatar_url || (profile as any)?.profile_image_url;
    if (!url || !user) return;
    try {
      localStorage.setItem(`overra.avatar.${user.id}`, url);
      localStorage.setItem("overra.avatar.last", url);
    } catch { /* noop */ }
  }, [profile?.avatar_url, user?.id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoadError(null);
    (async () => {
      try {
        const [sRes, nRes, aRes] = await Promise.all([
          (supabase as any)
            .from("study_streaks")
            .select("current_streak")
            .eq("user_id", user.id)
            .maybeSingle(),
          (supabase as any)
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false),
          (supabase as any)
            .from("quiz_attempts")
            .select("quiz_id, completed_at, quizzes(id, title, is_active)")
            .eq("user_id", user.id)
            .order("started_at", { ascending: false })
            .limit(1),
        ]);

        if (sRes?.error) throw sRes.error;
        if (nRes?.error) throw nRes.error;
        if (aRes?.error) throw aRes.error;

        let r = 0;
        try {
          const res = await computeGlobalReadiness(user.id, {
            level: ((profile as any)?.level as string | null | undefined) ?? null,
          });
          r = res.score ?? 0;
        } catch { /* readiness is best-effort */ }

        if (cancelled) return;
        setStreak(sRes?.data?.current_streak ?? 0);
        setUnread(nRes?.count ?? 0);
        setReadiness(r);

        // Smart Continue CTA with safe fallback to quiz catalog
        const last = aRes?.data?.[0];
        const activeQuiz = last?.quizzes?.is_active && last?.quizzes?.id ? last.quizzes : null;
        if (activeQuiz) {
          setContinueTo({
            to: `/quiz/${activeQuiz.id}/practice`,
            label: last?.completed_at ? "Retake quiz" : "Continue quiz",
            sub: activeQuiz.title,
          });
        } else if (last?.quiz_id) {
          // Last attempt's quiz no longer active → browse catalog
          setContinueTo({ to: "/courses", label: "Browse quizzes", sub: "Pick your next challenge" });
        } else {
          setContinueTo({ to: "/courses", label: "Start your first quiz", sub: "Browse the catalog" });
        }
      } catch (err: any) {
        if (cancelled) return;
        console.error("SignatureHero load failed:", err);
        setLoadError(err?.message || "Couldn't load your dashboard data.");
        // Always give the user a safe CTA
        setContinueTo({ to: "/courses", label: "Browse quizzes", sub: "Pick your next challenge" });
        toast({
          title: "We couldn't refresh your stats",
          description: "Check your connection and tap Retry.",
          variant: "destructive",
        });
      }
    })();
    return () => { cancelled = true; };
  }, [user, profile, reloadKey]);

  const handleRetry = useCallback(async () => {
    setReloading(true);
    setReloadKey((k) => k + 1);
    // Give effect a tick to run before clearing the spinner
    setTimeout(() => setReloading(false), 600);
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const avatarSrc = localAvatar || profile?.avatar_url || undefined;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Image only", description: "Please pick an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Too large", description: "Keep it under 2MB.", variant: "destructive" });
      return;
    }
    const preview = URL.createObjectURL(file);
    setLocalAvatar(preview);
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { publicUrl } = await uploadToBucketWithVerification({ bucket: "avatars", path, file });
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl } as any)
        .eq("id", user.id);
      if (updateErr) throw updateErr;
      setLocalAvatar(publicUrl);
      try {
        localStorage.setItem(`overra.avatar.${user.id}`, publicUrl);
        localStorage.setItem("overra.avatar.last", publicUrl);
      } catch { /* noop */ }
      await refreshProfile();
      toast({ title: "Profile picture updated" });
    } catch (err: any) {
      console.error(err);
      setLocalAvatar(null);
      toast({ title: "Upload failed", description: err?.message || "Try again.", variant: "destructive" });
    } finally {
      URL.revokeObjectURL(preview);
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm("Sign out of OverraPrep?")) return;
    await signOut();
    navigate("/auth");
  };

  // Readiness ring math
  const r = readiness ?? 0;
  const C = 2 * Math.PI * 22;
  const dashOff = C - (r / 100) * C;
  const ringColor =
    r >= 75 ? "stroke-emerald-500" : r >= 50 ? "stroke-amber-400" : "stroke-rose-400";

  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Today's command center"
      className="sm:hidden mb-5 relative overflow-hidden rounded-[28px] border border-amber-200/70 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white shadow-[0_22px_50px_-22px_rgba(180,140,40,0.55)]"
    >
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-12 w-52 h-52 rounded-full bg-amber-300/30 blur-3xl" />
      {/* Ornament filigree */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-30"
        viewBox="0 0 400 260"
        preserveAspectRatio="none"
      >
        <path d="M0,200 C100,140 200,230 400,120 L400,260 L0,260 Z" fill="rgba(255,255,255,0.15)" />
        <path d="M0,220 C120,170 240,240 400,170" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" fill="none" />
        <circle cx="340" cy="40" r="2" fill="rgba(255,255,255,0.7)" />
        <circle cx="360" cy="60" r="1.5" fill="rgba(255,255,255,0.5)" />
        <circle cx="320" cy="70" r="1" fill="rgba(255,255,255,0.6)" />
      </svg>

      {/* Top row: avatar + greeting + actions */}
      <div className="relative px-4 pt-4 flex items-start gap-3">
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Change profile picture"
            className="relative rounded-full p-[2px] bg-gradient-to-br from-white via-amber-100 to-amber-300 shadow-lg active:scale-95 transition"
          >
            <Avatar className="h-12 w-12 ring-2 ring-white/80">
              <AvatarImage src={avatarSrc} alt={profile?.full_name || ""} />
              <AvatarFallback className="bg-white text-amber-700 font-bold">
                {firstName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-white ring-2 ring-amber-600 flex items-center justify-center shadow">
              {uploading ? (
                <Loader2 className="h-3 w-3 text-amber-700 animate-spin" />
              ) : (
                <Camera className="h-3 w-3 text-amber-700" strokeWidth={2.5} />
              )}
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        <div className="flex-1 min-w-0" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.18)" }}>
          <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-amber-100/95 leading-none">
            {greeting}
          </p>
          <h1 className="font-display text-[22px] font-extrabold tracking-tight leading-tight mt-1 truncate">
            {firstName} <span aria-hidden>👋</span>
          </h1>
          <p className="text-[11.5px] text-white/90 leading-tight mt-0.5 truncate">
            {[
              (profile as any)?.department,
              (profile as any)?.level ? `Level ${(profile as any).level}` : null,
            ].filter(Boolean).join(" • ") || "Let's make today count."}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            aria-label={`Updates${unread ? `, ${unread} unread` : ""}`}
            className="relative h-9 w-9 rounded-full bg-white/15 backdrop-blur border border-white/30 flex items-center justify-center hover:bg-white/25 active:scale-95 transition"
          >
            <Bell className="h-4 w-4 text-white" strokeWidth={2} />
            {unread > 0 && (
              <span
                aria-hidden
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-amber-700 text-[10px] font-bold flex items-center justify-center ring-2 ring-amber-600"
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign out"
            className="h-9 w-9 rounded-full bg-white/15 backdrop-blur border border-white/30 flex items-center justify-center hover:bg-white/25 active:scale-95 transition"
          >
            <LogOut className="h-4 w-4 text-white" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Readiness + streak panel */}
      <div className="relative mx-4 mt-4 rounded-2xl bg-white/12 backdrop-blur-md border border-white/25 px-3.5 py-3 flex items-center gap-3">
        <div className="relative w-14 h-14 shrink-0">
          <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
            <circle cx="28" cy="28" r="22" className="stroke-white/25" strokeWidth="5" fill="none" />
            <circle
              cx="28" cy="28" r="22"
              className={ringColor}
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={dashOff}
              style={{ transition: "stroke-dashoffset 1.1s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-[15px] font-extrabold text-white tabular-nums leading-none">
              {Math.round(r)}<span className="text-[9px] font-bold opacity-80">%</span>
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0" style={{ textShadow: "0 1px 1px rgba(0,0,0,0.18)" }}>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-100/90 leading-none">
            Exam readiness
          </p>
          <p className="text-[13px] font-semibold text-white leading-tight mt-1">
            {r >= 75 ? "On track for success" : r >= 50 ? "Building momentum" : r > 0 ? "Keep practicing" : "Start your journey"}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-amber-700 text-[10.5px] font-bold shadow-sm" style={{ textShadow: "none" }}>
              <Flame className="h-3 w-3" />
              {streak > 0 ? `${streak}-day streak` : "Start streak"}
            </span>
            <button
              type="button"
              onClick={() => setLevelOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-white text-[10.5px] font-bold hover:bg-white/30 transition"
              style={{ textShadow: "none" }}
            >
              <GraduationCap className="h-3 w-3" />
              {level ? `${level} Lv` : "Set level"}
            </button>
          </div>
        </div>
      </div>

      {/* Primary CTA */}
      <div className="relative px-4 pt-3 pb-4">
        <button
          type="button"
          onClick={() => continueTo && navigate(continueTo.to)}
          className="group w-full flex items-center gap-3 rounded-2xl bg-white text-amber-800 px-4 py-3 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.35)] hover:shadow-[0_12px_28px_-10px_rgba(0,0,0,0.4)] active:scale-[0.98] transition-all"
        >
          <span className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-md">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="flex-1 min-w-0 text-left">
            <span className="block font-display text-[14px] font-extrabold leading-none">
              {continueTo?.label ?? "Start your first quiz"}
            </span>
            {continueTo?.sub && (
              <span className="block text-[11px] font-medium text-amber-700/80 truncate mt-0.5">
                {continueTo.sub}
              </span>
            )}
          </span>
          <ArrowRight className="h-4 w-4 text-amber-700 group-hover:translate-x-0.5 transition-transform" />
        </button>
        {loadError && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={reloading}
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/15 backdrop-blur border border-white/30 text-white text-[11.5px] font-semibold py-2 hover:bg-white/25 active:scale-[0.98] transition disabled:opacity-60"
            aria-label="Retry loading dashboard data"
          >
            {reloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {reloading ? "Retrying…" : "Couldn't load stats — Retry"}
          </button>
        )}
      </div>

      <LevelSwitcherDialog open={levelOpen} onOpenChange={setLevelOpen} />
    </motion.section>
  );
};

export default SignatureHero;