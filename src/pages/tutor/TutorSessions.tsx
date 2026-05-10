import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Plus, Loader2, Calendar, Users, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useTutorSlots, useCreateSlot } from "@/hooks/useSessions";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import { toast } from "sonner";

export default function TutorSessions() {
  const nav = useNavigate();
  const { data: slots = [], isLoading, refetch } = useTutorSlots();
  const create = useCreateSlot();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", starts_at: "", duration_min: 60, capacity: 1, meeting_url: "",
  });

  const submit = async () => {
    if (!form.title || !form.starts_at) return toast.error("Title and time are required");
    try {
      await create.mutateAsync({
        title: form.title,
        description: form.description,
        starts_at: new Date(form.starts_at).toISOString(),
        duration_min: Number(form.duration_min),
        capacity: Number(form.capacity),
        meeting_url: form.meeting_url || undefined,
      });
      toast.success("Session published");
      setOpen(false);
      setForm({ title: "", description: "", starts_at: "", duration_min: 60, capacity: 1, meeting_url: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (id: string) => {
    if (!confirm("Cancel this session?")) return;
    const { error } = await supabase.from("tutor_session_slots").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cancelled");
    refetch();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO title="My Sessions — Tutor" description="Manage your live sessions" />
      <header className="flex items-center gap-2 px-3 py-3 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-base font-semibold flex-1">My Sessions</h1>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> New</Button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {isLoading ? <Loader2 className="w-6 h-6 mx-auto mt-12 animate-spin" />
          : slots.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No sessions yet. Publish one for students to book.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {slots.map(s => (
                <div key={s.id} className="rounded-xl border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{s.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(s.starts_at), "EEE MMM d, p")} · {s.duration_min}m · cap {s.capacity}
                      </p>
                      <p className="text-[11px] mt-1">
                        Status: <span className={s.status === "open" ? "text-emerald-600" : "text-muted-foreground"}>{s.status}</span>
                      </p>
                    </div>
                    {s.status === "open" && (
                      <Button variant="ghost" size="icon" onClick={() => remove(s.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New session</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. CHE101 Doubts Clearing" />
            </div>
            <div>
              <Label className="text-xs">Description (optional)</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Starts</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Duration (min)</Label>
                <Input type="number" value={form.duration_min} onChange={e => setForm({ ...form, duration_min: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Capacity</Label>
                <Input type="number" min={1} value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} />
              </div>
              <div>
                <Label className="text-xs">Meeting URL</Label>
                <Input placeholder="https://meet.google.com/..." value={form.meeting_url} onChange={e => setForm({ ...form, meeting_url: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={create.isPending}>
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
