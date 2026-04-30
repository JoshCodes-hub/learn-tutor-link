import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Q { id: string; user_id: string; title: string; body: string; is_resolved: boolean; created_at: string; asker?: string; }
interface A { id: string; user_id: string; body: string; is_accepted: boolean; created_at: string; author?: string; is_tutor?: boolean; }

export default function QAQuestion() {
  const { id } = useParams<{ id: string }>();
  const { user, hasRole } = useAuth();
  const [q, setQ] = useState<Q | null>(null);
  const [answers, setAnswers] = useState<A[]>([]);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data: qd } = await supabase.from("qa_questions").select("*").eq("id", id).maybeSingle();
    if (qd) {
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", (qd as any).user_id).maybeSingle();
      setQ({ ...(qd as any), asker: (prof as any)?.full_name || "Student" });
    }
    const { data: ad } = await supabase.from("qa_answers").select("*").eq("question_id", id).order("is_accepted", { ascending: false }).order("created_at", { ascending: true });
    const list = (ad as A[]) ?? [];
    const ids = [...new Set(list.map((a) => a.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
      const nameMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      const tutorSet = new Set((roles ?? []).filter((r: any) => r.role === "tutor").map((r: any) => r.user_id));
      list.forEach((a) => {
        a.author = nameMap.get(a.user_id) || "User";
        a.is_tutor = tutorSet.has(a.user_id);
      });
    }
    setAnswers(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!id) return;
    const ch = supabase.channel(`qa-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "qa_answers", filter: `question_id=eq.${id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  const answer = async () => {
    if (!user || !text.trim() || !id) return;
    setPosting(true);
    const { error } = await supabase.from("qa_answers").insert({
      question_id: id, user_id: user.id, body: text.trim().slice(0, 4000),
    });
    setPosting(false);
    if (error) return toast.error(error.message);
    setText("");
  };

  const accept = async (a: A) => {
    if (!q || q.user_id !== user?.id) return;
    await supabase.from("qa_answers").update({ is_accepted: false }).eq("question_id", q.id);
    await supabase.from("qa_answers").update({ is_accepted: true }).eq("id", a.id);
    await supabase.from("qa_questions").update({ is_resolved: true }).eq("id", q.id);
    toast.success("Answer marked as accepted");
    load();
  };

  const removeA = async (a: A) => {
    if (!confirm("Delete this answer?")) return;
    await supabase.from("qa_answers").delete().eq("id", a.id);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-amber-600" /></div>;
  if (!q) return <div className="p-8 text-center">Question not found.</div>;

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <SEO title={q.title} description={q.body.slice(0, 160)} />
      <DashboardNav role={(hasRole?.("admin") ? "admin" : hasRole?.("tutor") ? "tutor" : "student")} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/qa" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Q&A
        </Link>

        <article className="border rounded-2xl bg-white p-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {q.is_resolved && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            {q.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">{q.asker} · {new Date(q.created_at).toLocaleString()}</p>
          <p className="mt-4 whitespace-pre-wrap">{q.body}</p>
        </article>

        <h2 className="text-lg font-semibold mt-8 mb-3">{answers.length} {answers.length === 1 ? "Answer" : "Answers"}</h2>
        <div className="space-y-3">
          {answers.map((a) => (
            <div key={a.id} className={`border rounded-2xl bg-white p-5 ${a.is_accepted ? "ring-1 ring-emerald-300 bg-emerald-50/30" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{a.author}</span>
                  {a.is_tutor && <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-semibold">TUTOR</span>}
                  {a.is_accepted && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-semibold">ACCEPTED</span>}
                </div>
                <div className="flex gap-1">
                  {q.user_id === user?.id && !a.is_accepted && (
                    <Button size="sm" variant="ghost" onClick={() => accept(a)}>
                      <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" /> Accept
                    </Button>
                  )}
                  {(a.user_id === user?.id || hasRole("admin")) && (
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeA(a)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap">{a.body}</p>
              <p className="text-xs text-muted-foreground mt-2">{new Date(a.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>

        {user && (
          <div className="mt-6 border rounded-2xl bg-white p-5">
            <h3 className="font-semibold mb-2">Your answer</h3>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={4000} placeholder="Be helpful and clear…" />
            <Button onClick={answer} disabled={posting || !text.trim()} className="mt-3 bg-amber-500 hover:bg-amber-600 text-white">
              {posting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Post answer
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
