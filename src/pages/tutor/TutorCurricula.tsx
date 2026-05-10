import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, BookOpen, ChevronRight, Eye, EyeOff, Trash2 } from "lucide-react";
import { useMyCurricula, useCurriculumMutations } from "@/hooks/useTutorCurricula";
import { toast } from "sonner";

export default function TutorCurricula() {
  const { user, hasRole, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: curricula = [], isLoading } = useMyCurricula();
  const { create, update, remove } = useCurriculumMutations();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  if (!authLoading && (!user || !hasRole("tutor"))) {
    navigate("/auth");
    return null;
  }

  const handleCreate = async () => {
    if (!title.trim()) return toast.error("Give your curriculum a title");
    try {
      const created = await create.mutateAsync({ title: title.trim(), description: desc.trim() });
      toast.success("Curriculum created");
      setOpen(false); setTitle(""); setDesc("");
      navigate(`/tutor/curricula/${created.id}`);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <>
      <SEO title="My Curricula" description="Build structured courses with topics and AI-powered materials." noindex url="https://overraprep.com/tutor/curricula" />
      <div className="min-h-screen bg-background">
        <DashboardNav role="tutor" />
        <DashboardBreadcrumb role="tutor" />
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">My Curricula</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Design your own courses — add topics, upload materials, generate flashcards with AI.
              </p>
            </div>
            <Button onClick={() => setOpen(true)} className="shrink-0">
              <Plus className="w-4 h-4 mr-1.5" /> New Curriculum
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : curricula.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center bg-muted/20">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold text-foreground mb-1">No curricula yet</p>
              <p className="text-sm text-muted-foreground mb-4">Create your first curriculum to start building structured courses.</p>
              <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> Create Curriculum</Button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {curricula.map((c) => (
                <div key={c.id} className="group rounded-xl border border-border bg-card p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/tutor/curricula/${c.id}`} className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition">{c.title}</h3>
                      {c.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{c.description}</p>}
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant={c.is_published ? "default" : "secondary"} className="text-xs">
                          {c.is_published ? <><Eye className="w-3 h-3 mr-1" /> Published</> : <><EyeOff className="w-3 h-3 mr-1" /> Draft</>}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </Link>
                    <div className="flex flex-col items-end gap-2">
                      <Switch
                        checked={c.is_published}
                        onCheckedChange={(v) => update.mutate({ id: c.id, patch: { is_published: v } })}
                        aria-label="Publish toggle"
                      />
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => {
                          if (confirm(`Delete "${c.title}"? This removes all topics and materials.`)) remove.mutate(c.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <Link to={`/tutor/curricula/${c.id}`} className="mt-3 flex items-center justify-between text-sm text-primary font-medium">
                    Open builder <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Curriculum</DialogTitle>
            <DialogDescription>You can edit details and publish later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ct">Title *</Label>
              <Input id="ct" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. PHY 101 Crash Course" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cd">Description</Label>
              <Textarea id="cd" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="What students will learn..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={create.isPending}>
              {create.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </DialogFooter>
      </Dialog>
    </>
  );
}
