import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HelpCircle, Loader2, Plus, MessageCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Q {
  id: string;
  user_id: string;
  title: string;
  body: string;
  answer_count: number;
  is_resolved: boolean;
  created_at: string;
  asker?: string;
}

export default function QABoard() {
  const { user, hasRole } = useAuth();
  const [items, setItems] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("qa_questions")
      .select("*")
      .order("is_resolved", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(100);
    const list = (data as Q[]) ?? [];
    const ids = [...new Set(list.map((q) => q.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const m = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      list.forEach((q) => (q.asker = m.get(q.user_id) || "Student"));
    }
    setItems(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const ask = async () => {
    if (!user || !title.trim() || !body.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("qa_questions").insert({
      user_id: user.id,
      title: title.trim().slice(0, 200),
      body: body.trim().slice(0, 4000),
    });
    setPosting(false);
    if (error) return toast.error(error.message);
    toast.success("Question posted");
    setTitle("");
    setBody("");
    setOpen(false);
    load();
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <SEO title="Q&A Board" description="Ask questions and get answers from tutors." />
      <DashboardNav role={(hasRole?.("admin") ? "admin" : hasRole?.("tutor") ? "tutor" : "student")} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Q&A Board</h1>
            <p className="text-muted-foreground">Ask anything — tutors and peers will answer.</p>
          </div>
          {user && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Plus className="w-4 h-4 mr-2" /> Ask a question
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ask a Question</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Title *</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200}
                      placeholder="e.g., How do I solve quadratic inequalities?" />
                  </div>
                  <div>
                    <Label>Details *</Label>
                    <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={4000} />
                  </div>
                  <Button onClick={ask} disabled={posting || !title.trim() || !body.trim()} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                    {posting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Post
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-600" /></div>
        ) : items.length === 0 ? (
          <div className="border rounded-2xl bg-white p-10 text-center">
            <HelpCircle className="w-10 h-10 mx-auto mb-3 text-amber-500" />
            <p className="font-semibold">Be the first to ask</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((q) => (
              <Link
                key={q.id}
                to={`/qa/${q.id}`}
                className="block border rounded-2xl bg-white p-5 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      {q.is_resolved && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      {q.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{q.body}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {q.asker} · {new Date(q.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-center text-xs text-muted-foreground shrink-0">
                    <MessageCircle className="w-4 h-4 mb-0.5 text-amber-600" />
                    <span className="font-semibold text-foreground">{q.answer_count}</span>
                    <span>answers</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
