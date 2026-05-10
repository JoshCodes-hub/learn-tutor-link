import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Plus, Loader2, Calendar, Trash2, CheckCircle2, Coins, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  useTutorSlots, useCreateSlot, useTutorBookings, useCompleteSession,
} from "@/hooks/useSessions";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import { toast } from "sonner";

export default function TutorSessions() {
  const nav = useNavigate();
  const { data: slots = [], isLoading, refetch } = useTutorSlots();
  const { data: bookings = [] } = useTutorBookings();
  const create = useCreateSlot();
  const complete = useCompleteSession();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"slots" | "bookings">("slots");
  const [form, setForm] = useState({
    title: "", description: "", starts_at: "", duration_min: 60, capacity: 1,
    meeting_url: "", price_tokens: 0, payout_share_bps: 7000,
  });

  const submit = async () => {
    if (!form.title || !form.starts_at) return toast.error("Title and time are required");
    try {
      await create.mutateAsync({
        title: form.title, description: form.description,
        starts_at: new Date(form.starts_at).toISOString(),
        duration_min: Number(form.duration_min),
        capacity: Number(form.capacity),
        meeting_url: form.meeting_url || undefined,
        price_tokens: Number(form.price_tokens),
        payout_share_bps: Number(form.payout_share_bps),
      } as any);
      toast.success("Session published");
      setOpen(false);
      setForm({ title: "", description: "", starts_at: "", duration_min: 60, capacity: 1, meeting_url: "", price_tokens: 0, payout_share_bps: 7000 });
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (id: string) => {
    if (!confirm("Cancel this session?")) return;
    const { error } = await supabase.from("tutor_session_slots").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cancelled");
    refetch();
  };

  const markComplete = async (id: string, payout: number) => {
    const msg = payout > 0 ? `Mark complete and release ${payout} tokens to your wallet?` : "Mark complete?";
    if (!confirm(msg)) return;
    try {
      await complete.mutateAsync(id);
      toast.success(payout > 0 ? `${payout} tokens credited` : "Marked complete");
    } catch (e: any) { toast.error(e.message); }
  };

  const pendingPayout = bookings
    .filter(b => b.payment_status === "escrow")
    .reduce((s, b) => s + b.tokens_to_tutor, 0);
  const released = bookings
    .filter(b => b.payment_status === "released")
    .reduce((s, b) => s + b.tokens_to_tutor, 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO title="My Sessions — Tutor" description="Manage your live sessions" />
      <header className="flex items-center gap-2 px-3 py-3 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-base font-semibold flex-1">My Sessions</h1>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> New</Button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {(pendingPayout > 0 || released > 0) && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">In escrow</p>
              <p className="text-lg font-bold flex items-center gap-1"><Coins className="w-4 h-4 text-amber-600" />{pendingPayout}</p>
            </div>
            <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Released to wallet</p>
              <p className="text-lg font-bold flex items-center gap-1"><Coins className="w-4 h-4 text-emerald-600" />{released}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-4 border-b">
          <button onClick={() => setTab("slots")}
            className={`px-3 py-2 text-sm font-medium border-b-2 ${tab === "slots" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >Slots ({slots.length})</button>
          <button onClick={() => setTab("bookings")}
            className={`px-3 py-2 text-sm font-medium border-b-2 ${tab === "bookings" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >Bookings ({bookings.length})</button>
        </div>

        {tab === "slots" ? (
          isLoading ? <Loader2 className="w-6 h-6 mx-auto mt-12 animate-spin" />
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{s.title}</h3>
                        {s.price_tokens > 0
                          ? <Badge variant="secondary" className="gap-1"><Coins className="w-3 h-3" />{s.price_tokens}</Badge>
                          : <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Free</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(s.starts_at), "EEE MMM d, p")} · {s.duration_min}m · cap {s.capacity}
                      </p>
                      <p className="text-[11px] mt-1">
                        Status: <span className={s.status === "open" ? "text-emerald-600" : "text-muted-foreground"}>{s.status}</span>
                        {s.price_tokens > 0 && <> · Your share: {Math.round(s.payout_share_bps / 100)}%</>}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {s.status === "open" && (() => {
                        const start = new Date(s.starts_at).getTime();
                        const end = start + (s.duration_min ?? 60) * 60_000;
                        const now = Date.now();
                        const open = now >= start - 10 * 60_000 && now <= end + 30 * 60_000;
                        return open ? (
                          <Button size="sm" onClick={() => nav(`/live/${s.id}`)}>
                            <Video className="w-3.5 h-3.5 mr-1" /> Start
                          </Button>
                        ) : null;
                      })()}
                      {s.status === "open" && (
                        <Button variant="ghost" size="icon" onClick={() => remove(s.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : bookings.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground text-sm">No bookings yet.</p>
        ) : (
          <div className="space-y-3">
            {bookings.map(b => (
              <div key={b.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{b.slot?.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {b.student?.full_name ?? "Student"} ·{" "}
                      {b.slot?.starts_at && format(new Date(b.slot.starts_at), "MMM d, p")}
                    </p>
                  </div>
                  <Badge variant={b.status === "completed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"}>
                    {b.status}
                  </Badge>
                </div>
                {b.tokens_paid > 0 && (
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Coins className="w-3 h-3" /> Paid {b.tokens_paid} · You earn {b.tokens_to_tutor}
                    {b.payment_status === "escrow" && <span className="text-amber-600">· in escrow</span>}
                    {b.payment_status === "released" && <span className="text-emerald-600">· released</span>}
                    {b.payment_status === "refunded" && <span className="text-destructive">· refunded</span>}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {b.thread_id && (
                    <Button size="sm" variant="outline" onClick={() => nav(`/chat/${b.thread_id}`)}>Open chat</Button>
                  )}
                  {b.status === "confirmed" && b.slot && (() => {
                    const start = new Date(b.slot.starts_at).getTime();
                    const end = start + ((b.slot as any).duration_min ?? 60) * 60_000;
                    const now = Date.now();
                    const open = now >= start - 10 * 60_000 && now <= end + 30 * 60_000;
                    return open ? (
                      <Button size="sm" onClick={() => nav(`/live/${b.slot_id}`)}>
                        <Video className="w-3.5 h-3.5 mr-1" /> Join live
                      </Button>
                    ) : null;
                  })()}
                  {b.status === "confirmed" && b.payment_status !== "released" && (
                    <Button size="sm" onClick={() => markComplete(b.id, b.tokens_to_tutor)} disabled={complete.isPending}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      {b.tokens_to_tutor > 0 ? `Mark complete (+${b.tokens_to_tutor})` : "Mark complete"}
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
            <div className="grid grid-cols-2 gap-2 pt-1 border-t">
              <div>
                <Label className="text-xs">Price (tokens)</Label>
                <Input type="number" min={0} value={form.price_tokens} onChange={e => setForm({ ...form, price_tokens: Number(e.target.value) })} />
                <p className="text-[10px] text-muted-foreground mt-1">0 = free session</p>
              </div>
              <div>
                <Label className="text-xs">Your share (%)</Label>
                <Input type="number" min={0} max={100} value={form.payout_share_bps / 100}
                  onChange={e => setForm({ ...form, payout_share_bps: Math.max(0, Math.min(100, Number(e.target.value))) * 100 })} />
                <p className="text-[10px] text-muted-foreground mt-1">Released when you mark complete</p>
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
