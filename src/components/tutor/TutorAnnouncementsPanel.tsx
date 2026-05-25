import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Megaphone, Pin, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Announcement {
  id: string; title: string; body: string; is_pinned: boolean; created_at: string;
}

export default function TutorAnnouncementsPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", is_pinned: false });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["tutor-announcements", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("tutor_announcements")
        .select("id,title,body,is_pinned,created_at")
        .eq("tutor_id", user!.id)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as Announcement[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from as any)("tutor_announcements").insert({
        tutor_id: user!.id, title: form.title.trim(), body: form.body.trim(), is_pinned: form.is_pinned,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Announcement sent to your followers");
      setOpen(false); setForm({ title: "", body: "", is_pinned: false });
      qc.invalidateQueries({ queryKey: ["tutor-announcements", user?.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to post"),
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      await (supabase.from as any)("tutor_announcements").update({ is_pinned: value }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tutor-announcements", user?.id] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await (supabase.from as any)("tutor_announcements").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tutor-announcements", user?.id] }),
  });

  return (
    <section className="rounded-2xl border border-amber-100/70 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-amber-600" />
          <h2 className="font-display text-sm font-bold">Announcements</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white h-8">
              <Plus className="h-3.5 w-3.5 mr-1" /> New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Post announcement</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title (e.g. Mid-sem test on Friday)" value={form.title}
                     onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea rows={5} placeholder="Details students should know…" value={form.body}
                        onChange={(e) => setForm({ ...form, body: e.target.value })} />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={form.is_pinned}
                       onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} />
                Pin to top of my profile
              </label>
              <Button onClick={() => create.mutate()} disabled={create.isPending || !form.title.trim() || !form.body.trim()}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                {create.isPending ? "Posting…" : "Send to followers"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center rounded-xl border border-dashed border-amber-200/70 bg-amber-50/40">
          No announcements yet. Post your first to notify followers instantly.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className="p-3 rounded-xl border border-amber-100/70 bg-amber-50/30">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {a.is_pinned && <Pin className="h-3 w-3 text-amber-600 shrink-0" />}
                    <div className="text-sm font-semibold truncate">{a.title}</div>
                  </div>
                  <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5">{a.body}</p>
                  <div className="text-[10.5px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => togglePin.mutate({ id: a.id, value: !a.is_pinned })}
                          className="p-1 text-muted-foreground hover:text-amber-600" title={a.is_pinned ? "Unpin" : "Pin"}>
                    <Pin className={`h-3.5 w-3.5 ${a.is_pinned ? "fill-amber-500 text-amber-600" : ""}`} />
                  </button>
                  <button onClick={() => remove.mutate(a.id)}
                          className="p-1 text-muted-foreground hover:text-rose-600" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}