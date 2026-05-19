import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMyThreads, joinBrainstormByCode } from "@/hooks/useChatThreads";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquarePlus, Sparkles, Users, Loader2, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { SEO } from "@/components/seo/SEO";

export default function ChatInbox() {
  const { user } = useAuth();
  const { data: threads, isLoading } = useMyThreads();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  if (!user) {
    return (
      <div className="p-6 text-center">
        <Link to="/auth" className="text-primary underline">Sign in to chat</Link>
      </div>
    );
  }

  const handleJoin = async () => {
    if (!code.trim()) return;
    setJoining(true);
    try {
      const id = await joinBrainstormByCode(code.trim().toUpperCase());
      setJoinOpen(false);
      setCode("");
      navigate(`/chat/${id}`);
    } catch (e: any) {
      toast.error(e.message || "Could not join");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO title="Inbox - Chat & Brainstorm" description="Your conversations and brainstorm rooms" />

      <header className="sticky top-0 z-10 px-4 py-4 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Chat</h1>
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4 mr-1.5" /> Join
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Join a chat room</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Paste the invite code your tutor shared (case-insensitive).
                </p>
                <Input
                  placeholder="Enter invite code…"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && handleJoin()}
                  autoFocus
                />
                <Button onClick={handleJoin} disabled={joining || !code.trim()} className="w-full">
                  {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join room"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Tip: type <span className="font-semibold text-primary">@AI</span> in any chat for instant help.
        </p>
      </header>

      <div className="px-2 py-2">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : !threads || threads.length === 0 ? (
          <div className="text-center py-16 px-6">
            <MessageSquarePlus className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h2 className="font-semibold mb-1">No conversations yet</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Open a Study Pack or Tutor Curriculum to start a brainstorm room, or join one with a code.
            </p>
            <Button onClick={() => setJoinOpen(true)} variant="outline">
              <Users className="w-4 h-4 mr-1.5" /> Join with code
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {threads.map(t => {
              const isAiLast = t.last_message?.is_ai;
              return (
                <li key={t.id}>
                  <Link
                    to={`/chat/${t.id}`}
                    className="flex items-center gap-3 px-3 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="w-12 h-12 shrink-0">
                      <AvatarFallback className="bg-primary/10">
                        {t.kind === "brainstorm" ? <Sparkles className="w-5 h-5 text-primary" /> : <MessageSquare className="w-5 h-5 text-primary" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-sm truncate">{t.title || "Untitled"}</h3>
                        {t.last_message && (
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(t.last_message.created_at), { addSuffix: false })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {isAiLast && <span className="text-primary font-medium">AI: </span>}
                        {t.last_message?.content ?? "No messages yet"}
                      </p>
                    </div>
                    {t.unread ? (
                      <Badge className="rounded-full">{t.unread}</Badge>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
