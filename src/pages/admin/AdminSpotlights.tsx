import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSpotlights } from "@/hooks/useSpotlights";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATS = ["graduating","innovator","hackathon","scholarship","top_performer"] as const;

export default function AdminSpotlights() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: items = [] } = useSpotlights(50);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", summary: "", category: "innovator" as typeof CATS[number],
    image_url: "", link_url: "", user_id: "", featured_until: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from as any)("student_spotlights").insert({
        ...form,
        image_url: form.image_url || null,
        link_url: form.link_url || null,
        user_id: form.user_id || null,
        featured_until: form.featured_until || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Spotlight published");
      setOpen(false);
      setForm({ title: "", summary: "", category: "innovator", image_url: "", link_url: "", user_id: "", featured_until: "" });
      qc.invalidateQueries({ queryKey: ["spotlights"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)("student_spotlights").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["spotlights"] }),
  });

  return (
    <>
      <SEO title="Admin · Student Spotlights" description="Manage student spotlights" />
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-6 max-w-3xl">
          <div className="flex items-center justify-between mb-5">
            <h1 className="font-display text-xl font-bold">Student Spotlights</h1>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white"><Plus className="h-4 w-4 mr-1"/>New</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Feature a student</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Headline (e.g. Top of CSC class 2025)" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                  <Textarea placeholder="Summary" rows={3} value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} />
                  <select className="w-full border rounded-md h-10 px-3 text-sm bg-background"
                    value={form.category} onChange={e => setForm({...form, category: e.target.value as any})}>
                    {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <Input placeholder="Image URL (optional)" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} />
                  <Input placeholder="Link URL (optional)" value={form.link_url} onChange={e => setForm({...form, link_url: e.target.value})} />
                  <Input placeholder="Featured user_id (optional)" value={form.user_id} onChange={e => setForm({...form, user_id: e.target.value})} />
                  <Input type="date" placeholder="Featured until" value={form.featured_until} onChange={e => setForm({...form, featured_until: e.target.value})} />
                  <Button onClick={() => create.mutate()} disabled={create.isPending || !form.title}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                    {create.isPending ? "Publishing…" : "Publish"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {items.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-100/70 bg-card">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{s.title}</div>
                  <div className="text-[11.5px] text-muted-foreground">{s.category}</div>
                </div>
                <button onClick={() => remove.mutate(s.id)} className="text-rose-600 p-1"><Trash2 className="h-4 w-4"/></button>
              </div>
            ))}
            {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No spotlights yet.</p>}
          </div>
        </main>
      </div>
    </>
  );
}