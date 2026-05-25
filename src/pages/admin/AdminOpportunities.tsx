import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useOpportunities, type OpportunityCategory } from "@/hooks/useOpportunities";
import { Plus, Trash2, Pencil, FileText } from "lucide-react";
import { toast } from "sonner";

const CATS: OpportunityCategory[] = ["internship","scholarship","hackathon","competition","tech_program","career"];

export default function AdminOpportunities() {
  const { data: items = [], refetch } = useOpportunities();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", organization: "", category: "internship" as OpportunityCategory,
    description: "", deadline: "", apply_url: "", cover_image_url: "", university: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        deadline: form.deadline || null,
        apply_url: form.apply_url || null,
        cover_image_url: form.cover_image_url || null,
        university: form.university || null,
      };
      if (editId) {
        const { error } = await (supabase.from as any)("opportunities").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from as any)("opportunities").insert({ ...payload, status: "published" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Opportunity updated" : "Opportunity published");
      setOpen(false);
      setEditId(null);
      setForm({ title: "", organization: "", category: "internship", description: "", deadline: "", apply_url: "", cover_image_url: "", university: "" });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)("opportunities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { refetch(); toast.success("Removed"); },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'draft' | 'published' }) => {
      const { error } = await (supabase.from as any)("opportunities").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunities"] }),
  });

  const startEdit = (op: any) => {
    setEditId(op.id);
    setForm({
      title: op.title, organization: op.organization, category: op.category,
      description: op.description, deadline: op.deadline ?? "", apply_url: op.apply_url ?? "",
      cover_image_url: op.cover_image_url ?? "", university: op.university ?? "",
    });
    setOpen(true);
  };

  const { data: counts = {} } = useQuery({
    queryKey: ["opp-app-counts"],
    queryFn: async () => {
      const { data } = await (supabase.from as any)("opportunity_applications").select("opportunity_id");
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { map[r.opportunity_id] = (map[r.opportunity_id] ?? 0) + 1; });
      return map;
    },
  });

  return (
    <>
      <SEO title="Admin · Opportunities" description="Manage opportunities" />
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="flex items-center justify-between mb-5">
            <h1 className="font-display text-xl font-bold">Opportunities</h1>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditId(null); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => { setEditId(null); setForm({ title: "", organization: "", category: "internship", description: "", deadline: "", apply_url: "", cover_image_url: "", university: "" }); }}>
                  <Plus className="h-4 w-4 mr-1" /> New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editId ? "Edit opportunity" : "New opportunity"}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                  <Input placeholder="Organization" value={form.organization} onChange={e => setForm({...form, organization: e.target.value})} />
                  <select className="w-full border rounded-md h-10 px-3 text-sm bg-background"
                    value={form.category} onChange={e => setForm({...form, category: e.target.value as OpportunityCategory})}>
                    {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <Textarea placeholder="Description" rows={4} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                  <Input type="date" placeholder="Deadline" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} />
                  <Input placeholder="Apply URL" value={form.apply_url} onChange={e => setForm({...form, apply_url: e.target.value})} />
                  <Input placeholder="Cover image URL (optional)" value={form.cover_image_url} onChange={e => setForm({...form, cover_image_url: e.target.value})} />
                  <Input placeholder="University (optional, e.g. FUTA)" value={form.university} onChange={e => setForm({...form, university: e.target.value})} />
                  <Button onClick={() => create.mutate()} disabled={create.isPending || !form.title || !form.organization || !form.description}
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                    {create.isPending ? "Saving…" : (editId ? "Save changes" : "Publish")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {items.map((op) => (
              <div key={op.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-100/70 bg-card">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate flex items-center gap-2">
                    {op.title}
                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      (op as any).status === 'draft' ? 'bg-muted text-muted-foreground' : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>{(op as any).status ?? 'published'}</span>
                  </div>
                  <div className="text-[11.5px] text-muted-foreground flex items-center gap-2">
                    <span>{op.organization} · {op.category}</span>
                    <span className="inline-flex items-center gap-0.5"><FileText className="h-3 w-3" />{counts[op.id] ?? 0}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleStatus.mutate({ id: op.id, status: (op as any).status === 'draft' ? 'published' : 'draft' })}
                    className="text-[11px] font-semibold px-2 py-1 rounded border border-amber-200 text-amber-800 hover:bg-amber-50">
                    {(op as any).status === 'draft' ? 'Publish' : 'Unpublish'}
                  </button>
                  <button onClick={() => startEdit(op)} className="text-muted-foreground hover:text-foreground p-1">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove.mutate(op.id)} className="text-rose-600 hover:text-rose-700 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No opportunities yet.</p>}
          </div>
        </main>
      </div>
    </>
  );
}