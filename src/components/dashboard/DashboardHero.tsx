import { ReactNode, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Camera, Mail, Phone, MapPin, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type Role = "student" | "tutor" | "admin" | "school" | "parent";

const ROLE_PILL: Record<Role, { label: string }> = {
  student: { label: "Student" },
  tutor: { label: "Tutor" },
  admin: { label: "Administrator" },
  school: { label: "School" },
  parent: { label: "Guardian" },
};

interface ContactInfo {
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  joined?: string | null; // pre-formatted
}

interface DashboardHeroProps {
  role: Role;
  fullName?: string | null;
  avatarUrl?: string | null;
  /** Cover/banner image rendered behind the avatar. */
  coverUrl?: string | null;
  /** School / institution line (bold). */
  institution?: string | null;
  /** Department + level subtitle (e.g. "Computer Science • Level 300"). */
  meta?: ReactNode;
  /** Optional intro / greeting subtitle (used when meta is not provided). */
  subtitle?: ReactNode;
  /** Show verified check next to name */
  verified?: boolean;
  /** Show "Edit Profile" CTA inside the cover band */
  showEditProfile?: boolean;
  /** Contact strip beneath the card. Hidden if all fields are empty. */
  contact?: ContactInfo;
  /** Optional right-side slot for actions (replaces Edit Profile if provided) */
  actions?: ReactNode;
  /** Optional bottom slot below the contact strip */
  footer?: ReactNode;
  className?: string;
}

const initials = (name?: string | null) => {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
};

/**
 * Premium gold profile header inspired by LinkedIn-style cover cards.
 * Vibrant amber banner, large halo avatar, name + verified badge,
 * role pill, institution line, and an optional contact strip footer.
 */
export const DashboardHero = ({
  role,
  fullName,
  avatarUrl,
  coverUrl,
  institution,
  meta,
  subtitle,
  verified = true,
  showEditProfile = true,
  contact,
  actions,
  footer,
  className,
}: DashboardHeroProps) => {
  const pill = ROLE_PILL[role];
  const displayName = fullName || "Welcome";

  const MAX_RETRIES = 2;
  const [avatarRetry, setAvatarRetry] = useState(0);
  const [avatarStage, setAvatarStage] = useState<"primary" | "secondary" | "failed">("primary");
  const [coverRetry, setCoverRetry] = useState(0);
  const [coverStage, setCoverStage] = useState<"primary" | "failed">("primary");

  useEffect(() => {
    setAvatarRetry(0);
    setAvatarStage("primary");
  }, [avatarUrl]);

  useEffect(() => {
    setCoverRetry(0);
    setCoverStage("primary");
  }, [coverUrl]);

  // Secondary fallback avatar — deterministic DiceBear illustration based on name
  const secondaryAvatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    displayName
  )}&backgroundColor=fcd34d,fbbf24,f59e0b&fontFamily=Georgia`;

  const withCacheBust = (url: string, n: number) =>
    n > 0 ? `${url}${url.includes("?") ? "&" : "?"}cb=${n}-${Date.now()}` : url;

  const safeAvatarUrl =
    avatarStage === "primary" && avatarUrl
      ? withCacheBust(avatarUrl, avatarRetry)
      : avatarStage === "secondary"
      ? secondaryAvatarUrl
      : undefined;

  const safeCoverUrl =
    coverStage === "primary" && coverUrl ? withCacheBust(coverUrl, coverRetry) : undefined;

  const handleAvatarError = () => {
    if (avatarStage === "primary" && avatarRetry < MAX_RETRIES) {
      console.warn("[DashboardHero] avatar load failed, retrying", avatarRetry + 1, avatarUrl);
      setAvatarRetry((n) => n + 1);
    } else if (avatarStage === "primary") {
      console.warn("[DashboardHero] avatar primary exhausted, switching to secondary");
      setAvatarStage("secondary");
    } else {
      console.warn("[DashboardHero] avatar secondary failed, showing initials");
      setAvatarStage("failed");
    }
  };

  const handleCoverError = () => {
    if (coverStage === "primary" && coverRetry < MAX_RETRIES) {
      console.warn("[DashboardHero] cover load failed, retrying", coverRetry + 1, coverUrl);
      setCoverRetry((n) => n + 1);
    } else {
      console.warn("[DashboardHero] cover failed, falling back to gold gradient");
      setCoverStage("failed");
    }
  };

  const hasContact = !!(contact && (contact.email || contact.phone || contact.location || contact.joined));

  return (
    <motion.section
      aria-label={`${displayName} profile header`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-amber-200/60 bg-white",
        "shadow-[0_18px_50px_-22px_rgba(180,140,40,0.45)]",
        className
      )}
    >
      {/* === Gold cover band === */}
      <div className="relative h-40 sm:h-48 md:h-56 w-full overflow-hidden">
        {/* Base gold gradient — slightly darker for AA contrast against white text */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700" />
        {/* User cover image overlay */}
        {safeCoverUrl && (
          <img
            src={safeCoverUrl}
            alt={`${displayName}'s cover photo`}
            className="absolute inset-0 h-full w-full object-cover opacity-90"
            loading="eager"
            decoding="async"
            onError={() => setCoverFailed(true)}
          />
        )}
        {safeCoverUrl && (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/45 via-amber-600/35 to-amber-800/45" aria-hidden="true" />
        )}
        {/* Decorative flowing curves */}
        <svg
          aria-hidden="true"
          focusable="false"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-30"
          viewBox="0 0 800 200"
          preserveAspectRatio="none"
        >
          <path
            d="M0,150 C200,90 400,180 800,80 L800,200 L0,200 Z"
            fill="rgba(255,255,255,0.18)"
          />
          <path
            d="M0,170 C250,120 500,200 800,130"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M0,120 C300,60 550,160 800,60"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1"
            fill="none"
          />
        </svg>
        {/* Soft inner glow */}
        <div className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-white/25 blur-3xl" aria-hidden="true" />
        {/* Bottom-left scrim — boosts text contrast over busy cover photos */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/30 via-black/10 to-transparent"
          aria-hidden="true"
        />

        {/* Right-side action (Edit Profile / custom actions) */}
        <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-10">
          {actions
            ? actions
            : showEditProfile && (
                <Button
                  asChild
                  size="sm"
                  className="bg-white text-amber-800 hover:bg-amber-50 shadow-md font-semibold rounded-full px-4 sm:px-5 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-amber-600"
                >
                  <Link to="/profile/edit" aria-label="Edit your profile">
                    <Camera className="w-4 h-4 mr-1.5" aria-hidden="true" />
                    Edit Profile
                  </Link>
                </Button>
              )}
        </div>

        {/* === Profile content overlaid on the band === */}
        <div className="relative z-[1] h-full flex items-center px-5 sm:px-7 md:px-8 gap-4 sm:gap-5 md:gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-full bg-white/70 blur-md" aria-hidden />
            <Avatar className="relative h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 ring-4 ring-white shadow-xl">
              <AvatarImage
                key={safeAvatarUrl || "avatar-fallback"}
                src={safeAvatarUrl}
                alt={`${displayName}'s profile photo`}
                onError={() => setAvatarFailed(true)}
              />
              <AvatarFallback
                className="text-amber-700 font-bold text-2xl bg-gradient-to-br from-amber-100 to-amber-200"
                aria-label={`${displayName} initials`}
              >
                {initials(fullName)}
              </AvatarFallback>
            </Avatar>
            {/* online dot */}
            <span className="absolute bottom-1 left-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" aria-hidden="true" />
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0 text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}>
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">
                {displayName}
              </h1>
              {verified && (
                <BadgeCheck
                  className="h-5 w-5 sm:h-6 sm:w-6 text-white fill-amber-700/40 shrink-0"
                  aria-label="Verified account"
                  role="img"
                />
              )}
            </div>

            <div className="mt-1.5">
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white text-amber-800 text-xs font-semibold shadow-sm"
                style={{ textShadow: "none" }}
              >
                {pill.label}
              </span>
            </div>

            {institution && (
              <p className="mt-1.5 text-sm sm:text-[15px] font-semibold text-white truncate">
                {institution}
              </p>
            )}
            {meta ? (
              <p className="text-xs sm:text-sm text-white/95 truncate">{meta}</p>
            ) : subtitle ? (
              <p className="text-xs sm:text-sm text-white/95 truncate">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* === Contact strip === */}
      {hasContact && (
        <div className="px-5 sm:px-7 md:px-8 py-3.5 bg-white">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-muted-foreground">
            {contact?.email && (
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
            {contact?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-amber-600 shrink-0" />
                <span>{contact.phone}</span>
              </div>
            )}
            {contact?.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
                <span>{contact.location}</span>
              </div>
            )}
            {contact?.joined && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Joined {contact.joined}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {footer && (
        <div className="px-5 sm:px-7 md:px-8 py-4 border-t border-amber-100/70 bg-gradient-to-b from-white to-amber-50/30">
          {footer}
        </div>
      )}
    </motion.section>
  );
};

export default DashboardHero;
