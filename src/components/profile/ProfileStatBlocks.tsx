import { useProfileStats } from "@/hooks/useProfileStats";
import { Flame, Target, Layers, Sparkles, MessageSquare, Upload, Users, Star, Trophy, Loader2 } from "lucide-react";

interface Props {
  userId: string;
  role: "student" | "tutor" | "admin" | "school" | "parent";
}

function Stat({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-amber-100/70 bg-card px-4 py-3.5 flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-amber-700" />
      </div>
      <div className="min-w-0">
        <p className="font-display text-lg font-bold text-foreground tabular-nums leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1 truncate">{label}</p>
        {hint && <p className="text-[10px] text-muted-foreground/80">{hint}</p>}
      </div>
    </div>
  );
}

export function ProfileStatBlocks({ userId, role }: Props) {
  const { data: s, isLoading } = useProfileStats(userId);

  if (isLoading) {
    return (
      <section className="mt-6">
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-amber-600" /></div>
      </section>
    );
  }
  if (!s) return null;

  const studentBlocks = (
    <>
      <Stat icon={Target} label="Quiz accuracy" value={`${s.quiz_accuracy}%`} hint={`${s.quizzes_taken} attempts`} />
      <Stat icon={Layers} label="Flashcards reviewed" value={s.cards_reviewed} />
      <Stat icon={Flame} label="Current streak" value={`${s.current_streak}d`} hint={`Best ${s.longest_streak}d`} />
      <Stat icon={Sparkles} label="AI activity (30d)" value={s.ai_activity} />
      <Stat icon={MessageSquare} label="Engagement (30d)" value={s.engagement} hint="discussion messages" />
    </>
  );

  const tutorBlocks = (
    <>
      <Stat icon={Upload} label="Uploads" value={s.uploads_count} hint="quizzes + notes" />
      <Stat icon={Users} label="Students impacted" value={s.students_impacted} />
      <Stat icon={Trophy} label="Followers" value={s.followers_count} />
      <Stat icon={Star} label="Avg rating" value={s.avg_rating != null ? Number(s.avg_rating).toFixed(1) : "—"} />
      <Stat icon={MessageSquare} label="Engagement (30d)" value={s.engagement} hint="discussion messages" />
    </>
  );

  return (
    <section className="mt-6">
      <h2 className="font-serif text-xl font-semibold mb-3">
        {role === "tutor" ? "Tutor impact" : "Study stats"}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {role === "tutor" ? tutorBlocks : studentBlocks}
      </div>
    </section>
  );
}

export default ProfileStatBlocks;