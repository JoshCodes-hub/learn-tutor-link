import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Target, Trophy, Clock, Coins, CheckCircle2, Loader2 } from "lucide-react";

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  goal_type: string;
  goal_value: number;
  reward_tokens: number;
  starts_at: string;
  ends_at: string;
}

interface ChallengeProgress {
  challenge_id: string;
  current_progress: number;
  completed: boolean;
  reward_claimed: boolean;
}

export const TeamChallenges = () => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [progress, setProgress] = useState<Record<string, ChallengeProgress>>({});
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchChallenges();
    }
  }, [user]);

  const fetchChallenges = async () => {
    if (!user) return;

    try {
      // Get user's team
      const { data: membership } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (membership) {
        setTeamId(membership.team_id);

        // Fetch active challenges
        const { data: challengesData } = await supabase
          .from("team_challenges")
          .select("*")
          .eq("is_active", true)
          .lte("starts_at", new Date().toISOString())
          .gte("ends_at", new Date().toISOString())
          .order("ends_at", { ascending: true });

        if (challengesData) {
          setChallenges(challengesData);

          // Fetch progress for this team
          const { data: progressData } = await supabase
            .from("team_challenge_progress")
            .select("*")
            .eq("team_id", membership.team_id)
            .in("challenge_id", challengesData.map(c => c.id));

          if (progressData) {
            const progressMap: Record<string, ChallengeProgress> = {};
            progressData.forEach(p => {
              progressMap[p.challenge_id] = p;
            });
            setProgress(progressMap);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching challenges:", error);
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async (challenge: Challenge) => {
    if (!user || !teamId) return;

    const challengeProgress = progress[challenge.id];
    if (!challengeProgress?.completed || challengeProgress.reward_claimed) return;

    setClaiming(challenge.id);

    try {
      // Update progress to mark reward as claimed
      const { error: updateError } = await supabase
        .from("team_challenge_progress")
        .update({ reward_claimed: true })
        .eq("challenge_id", challenge.id)
        .eq("team_id", teamId);

      if (updateError) throw updateError;

      // Award tokens to user's wallet
      const { data: wallet } = await supabase
        .from("token_wallets")
        .select("id, balance, total_earned")
        .eq("user_id", user.id)
        .single();

      if (wallet) {
        await supabase
          .from("token_wallets")
          .update({
            balance: wallet.balance + challenge.reward_tokens,
            total_earned: wallet.total_earned + challenge.reward_tokens
          })
          .eq("id", wallet.id);

        await supabase.from("token_transactions").insert({
          wallet_id: wallet.id,
          amount: challenge.reward_tokens,
          type: "challenge_reward",
          description: `Team challenge reward: ${challenge.title}`
        });
      }

      toast.success(`Claimed ${challenge.reward_tokens} tokens!`);
      
      // Update local state
      setProgress(prev => ({
        ...prev,
        [challenge.id]: { ...prev[challenge.id], reward_claimed: true }
      }));
    } catch (error: any) {
      toast.error(error.message || "Failed to claim reward");
    } finally {
      setClaiming(null);
    }
  };

  const getGoalLabel = (type: string) => {
    switch (type) {
      case "quizzes_completed": return "quizzes";
      case "total_score": return "points";
      case "accuracy": return "% accuracy";
      default: return "";
    }
  };

  const getTimeRemaining = (endsAt: string) => {
    const end = new Date(endsAt);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return "Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!teamId) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            Team Challenges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Join a team to participate in challenges!
          </p>
        </CardContent>
      </Card>
    );
  }

  if (challenges.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            Team Challenges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No active challenges right now. Check back soon!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="w-5 h-5 text-primary" />
          Team Challenges
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {challenges.map(challenge => {
          const challengeProgress = progress[challenge.id];
          const currentValue = challengeProgress?.current_progress || 0;
          const progressPercent = Math.min((currentValue / challenge.goal_value) * 100, 100);
          const isCompleted = challengeProgress?.completed || false;
          const isClaimed = challengeProgress?.reward_claimed || false;

          return (
            <div 
              key={challenge.id} 
              className={`p-4 rounded-lg border ${isCompleted ? 'bg-success/5 border-success/30' : 'bg-muted/30 border-border'}`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    )}
                    <h4 className="font-medium">{challenge.title}</h4>
                  </div>
                  {challenge.description && (
                    <p className="text-sm text-muted-foreground mt-1">{challenge.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-accent text-sm font-medium whitespace-nowrap">
                  <Coins className="w-4 h-4" />
                  {challenge.reward_tokens}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {currentValue.toLocaleString()} / {challenge.goal_value.toLocaleString()} {getGoalLabel(challenge.goal_type)}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {getTimeRemaining(challenge.ends_at)}
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>

              {isCompleted && !isClaimed && (
                <Button 
                  size="sm" 
                  className="w-full mt-3"
                  onClick={() => claimReward(challenge)}
                  disabled={claiming === challenge.id}
                >
                  {claiming === challenge.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Coins className="w-4 h-4 mr-2" />
                  )}
                  Claim Reward
                </Button>
              )}

              {isClaimed && (
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  Reward Claimed
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
