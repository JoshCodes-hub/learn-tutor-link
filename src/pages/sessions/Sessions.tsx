import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, Calendar, Clock, Users, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUpcomingSessions, useBookSession, useMyBookings } from "@/hooks/useSessions";
import { SEO } from "@/components/seo/SEO";
import { toast } from "sonner";

export default function Sessions() {
  const nav = useNavigate();
  const { data: slots = [], isLoading } = useUpcomingSessions();
  const { data: myBookings = [] } = useMyBookings();
  const book = useBookSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"browse" | "mine">("browse");

  const handleBook = async (slotId: string) => {
    setBusy(slotId);
    try {
      const bookingId = await book.mutateAsync(slotId);
      toast.success("Session booked! Check 'My Sessions'");
    } catch (e: any) { toast.error(e.message || "Could not book"); }
    finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO title="Tutor Sessions" description="Book live tutor sessions" />
      <header className="flex items-center gap-2 px-3 py-3 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-base font-semibold flex-1">Live Sessions</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex gap-2 mb-4 border-b">
          <button
            onClick={() => setTab("browse")}
            className={`px-3 py-2 text-sm font-medium border-b-2 ${tab === "browse" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >Browse ({slots.length})</button>
          <button
            onClick={() => setTab("mine")}
            className={`px-3 py-2 text-sm font-medium border-b-2 ${tab === "mine" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >My Sessions ({myBookings.length})</button>
        </div>

        {tab === "browse" ? (
          isLoading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
          : slots.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No upcoming sessions yet. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {slots.map(s => (
                <div key={s.id} className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={s.tutor?.avatar_url ?? undefined} />
                      <AvatarFallback>{s.tutor?.full_name?.[0] ?? "T"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm leading-tight">{s.title}</h3>
                      <p className="text-xs text-muted-foreground">{s.tutor?.full_name ?? "Tutor"} · {s.tutor?.tutor_code}</p>
                      {s.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {format(new Date(s.starts_at), "MMM d, p")}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {s.duration_min}m</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {s.booked_count}/{s.capacity}</span>
                    <span>· {formatDistanceToNow(new Date(s.starts_at), { addSuffix: true })}</span>
                  </div>
                  {s.i_booked ? (
                    <Badge variant="secondary" className="w-full justify-center py-1.5">Booked ✓</Badge>
                  ) : (s.booked_count ?? 0) >= s.capacity ? (
                    <Badge variant="outline" className="w-full justify-center py-1.5">Full</Badge>
                  ) : (
                    <Button className="w-full" disabled={busy === s.id} onClick={() => handleBook(s.id)}>
                      {busy === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Book Session"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          myBookings.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>No bookings yet. Browse sessions to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myBookings.map((b: any) => (
                <div key={b.id} className="rounded-xl border bg-card p-4">
                  <h3 className="font-semibold text-sm">{b.slot?.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {b.slot && format(new Date(b.slot.starts_at), "EEE MMM d, p")} · {b.slot?.duration_min}m
                  </p>
                  <div className="flex gap-2 mt-3">
                    {b.thread_id && (
                      <Button size="sm" variant="outline" onClick={() => nav(`/chat/${b.thread_id}`)}>
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Open Chat
                      </Button>
                    )}
                    {b.slot?.meeting_url && (
                      <Button size="sm" asChild>
                        <a href={b.slot.meeting_url} target="_blank" rel="noopener">Join Call</a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
