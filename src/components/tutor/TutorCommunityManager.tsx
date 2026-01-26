import { useState } from "react";
import { useTutorCommunity } from "@/hooks/useTutorCommunity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Copy,
  Check,
  Plus,
  Settings,
  Share2,
  Loader2,
  BookOpen,
  Clock,
  Brain,
  Coins,
  X,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  is_premium: boolean;
  token_cost: number;
  question_count: number;
  duration_minutes: number;
  course: { code: string; name: string };
}

interface TutorCommunityManagerProps {
  quizzes: Quiz[];
}

export function TutorCommunityManager({ quizzes }: TutorCommunityManagerProps) {
  const {
    community,
    members,
    sharedQuizzes,
    isLoading,
    createCommunity,
    updateCommunity,
    shareQuiz,
    unshareQuiz,
  } = useTutorCommunity();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Community name is required");
      return;
    }

    setIsSubmitting(true);
    await createCommunity(name.trim(), description.trim());
    setIsSubmitting(false);
    setShowCreateDialog(false);
    setName("");
    setDescription("");
  };

  const handleEdit = async () => {
    if (!name.trim()) {
      toast.error("Community name is required");
      return;
    }

    setIsSubmitting(true);
    await updateCommunity(name.trim(), description.trim());
    setIsSubmitting(false);
    setShowEditDialog(false);
  };

  const handleShare = async () => {
    if (!selectedQuizId) {
      toast.error("Please select a quiz");
      return;
    }

    setIsSubmitting(true);
    await shareQuiz(selectedQuizId, shareMessage.trim());
    setIsSubmitting(false);
    setShowShareDialog(false);
    setSelectedQuizId("");
    setShareMessage("");
  };

  const copyInviteCode = () => {
    if (community) {
      navigator.clipboard.writeText(community.invite_code);
      setCopied(true);
      toast.success("Invite code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyShareLink = (quizId: string) => {
    const url = `${window.location.origin}/quiz/${quizId}/practice`;
    navigator.clipboard.writeText(url);
    toast.success("Quiz link copied!");
  };

  const openEditDialog = () => {
    if (community) {
      setName(community.name);
      setDescription(community.description || "");
      setShowEditDialog(true);
    }
  };

  // Filter quizzes that haven't been shared yet
  const unsharedQuizzes = quizzes.filter(
    (q) => !sharedQuizzes.some((s) => s.quiz_id === q.id)
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!community) {
    return (
      <>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">
              Create Your Community
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              Build a community where you can share quizzes directly with your students for easy access.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Community
            </Button>
          </CardContent>
        </Card>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Your Community</DialogTitle>
              <DialogDescription>
                Set up a community where students can join and access your shared quizzes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Community Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Physics Study Group"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What's your community about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Community
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {community.name}
              </CardTitle>
              <CardDescription>
                {community.description || "Your tutor community"}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={openEditDialog}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invite Code Section */}
          <div className="p-4 bg-muted/30 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Invite Code</p>
                <p className="font-mono text-lg font-bold text-primary">
                  {community.invite_code}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={copyInviteCode}>
                {copied ? (
                  <Check className="w-4 h-4 mr-2 text-success" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Share this code with your students so they can join your community
            </p>
          </div>

          {/* Members Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-foreground">
                Members ({members.length})
              </h4>
            </div>

            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No members yet. Share your invite code to get started!
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {members.slice(0, 10).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full"
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={member.profile?.profile_image_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {member.profile?.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {member.profile?.full_name || "Student"}
                    </span>
                  </div>
                ))}
                {members.length > 10 && (
                  <Badge variant="secondary">+{members.length - 10} more</Badge>
                )}
              </div>
            )}
          </div>

          {/* Shared Quizzes Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-foreground">
                Shared Quizzes ({sharedQuizzes.length})
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShareDialog(true)}
                disabled={unsharedQuizzes.length === 0}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Quiz
              </Button>
            </div>

            {sharedQuizzes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No quizzes shared yet. Share a quiz to make it easily accessible to your community.
              </p>
            ) : (
              <div className="space-y-3">
                {sharedQuizzes.map((shared) => (
                  <div
                    key={shared.id}
                    className="p-4 bg-card rounded-lg border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            {shared.quiz?.course?.code || "Quiz"}
                          </Badge>
                          {shared.quiz?.is_premium && (
                            <Badge variant="outline" className="text-xs">
                              <Coins className="w-3 h-3 mr-1" />
                              {shared.quiz.token_cost}
                            </Badge>
                          )}
                        </div>
                        <h5 className="font-medium text-foreground truncate">
                          {shared.quiz?.title || "Quiz"}
                        </h5>
                        {shared.message && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {shared.message}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Brain className="w-3 h-3" />
                            {shared.quiz?.question_count} questions
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {shared.quiz?.duration_minutes} min
                          </span>
                          <span>
                            Shared {formatDistanceToNow(new Date(shared.shared_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyShareLink(shared.quiz_id)}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => unshareQuiz(shared.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Community Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Community</DialogTitle>
            <DialogDescription>
              Update your community details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Community Name *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Quiz Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Quiz to Community</DialogTitle>
            <DialogDescription>
              Select a quiz to share with your community members.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Quiz *</Label>
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
                {unsharedQuizzes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    All your quizzes are already shared
                  </p>
                ) : (
                  unsharedQuizzes.map((quiz) => (
                    <button
                      key={quiz.id}
                      type="button"
                      onClick={() => setSelectedQuizId(quiz.id)}
                      className={`w-full p-3 text-left rounded-lg border transition-colors ${
                        selectedQuizId === quiz.id
                          ? "border-primary bg-primary/5"
                          : "border-transparent hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {quiz.course.code}
                        </Badge>
                        {quiz.is_premium && (
                          <Badge variant="outline" className="text-xs">
                            <Coins className="w-3 h-3 mr-1" />
                            {quiz.token_cost}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-foreground">{quiz.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {quiz.question_count} questions • {quiz.duration_minutes} min
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="share-message">Message (optional)</Label>
              <Textarea
                id="share-message"
                placeholder="Add a message for your community..."
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleShare} disabled={isSubmitting || !selectedQuizId}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Share Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
