import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStudentCommunity } from "@/hooks/useTutorCommunity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserPlus,
  Loader2,
  ExternalLink,
  LogOut,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export function MyCommunities() {
  const navigate = useNavigate();
  const { communities, isLoading, joinCommunity, leaveCommunity } = useStudentCommunity();
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      toast.error("Please enter an invite code");
      return;
    }

    setIsJoining(true);
    const success = await joinCommunity(inviteCode.trim());
    setIsJoining(false);

    if (success) {
      setShowJoinDialog(false);
      setInviteCode("");
    }
  };

  const handleLeave = async (communityId: string) => {
    await leaveCommunity(communityId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                My Communities
              </CardTitle>
              <CardDescription>
                Access quizzes shared by your tutors
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowJoinDialog(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Join
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {communities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium mb-2">No communities yet</p>
              <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                Join a tutor's community with an invite code to access shared quizzes.
              </p>
              <Button onClick={() => setShowJoinDialog(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Join Community
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {communities.map((community) => (
                <div
                  key={community.id}
                  className="p-4 bg-card rounded-lg border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={community.tutor?.profile_image_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {community.tutor?.full_name?.charAt(0) || "T"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">
                          {community.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          by {community.tutor?.full_name || "Tutor"}
                        </p>
                        {community.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {community.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => navigate(`/community/${community.id}`)}
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleLeave(community.id)}
                      >
                        <LogOut className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Join Community Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join a Community</DialogTitle>
            <DialogDescription>
              Enter the invite code from your tutor to join their community.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                placeholder="e.g., COM-ABC123"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Ask your tutor for their community invite code
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleJoin} disabled={isJoining}>
              {isJoining && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Join Community
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
