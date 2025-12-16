import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  team_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    profile_image_url: string | null;
  };
}

export const TeamChat = () => {
  const { user } = useAuth();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string | null; profile_image_url: string | null }>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchTeamAndMessages();
    }
  }, [user]);

  useEffect(() => {
    if (!teamId) return;

    // Subscribe to real-time messages
    const channel = supabase
      .channel(`team-chat-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_messages',
          filter: `team_id=eq.${teamId}`
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          // Fetch profile if not cached
          if (!profiles[newMsg.user_id]) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, profile_image_url")
              .eq("id", newMsg.user_id)
              .maybeSingle();
            if (profile) {
              setProfiles(prev => ({ ...prev, [newMsg.user_id]: profile }));
            }
          }
          setMessages(prev => [...prev, { ...newMsg, profile: profiles[newMsg.user_id] }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, profiles]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchTeamAndMessages = async () => {
    if (!user) return;

    try {
      // Get user's team
      const { data: membership } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        setLoading(false);
        return;
      }

      setTeamId(membership.team_id);

      // Fetch messages
      const { data: messagesData } = await supabase
        .from("team_messages")
        .select("*")
        .eq("team_id", membership.team_id)
        .order("created_at", { ascending: true })
        .limit(100);

      if (messagesData && messagesData.length > 0) {
        // Fetch profiles for all users
        const userIds = [...new Set(messagesData.map(m => m.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, profile_image_url")
          .in("id", userIds);

        const profileMap: Record<string, { full_name: string | null; profile_image_url: string | null }> = {};
        profilesData?.forEach(p => {
          profileMap[p.id] = { full_name: p.full_name, profile_image_url: p.profile_image_url };
        });
        setProfiles(profileMap);

        setMessages(messagesData.map(m => ({
          ...m,
          profile: profileMap[m.user_id]
        })));
      }
    } catch (error) {
      console.error("Error fetching team chat:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !teamId || !newMessage.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase.from("team_messages").insert({
        team_id: teamId,
        user_id: user.id,
        content: newMessage.trim()
      });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!teamId) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="w-5 h-5 text-primary" />
            Team Chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Join a team to chat with teammates!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="w-5 h-5 text-primary" />
          Team Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="h-64 pr-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No messages yet. Start the conversation!
            </p>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const isOwnMessage = message.user_id === user?.id;
                const profile = message.profile || profiles[message.user_id];
                
                return (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={profile?.profile_image_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {profile?.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[75%] ${isOwnMessage ? 'text-right' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium ${isOwnMessage ? 'order-2' : ''}`}>
                          {profile?.full_name || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(message.created_at), 'HH:mm')}
                        </span>
                      </div>
                      <div
                        className={`px-3 py-2 rounded-lg text-sm ${
                          isOwnMessage
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={sendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim() || sending}>
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
