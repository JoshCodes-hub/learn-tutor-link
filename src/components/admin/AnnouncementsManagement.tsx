import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone,
  Plus,
  Image as ImageIcon,
  Trash2,
  Pin,
  Eye,
  EyeOff,
  Loader2,
  X,
  ExternalLink,
  Sparkles,
  Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  link_url: string | null;
  link_label: string | null;
  audience: string;
  is_published: boolean;
  is_pinned: boolean;
  created_at: string;
  notified_at?: string | null;
}

const AUDIENCES = [
  { value: "all", label: "Everyone" },
  { value: "students", label: "Students" },
  { value: "tutors", label: "Tutors" },
  { value: "parents", label: "Parents" },
];

export const AnnouncementsManagement = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("platform_announcements")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load announcements");
      return;
    }
    setItems((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const resetForm = () => {
    setTitle("");
    setBody("");
    setAudience("all");
    setLinkUrl("");
    setLinkLabel("");
    setImageFile(null);
    setImagePreview(null);
    setIsPinned(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onPickImage = (file: File | null) => {
    setImageFile(file);
    if (!file) {
      setImagePreview(null);
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be under 4MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() || "jpg";
        const path = `${user?.id ?? "admin"}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("platform-announcements")
          .upload(path, imageFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: imageFile.type,
          });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage
          .from("platform-announcements")
          .getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }

      const { error } = await supabase.from("platform_announcements").insert({
        title: title.trim(),
        body: body.trim(),
        image_url: imageUrl,
        link_url: linkUrl.trim() || null,
        link_label: linkLabel.trim() || null,
        audience,
        is_pinned: isPinned,
        is_published: true,
        created_by: user?.id ?? null,
      });
      if (error) throw error;

      toast.success("Announcement posted");
      resetForm();
      setShowForm(false);
      fetchItems();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Could not post announcement");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePublish = async (a: Announcement) => {
    const { error } = await supabase
      .from("platform_announcements")
      .update({ is_published: !a.is_published })
      .eq("id", a.id);
    if (error) toast.error("Update failed");
    else {
      toast.success(!a.is_published ? "Published" : "Unpublished");
      fetchItems();
    }
  };

  const togglePin = async (a: Announcement) => {
    const { error } = await supabase
      .from("platform_announcements")
      .update({ is_pinned: !a.is_pinned })
      .eq("id", a.id);
    if (error) toast.error("Update failed");
    else fetchItems();
  };

  const remove = async (a: Announcement) => {
    if (!confirm(`Delete "${a.title}"?`)) return;
    const { error } = await supabase.from("platform_announcements").delete().eq("id", a.id);
    if (error) toast.error("Delete failed");
    else {
      toast.success("Deleted");
      fetchItems();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white p-5 sm:p-6 shadow-lg shadow-amber-500/20">
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/15 blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-bold leading-tight">Platform Announcements</h2>
              <p className="text-xs sm:text-sm text-amber-50/95">
                Reach every student on their dashboard.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm((s) => !s)}
            className="bg-white text-amber-800 hover:bg-amber-50 font-semibold shadow-md rounded-full shrink-0"
          >
            {showForm ? <X className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
            {showForm ? "Close" : "New post"}
          </Button>
        </div>
      </div>

      {/* Form */}
      <AnimatePresence initial={false}>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="rounded-3xl border border-amber-200/60 bg-white p-5 sm:p-6 space-y-4 shadow-sm">
              <div>
                <Label htmlFor="ann-title">Title</Label>
                <Input
                  id="ann-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. New JAMB CBT bank just dropped 🚀"
                  maxLength={120}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="ann-body">Message</Label>
                <Textarea
                  id="ann-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write something students will love to read…"
                  rows={4}
                  maxLength={800}
                  className="mt-1"
                />
                <p className="text-[11px] text-muted-foreground mt-1">{body.length}/800</p>
              </div>

              {/* Image picker */}
              <div>
                <Label>Cover image (optional)</Label>
                <div className="mt-1 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="group relative w-24 h-24 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-500 flex items-center justify-center overflow-hidden transition shrink-0"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-amber-700">
                        <ImageIcon className="w-5 h-5" />
                        <span className="text-[10px] font-semibold">Add image</span>
                      </div>
                    )}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
                  />
                  {imagePreview && (
                    <Button variant="outline" size="sm" onClick={() => onPickImage(null)} className="rounded-full">
                      <X className="w-3.5 h-3.5 mr-1" /> Remove
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">PNG / JPG · up to 4MB</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ann-link">Link URL (optional)</Label>
                  <Input
                    id="ann-link"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://…"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="ann-link-label">Link label</Label>
                  <Input
                    id="ann-link-label"
                    value={linkLabel}
                    onChange={(e) => setLinkLabel(e.target.value)}
                    placeholder="Learn more"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Audience</Label>
                  <Select value={audience} onValueChange={setAudience}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIENCES.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-border/60 hover:bg-amber-50/40 transition w-full">
                    <input
                      type="checkbox"
                      checked={isPinned}
                      onChange={(e) => setIsPinned(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <Pin className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium">Pin to top</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => { resetForm(); setShowForm(false); }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !title.trim() || !body.trim()}
                  className="bg-gradient-to-r from-amber-500 to-amber-700 text-white hover:opacity-95 rounded-full font-semibold shadow-md"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      Posting…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      Post announcement
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      <div>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-amber-300/60 bg-amber-50/30 p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center mx-auto mb-3">
              <Megaphone className="w-5 h-5 text-amber-700" />
            </div>
            <p className="font-semibold text-sm">No announcements yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "New post" to create your first announcement.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((a) => (
              <li
                key={a.id}
                className={cn(
                  "rounded-2xl border bg-card overflow-hidden transition hover:shadow-md",
                  a.is_pinned ? "border-amber-400/60 shadow-sm" : "border-border/60",
                  !a.is_published && "opacity-60"
                )}
              >
                <div className="flex">
                  {a.image_url ? (
                    <img
                      src={a.image_url}
                      alt=""
                      className="w-24 sm:w-32 h-full min-h-[100px] object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-24 sm:w-32 bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center shrink-0">
                      <Megaphone className="w-6 h-6 text-white/95" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          {a.is_pinned && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                              <Pin className="w-2.5 h-2.5" /> Pinned
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {a.audience}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(a.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="font-semibold text-sm leading-tight truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.body}</p>
                        {a.link_url && (
                          <a
                            href={a.link_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {a.link_label || a.link_url}
                          </a>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => togglePin(a)}
                          aria-label={a.is_pinned ? "Unpin" : "Pin"}
                          className={cn(
                            "p-1.5 rounded-lg transition",
                            a.is_pinned ? "bg-amber-500/15 text-amber-700" : "text-muted-foreground hover:bg-muted"
                          )}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => togglePublish(a)}
                          aria-label={a.is_published ? "Unpublish" : "Publish"}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition"
                        >
                          {a.is_published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => remove(a)}
                          aria-label="Delete"
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AnnouncementsManagement;
