import { useState } from "react";
import { useCommunityAnnouncements } from "@/hooks/useCommunityAnnouncements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Megaphone,
  Plus,
  Pin,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CommunityAnnouncementsProps {
  communityId: string;
  isTutor?: boolean;
}

export function CommunityAnnouncements({
  communityId,
  isTutor = false,
}: CommunityAnnouncementsProps) {
  const {
    announcements,
    isLoading,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
  } = useCommunityAnnouncements(communityId);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    await createAnnouncement(title.trim(), content.trim(), isPinned);
    setIsSubmitting(false);
    setShowCreateDialog(false);
    resetForm();
  };

  const handleEdit = async () => {
    if (!editingId || !title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    await updateAnnouncement(editingId, title.trim(), content.trim(), isPinned);
    setIsSubmitting(false);
    setShowEditDialog(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this announcement?")) {
      await deleteAnnouncement(id);
    }
  };

  const openEditDialog = (announcement: {
    id: string;
    title: string;
    content: string;
    is_pinned: boolean;
  }) => {
    setEditingId(announcement.id);
    setTitle(announcement.title);
    setContent(announcement.content);
    setIsPinned(announcement.is_pinned);
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setIsPinned(false);
    setEditingId(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          Announcements
        </h3>
        {isTutor && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Announcement
          </Button>
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`p-4 rounded-lg border ${
                announcement.is_pinned
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {announcement.is_pinned && (
                      <Badge variant="secondary" className="text-xs">
                        <Pin className="w-3 h-3 mr-1" />
                        Pinned
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(announcement.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <h4 className="font-medium text-foreground">
                    {announcement.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                </div>

                {isTutor && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(announcement)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(announcement.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post Announcement</DialogTitle>
            <DialogDescription>
              Share updates with your community members.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Announcement title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                placeholder="Write your announcement..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="pinned"
                checked={isPinned}
                onCheckedChange={(checked) => setIsPinned(checked === true)}
              />
              <Label htmlFor="pinned" className="text-sm font-normal">
                Pin this announcement
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSubmitting || !title.trim() || !content.trim()}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Post Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>Update your announcement.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-content">Content *</Label>
              <Textarea
                id="edit-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-pinned"
                checked={isPinned}
                onCheckedChange={(checked) => setIsPinned(checked === true)}
              />
              <Label htmlFor="edit-pinned" className="text-sm font-normal">
                Pin this announcement
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isSubmitting || !title.trim() || !content.trim()}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
