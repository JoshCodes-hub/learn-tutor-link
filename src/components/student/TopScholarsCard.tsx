import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BarChart3, Medal } from "lucide-react";

interface Scholar {
  user_id: string;
  full_name: string | null;
  profile_image_url: string | null;
  xp: number;
}

const MEDAL_BG = ["bg-amber-400", "bg-slate-300", "bg-orange-400"];

export const TopScholarsCard = () => {
  const navigate = useNavigate();
  const [scholars, setScholars] = useState<Scholar[]>([]);

  useEffect(() => {
    (async () => {
      // Aggregate XP from quiz_attempts (correct answers as proxy)
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("user_id, correct_answers")
        .not("completed_at", "is", null);

      if (!attempts) return;

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
        .in("id", top.map(t => t.user_id));

      setScholars(
        top.map(t => {
          const p = profiles?.find((p: any) => p.id === t.user_id);
          return { user_id: t.user_id, xp: t.xp, full_name: p?.full_name ?? "Student", profile_image_url: p?.profile_image_url ?? null };
        })
      );
    })();
  }, []);

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-4 sm:p-5 shadow-[0_4px_18px_-12px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-amber-600" />
        <h3 className="font-display text-sm sm:text-[15px] font-bold text-foreground">Top Scholars This Week</h3>
      </div>

      {scholars.length === 0 ? (
        <p className="text-xs text-muted-foreground py-6 text-center">No scholar data yet — be the first!</p>
      ) : (
        <ul className="space-y-2.5">
          {scholars.map((s, i) => (
            <li key={s.user_id} className="flex items-center gap-3">
              <span className={`shrink-0 h-6 w-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center ${MEDAL_BG[i]}`}>
                {i + 1}
              </span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={s.profile_image_url ?? undefined} alt={s.full_name ?? ""} />
                <AvatarFallback className="text-[11px] bg-amber-100 text-amber-800">
                  {s.full_name?.charAt(0) ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-foreground truncate">{s.full_name}</div>
              </div>
              <div className="text-[12px] font-bold text-amber-700">{s.xp} XP</div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => navigate("/leaderboard")}
        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-50 text-amber-800 text-[12px] font-bold hover:bg-amber-100 transition-colors"
      >
        <Medal className="w-3.5 h-3.5" /> View Leaderboard
      </button>
    </div>
  );
};

export default TopScholarsCard;
