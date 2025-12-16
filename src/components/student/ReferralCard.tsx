import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Copy, Users, Gift, CheckCircle, Clock, Share2 } from "lucide-react";

interface ReferralStats {
  referralCode: string | null;
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalEarned: number;
}

export const ReferralCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<ReferralStats>({
    referralCode: null,
    totalReferrals: 0,
    completedReferrals: 0,
    pendingReferrals: 0,
    totalEarned: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchReferralStats();
    }
  }, [user]);

  const fetchReferralStats = async () => {
    try {
      // Get referral code from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", user?.id)
        .single();

      // Get referral rewards stats
      const { data: rewards } = await supabase
        .from("referral_rewards")
        .select("*")
        .eq("referrer_id", user?.id);

      const completedReferrals = rewards?.filter(r => r.status === "completed") || [];
      const pendingReferrals = rewards?.filter(r => r.status === "pending") || [];
      const totalEarned = completedReferrals.reduce((sum, r) => sum + r.referrer_tokens, 0);

      setStats({
        referralCode: profile?.referral_code || null,
        totalReferrals: rewards?.length || 0,
        completedReferrals: completedReferrals.length,
        pendingReferrals: pendingReferrals.length,
        totalEarned,
      });
    } catch (error) {
      console.error("Error fetching referral stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (stats.referralCode) {
      await navigator.clipboard.writeText(stats.referralCode);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
    }
  };

  const shareReferral = async () => {
    const shareUrl = `${window.location.origin}/auth?ref=${stats.referralCode}`;
    const shareText = `Join OverraPrep AI and get bonus tokens! Use my referral code: ${stats.referralCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join OverraPrep AI",
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or share failed, copy to clipboard instead
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link Copied!",
          description: "Share link copied to clipboard",
        });
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied!",
        description: "Share link copied to clipboard",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Invite Friends & Earn Tokens
        </CardTitle>
        <CardDescription>
          Share your referral code and earn 10 tokens when friends complete their first quiz!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Referral Code */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Referral Code</label>
          <div className="flex gap-2">
            <Input
              value={stats.referralCode || ""}
              readOnly
              className="font-mono text-lg font-bold tracking-wider"
            />
            <Button variant="outline" size="icon" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="default" size="icon" onClick={shareReferral}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-background/50">
            <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats.totalReferrals}</p>
            <p className="text-xs text-muted-foreground">Total Referrals</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-background/50">
            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold text-green-600">{stats.completedReferrals}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-background/50">
            <Clock className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
            <p className="text-2xl font-bold text-yellow-600">{stats.pendingReferrals}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-background/50">
            <Gift className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-primary">{stats.totalEarned}</p>
            <p className="text-xs text-muted-foreground">Tokens Earned</p>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">How it works:</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Share your referral code with friends</li>
            <li>They sign up using your code</li>
            <li>When they complete their first quiz, you both earn tokens!</li>
          </ol>
          <div className="flex gap-2 mt-3">
            <Badge variant="secondary">You get: 10 tokens</Badge>
            <Badge variant="outline">Friend gets: 5 tokens</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
