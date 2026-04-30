import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import DirectMessageThread from "@/components/messaging/DirectMessageThread";
import { Loader2, MessageSquare } from "lucide-react";

interface ThreadPreview {
  peerId: string;
  peerName: string;
  peerAvatar: string | null;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

export default function Inbox() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const peerParam = params.get("peer");
  const [threads, setThreads] = useState<ThreadPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: msgs } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!msgs) {
        setLoading(false);
        return;
      }

      const map = new Map<string, ThreadPreview>();
      for (const m of msgs as any[]) {
        const peerId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
        if (!map.has(peerId)) {
          map.set(peerId, {
            peerId,
            peerName: "User",
            peerAvatar: null,
            lastMessage: m.content,
            lastAt: m.created_at,
            unread: 0,
          });
        }
        const t = map.get(peerId)!;
        if (!m.is_read && m.recipient_id === user.id) t.unread += 1;
      }

      const peerIds = [...map.keys()];
      if (peerIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, profile_image_url")
          .in("id", peerIds);
        for (const p of profs ?? []) {
          const t = map.get((p as any).id);
          if (t) {
            t.peerName = (p as any).full_name || "User";
            t.peerAvatar = (p as any).profile_image_url || (p as any).avatar_url;
          }
        }
      }

      setThreads([...map.values()]);
      setLoading(false);

      if (peerParam) {
        const t = map.get(peerParam);
        setActive({ id: peerParam, name: t?.peerName ?? "Conversation" });
      }
    };
    load();
  }, [user, peerParam]);

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <SEO title="Inbox · Messages" description="Chat with your tutors and students." />
      <DashboardNav />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground">Direct conversations with tutors and students.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
          <aside className="border rounded-2xl bg-white overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold">Conversations</div>
            <div className="divide-y max-h-[70vh] overflow-y-auto">
              {loading ? (
                <div className="p-6 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                </div>
              ) : threads.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No conversations yet. Visit a tutor profile and tap Message.
                </div>
              ) : (
                threads.map((t) => (
                  <button
                    key={t.peerId}
                    onClick={() => {
                      setActive({ id: t.peerId, name: t.peerName });
                      setParams({ peer: t.peerId });
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-amber-50/40 ${
                      active?.id === t.peerId ? "bg-amber-50/60" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{t.peerName}</p>
                      {t.unread > 0 && (
                        <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                          {t.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{t.lastMessage}</p>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section>
            {active ? (
              <DirectMessageThread peerId={active.id} peerName={active.name} />
            ) : (
              <div className="border rounded-2xl bg-white h-[70vh] flex items-center justify-center text-center px-8">
                <div>
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 text-amber-500" />
                  <p className="font-semibold">Select a conversation</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Or browse <Link to="/tutors" className="text-amber-700 underline">tutors</Link> to start a new chat.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
