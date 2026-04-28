import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, Send, Loader2, Users, BookOpen, Globe2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSchool } from "@/hooks/useCurrentSchool";
import { useAuth } from "@/hooks/useAuth";
import AppScreen from "@/components/app-shell/AppScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AUDIENCES = [
  { v: "all",      label: "Everyone",  icon: Globe2 },
  { v: "parents",  label: "Parents",   icon: Users  },
  { v: "teachers", label: "Teachers",  icon: BookOpen },
];

export default function SchoolAnnouncements() {
  const { school, loading: sloading } = useCurrentSchool();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [audience, setAudience] = useState("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const refresh = async () => {
    if (!school) return;
    const { data } = await supabase.from("school_announcements").select("*").eq("school_id", school.id).order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, [school]);

  const post = async () => {
    if (!school || !title.trim() || !body.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("school_announcements").insert({
      school_id: school.id, title: title.trim(), body: body.trim(), audience, created_by: user?.id,
    });
    if (error) { toast.error(error.message); setPosting(false); return; }
    toast.success("Announcement posted");
    setTitle(""); setBody(""); setAudience("all");
    setPosting(false);
    refresh();
  };

  if (sloading) return <AppScreen><Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mt-20" /></AppScreen>;

  return (
    <AppScreen title="Announcements" subtitle={school?.name} back>
      <div className="max-w-2xl mx-auto">
        {/* Composer */}
        <div className="rounded-3xl p-4 mb-5 bg-card border border-border/60 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-sm">
              <Megaphone className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="font-display font-semibold text-sm">New circular</div>
          </div>
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="mb-2 rounded-xl" />
          <Textarea placeholder="Write your message…" value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="mb-3 rounded-xl resize-none" />
          <div className="flex gap-1.5 mb-3 bg-muted/50 rounded-xl p-1">
            {AUDIENCES.map((a) => {
              const active = audience === a.v;
              return (
                <button key={a.v} onClick={() => setAudience(a.v)}
                  className={cn(
                    "flex-1 h-9 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all",
                    active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  )}>
                  <a.icon className="w-3.5 h-3.5" /> {a.label}
                </button>
              );
            })}
          </div>
          <Button onClick={post} disabled={posting || !title.trim() || !body.trim()} className="w-full rounded-xl">
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Send</>}
          </Button>
        </div>

        {/* Feed */}
        <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Recent</h2>
        {loading ? <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" /> : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No announcements yet.</p>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {items.map((a, i) => (
                <motion.li
                  key={a.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="relative p-4 rounded-2xl bg-gradient-to-br from-card to-card/60 border border-border/50 overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-amber-600" />
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="font-display font-semibold text-sm leading-tight">{a.title}</h3>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold shrink-0">
                      {a.audience}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{a.body}</p>
                  <div className="text-[10px] text-muted-foreground mt-2">
                    {new Date(a.created_at).toLocaleString()}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </AppScreen>
  );
}
