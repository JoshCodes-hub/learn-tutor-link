import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Trophy, Award, Star, Flame, Zap, Crown, Clock, 
  MessageCircle, Medal, GraduationCap, Loader2, Lock 
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
}

interface UserAchievement {
  achievement_id: string;
  earned_at: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  award: Award,
  star: Star,
  flame: Flame,
  zap: Zap,
  crown: Crown,
  clock: Clock,
  "message-circle": MessageCircle,
  medal: Medal,
  "graduation-cap": GraduationCap,
};

export const Achievements = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [earnedIds, setEarnedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAchievements();
    }
  }, [user]);

  const fetchAchievements = async () => {
    try {
      const [{ data: allAchievements }, { data: userAchievements }] = await Promise.all([
        supabase.from("achievements").select("*").order("requirement_value"),
        supabase.from("user_achievements").select("achievement_id, earned_at").eq("user_id", user?.id)
      ]);

      if (allAchievements) {
        setAchievements(allAchievements);
      }

      if (userAchievements) {
        setEarnedIds(new Set(userAchievements.map(ua => ua.achievement_id)));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "milestone": return "bg-blue-500/10 text-blue-500 border-blue-500/30";
      case "performance": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
      case "streak": return "bg-orange-500/10 text-orange-500 border-orange-500/30";
      case "community": return "bg-purple-500/10 text-purple-500 border-purple-500/30";
      case "competition": return "bg-green-500/10 text-green-500 border-green-500/30";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const earnedCount = earnedIds.size;
  const totalCount = achievements.length;
  const progressPercent = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
            <Award className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Achievements</h2>
            <p className="text-sm text-muted-foreground">
              {earnedCount}/{totalCount} unlocked ({progressPercent}%)
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-10 gap-3">
        {achievements.map((achievement) => {
          const Icon = iconMap[achievement.icon] || Trophy;
          const isEarned = earnedIds.has(achievement.id);
          const colorClass = isEarned ? getCategoryColor(achievement.category) : "bg-muted/50 text-muted-foreground border-border opacity-50";

          return (
            <Tooltip key={achievement.id}>
              <TooltipTrigger asChild>
                <div
                  className={`relative w-full aspect-square rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all hover:scale-105 ${colorClass}`}
                >
                  {isEarned ? (
                    <Icon className="w-6 h-6" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <p className="font-semibold">{achievement.name}</p>
                <p className="text-xs text-muted-foreground">{achievement.description}</p>
                {!isEarned && (
                  <p className="text-xs text-primary mt-1">🔒 Not yet unlocked</p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};
