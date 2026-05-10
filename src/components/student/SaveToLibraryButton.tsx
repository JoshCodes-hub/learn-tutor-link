import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, BookmarkPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import {
  saveResource, saveTextNote, type ResourceKind,
} from "@/lib/userResources";

interface BaseProps {
  defaultTitle: string;
  defaultFolder?: string;
  kind: ResourceKind;
  size?: "default" | "sm";
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
  meta?: Record<string, unknown>;
}

interface BlobProps extends BaseProps {
  /** Provide a Blob/File directly (e.g. generated MP3). */
  getBlob: () => Promise<Blob> | Blob;
  mime?: string;
  ext?: string;
  textContent?: never;
}

interface TextProps extends BaseProps {
  /** Provide plain text — will be stored as a .txt note. */
  textContent: string;
  getBlob?: never;
}

type Props = BlobProps | TextProps;

/**
 * Universal "Save to Library" button. Opens a dialog with editable title +
 * folder, then uploads to the private user-resources bucket and inserts a
 * `user_resources` row.
 */
export const SaveToLibraryButton = (props: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(props.defaultTitle);
  const [folder, setFolder] = useState(props.defaultFolder || "General");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user?.id) {
      toast.error("Please sign in to save to your library");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      if ("textContent" in props && props.textContent !== undefined) {
        await saveTextNote({
          userId: user.id,
          title: title.trim(),
          folder: folder.trim() || "General",
          content: props.textContent,
          kind: props.kind,
          meta: props.meta,
        });
      } else {
        const blob = await (props as BlobProps).getBlob();
        await saveResource({
          userId: user.id,
          kind: props.kind,
          title: title.trim(),
          folder: folder.trim() || "General",
          blob,
          mime: (props as BlobProps).mime,
          ext: (props as BlobProps).ext,
          meta: props.meta,
        });
      }
      qc.invalidateQueries({ queryKey: ["user-resources", user.id] });
      toast.success("Saved to your Library");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={props.variant || "outline"}
        size={props.size || "sm"}
        onClick={() => { setTitle(props.defaultTitle); setOpen(true); }}
        className={props.className}
      >
        <BookmarkPlus className="w-4 h-4 mr-1.5" /> Save to Library
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save to your Library</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold mb-1 block">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block">Folder</label>
              <Input
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="General"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SaveToLibraryButton;
