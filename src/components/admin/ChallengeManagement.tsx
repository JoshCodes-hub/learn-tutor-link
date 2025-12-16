import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Target, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  goal_type: string;
  goal_value: number;
  reward_tokens: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_at: string;
}

export const ChallengeManagement = () => {
  const { logAction } = useAuditLog();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalType, setGoalType] = useState("quizzes_completed");
  const [goalValue, setGoalValue] = useState("");
  const [rewardTokens, setRewardTokens] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from("team_challenges")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      toast.error("Failed to load challenges");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setGoalType("quizzes_completed");
    setGoalValue("");
    setRewardTokens("");
    setStartsAt("");
    setEndsAt("");
    setIsActive(true);
    setEditingChallenge(null);
  };

  const openEditDialog = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setTitle(challenge.title);
    setDescription(challenge.description || "");
    setGoalType(challenge.goal_type);
    setGoalValue(challenge.goal_value.toString());
    setRewardTokens(challenge.reward_tokens.toString());
    setStartsAt(challenge.starts_at.slice(0, 16));
    setEndsAt(challenge.ends_at.slice(0, 16));
    setIsActive(challenge.is_active);
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    // Set default dates
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setStartsAt(now.toISOString().slice(0, 16));
    setEndsAt(nextWeek.toISOString().slice(0, 16));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !goalValue || !rewardTokens || !startsAt || !endsAt) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const challengeData = {
        title: title.trim(),
        description: description.trim() || null,
        goal_type: goalType,
        goal_value: parseInt(goalValue),
        reward_tokens: parseInt(rewardTokens),
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        is_active: isActive
      };

      if (editingChallenge) {
        const { error } = await supabase
          .from("team_challenges")
          .update(challengeData)
          .eq("id", editingChallenge.id);

        if (error) throw error;
        
        await logAction({ action: "update", tableName: "team_challenges", recordId: editingChallenge.id, oldData: editingChallenge as unknown as Record<string, unknown>, newData: challengeData });
        toast.success("Challenge updated successfully");
      } else {
        const { data, error } = await supabase
          .from("team_challenges")
          .insert(challengeData)
          .select()
          .single();

        if (error) throw error;
        
        await logAction({ action: "update", tableName: "team_challenges", recordId: data.id, newData: challengeData });
        toast.success("Challenge created successfully");
      }

      setDialogOpen(false);
      resetForm();
      fetchChallenges();
    } catch (error: any) {
      toast.error(error.message || "Failed to save challenge");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (challenge: Challenge) => {
    if (!confirm(`Are you sure you want to delete "${challenge.title}"?`)) return;

    try {
      const { error } = await supabase
        .from("team_challenges")
        .delete()
        .eq("id", challenge.id);

      if (error) throw error;
      
      await logAction({ action: "delete", tableName: "team_challenges", recordId: challenge.id, oldData: challenge as unknown as Record<string, unknown> });
      toast.success("Challenge deleted");
      fetchChallenges();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete challenge");
    }
  };

  const toggleActive = async (challenge: Challenge) => {
    try {
      const { error } = await supabase
        .from("team_challenges")
        .update({ is_active: !challenge.is_active })
        .eq("id", challenge.id);

      if (error) throw error;
      
      await logAction({ action: "update", tableName: "team_challenges", recordId: challenge.id, oldData: { is_active: challenge.is_active }, newData: { is_active: !challenge.is_active } });
      toast.success(`Challenge ${challenge.is_active ? 'deactivated' : 'activated'}`);
      fetchChallenges();
    } catch (error: any) {
      toast.error(error.message || "Failed to update challenge");
    }
  };

  const getGoalTypeLabel = (type: string) => {
    switch (type) {
      case "quizzes_completed": return "Quizzes Completed";
      case "total_score": return "Total Score";
      case "accuracy": return "Accuracy %";
      default: return type;
    }
  };

  const getChallengeStatus = (challenge: Challenge) => {
    const now = new Date();
    const start = new Date(challenge.starts_at);
    const end = new Date(challenge.ends_at);

    if (!challenge.is_active) return { label: "Inactive", variant: "secondary" as const };
    if (now < start) return { label: "Scheduled", variant: "outline" as const };
    if (now > end) return { label: "Ended", variant: "secondary" as const };
    return { label: "Active", variant: "default" as const };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Team Challenges
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              New Challenge
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingChallenge ? "Edit Challenge" : "Create Challenge"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Weekly Quiz Marathon"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Complete 20 quizzes as a team"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Goal Type *</Label>
                  <Select value={goalType} onValueChange={setGoalType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quizzes_completed">Quizzes Completed</SelectItem>
                      <SelectItem value="total_score">Total Score</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goalValue">Goal Value *</Label>
                  <Input
                    id="goalValue"
                    type="number"
                    value={goalValue}
                    onChange={(e) => setGoalValue(e.target.value)}
                    placeholder="20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rewardTokens">Reward Tokens *</Label>
                <Input
                  id="rewardTokens"
                  type="number"
                  value={rewardTokens}
                  onChange={(e) => setRewardTokens(e.target.value)}
                  placeholder="100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startsAt">Starts At *</Label>
                  <Input
                    id="startsAt"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endsAt">Ends At *</Label>
                  <Input
                    id="endsAt"
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>

              <Button onClick={handleSave} className="w-full" disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {editingChallenge ? "Update Challenge" : "Create Challenge"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {challenges.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No challenges created yet. Create your first team challenge!
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Goal</TableHead>
                <TableHead>Reward</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challenges.map((challenge) => {
                const status = getChallengeStatus(challenge);
                return (
                  <TableRow key={challenge.id}>
                    <TableCell className="font-medium">{challenge.title}</TableCell>
                    <TableCell>
                      {challenge.goal_value} {getGoalTypeLabel(challenge.goal_type).toLowerCase()}
                    </TableCell>
                    <TableCell>{challenge.reward_tokens} tokens</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(challenge.starts_at), 'MMM d')} - {format(new Date(challenge.ends_at), 'MMM d')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(challenge)}
                        >
                          {challenge.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(challenge)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(challenge)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
