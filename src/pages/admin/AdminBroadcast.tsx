import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Audience = "all" | "students" | "tutors";

export default function AdminBroadcast() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    try {
      const { error } = await (supabase.from as any)("platform_announcements").insert({
        title, body, link_url: link || null, audience, is_published: true, created_by: user?.id,
      });
      if (error) throw error;
      toast.success("Broadcast sent");
      setTitle(""); setBody(""); setLink("");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally { setBusy(false); }
  };

  return (
    <>
      <SEO title="Admin · Broadcast" description="Send platform announcement" />
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-amber-100/70 sticky top-0 z-30">
          <div className="container mx-auto px-4 h-14 flex items-center gap-3">
            <Link to="/admin" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
            <h1 className="font-display text-base font-bold">Broadcast</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 max-w-xl space-y-3">
          <p className="text-[12.5px] text-muted-foreground flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-amber-600" /> Announcements notify the chosen audience instantly.
          </p>
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Message" rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
          <Input placeholder="Link URL (optional)" value={link} onChange={(e) => setLink(e.target.value)} />
          <select className="w-full border rounded-md h-10 px-3 text-sm bg-background"
            value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
            <option value="all">Everyone</option>
            <option value="students">Students only</option>
            <option value="tutors">Tutors only</option>
          </select>
          <Button onClick={send} disabled={busy || !title.trim() || !body.trim()}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white">
            {busy ? "Sending…" : "Send broadcast"}
          </Button>
        </main>
      </div>
    </>
  );
}