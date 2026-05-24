import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

interface Scholar {
  user_id: string;
  full_name: string | null;
  profile_image_url: string | null;
  xp: number;
}

interface Props {
  university?: string;
}

/**
 * Calm compact spotlight row — top 3 scholars by XP (proxy: correct answers).
 * Reuses the same aggregation as TopScholarsCard, but with a lighter layout.
 */
export const StudentSpotlight = ({ university = "FUTA" }: Props) => {
  const navigate = useNavigate();
  const [scholars, setScholars] = useState<Scholar[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("user_id, correct_answers")
        .not("completed_at", "is", null);
      if (cancelled || !attempts) return;

      const totals = new Map<string, number>();
      for (const a of attempts as any[]) {
        totals.set(a.user_id, (totals.get(a.user_id) || 0) + (a.correct_answers || 0) * 10);
      }
      const top = [...totals.entries()]
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([user_id, xp]) => ({ user_id, xp }));
      if (!top.length) return;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, profile_image_url")
        .in("id", top.map((t) => t.user_id));

      if (cancelled) return;
      setScholars(
        top.map((t) => {
          const p = profiles?.find((p: any) => p.id === t.user_id);
          return {
            user_id: t.user_id,
            xp: t.xp,
            full_name: p?.full_name ?? "Student",
            profile_image_url: p?.profile_image_url ?? null,
          };
        })
      );
    })();
    return () => { cancelled = true; };
  }, []);

  if (scholars.length === 0) return null;

  return (
    <section aria-label="Student spotlight" className="mb-8">
      <div className="flex items-end justify-between mb-3 px-0.5">
        <div>
          <h2 className="font-display text-[15px] sm:text-base font-bold tracking-tight text-foreground">
            Student Spotlight
          </h2>
          <p className="text-[11.5px] text-muted-foreground mt-0.5">
            Top scholars this week
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/leaderboard")}
          className="text-[12px] font-bold text-amber-700 hover:text-amber-800"
        >
          See all
        </button>
      </div>

      <div className="rounded-2xl border border-amber-100/70 bg-card divide-y divide-amber-50">
        {scholars.map((s, i) => (
          <motion.div
            key={s.user_id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3 px-4 py-3"
          >
            <span className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-[12px] font-bold bg-amber-50 border border-amber-200 text-amber-800">
              {i + 1}
            </span>
            <Avatar className="h-9 w-9 ring-1 ring-amber-100">
              <AvatarImage src={s.profile_image_url ?? undefined} alt={s.full_name ?? ""} />
              <AvatarFallback className="bg-amber-100 text-amber-800 text-[12px] font-bold">
                {s.full_name?.charAt(0) ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold text-foreground truncate">
                {s.full_name}
              </div>
              <div className="text-[11px] text-muted-foreground">{university}</div>
            </div>
            <span className="inline-flex items-center gap-1 text-[12px] font-bold text-amber-700">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {s.xp}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default StudentSpotlight;