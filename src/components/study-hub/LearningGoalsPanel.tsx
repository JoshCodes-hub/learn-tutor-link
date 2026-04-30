import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Plus, Trash2, CalendarClock, Trophy, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Goal {
  id: string;
  title: string;
  topics: string[];
  target_date: string | null;
  completed_topics: string[];
}

interface Props {
  courseId: string;
  className?: string;
}

export const LearningGoalsPanel = ({ courseId, className }: Props) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [topicsRaw, setTopicsRaw] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("learning_goals")
      .select("id, title, topics, target_date, completed_topics")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });
    setGoals((data ?? []).map((g: any) => ({
      ...g,
      topics: Array.isArray(g.topics) ? g.topics : [],
      completed_topics: Array.isArray(g.completed_topics) ? g.completed_topics : [],
    })));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, courseId]);

  const create = async () => {
    if (!user) return;
    const topics = topicsRaw.split("\n").map(t => t.trim()).filter(Boolean);
    if (!title.trim() || topics.length === 0) {
      toast.error("Add a title and at least one topic.");
      return;
    }
    setCreating(true);
    const { error } = await (supabase as any).from("learning_goals").insert({
      user_id: user.id,
      course_id: courseId,
      title: title.trim(),
      topics,
      target_date: targetDate || null,
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    setTitle(""); setTopicsRaw(""); setTargetDate(""); setShowForm(false);
    toast.success("Goal created");
    load();
  };

  const toggleTopic = async (g: Goal, topic: string) => {
    const next = g.completed_topics.includes(topic)
      ? g.completed_topics.filter(t => t !== topic)
      : [...g.completed_topics, topic];
    setGoals(prev => prev.map(x => x.id === g.id ? { ...x, completed_topics: next } : x));
    await (supabase as any).from("learning_goals").update({ completed_topics: next }).eq("id", g.id);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this goal?")) return;
    await (supabase as any).from("learning_goals").delete().eq("id", id);
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const daysLeft = (d: string | null) => {
    if (!d) return null;
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl border border-amber-100/60",
      "bg-gradient-to-br from-white via-amber-50/30 to-white",
      "shadow-[0_8px_40px_-16px_rgba(180,140,40,0.30)]",
      className
    )}>
      <div className="pointer-events-none absolute -top-20 -right-12 h-40 w-40 rounded-full bg-gradient-to-br from-amber-300/30 to-transparent blur-3xl" />

      <div className="relative flex items-center justify-between px-5 pt-5 pb-3 border-b border-amber-100/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold tracking-tight">Learning Goals</h3>
            <p className="text-xs text-muted-foreground">Plan topics, track progress</p>
          </div>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)} className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
            <Plus className="h-3.5 w-3.5" /> New Goal
          </Button>
        )}
      </div>

      <div className="relative px-5 py-4 space-y-3 max-h-[440px] overflow-y-auto">
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl border border-amber-200 bg-white p-3 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">New goal</p>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}><X className="h-3.5 w-3.5" /></Button>
              </div>
              <Input placeholder="Goal title (e.g. Master Thermodynamics)" value={title} onChange={e => setTitle(e.target.value)} className="border-amber-100" />
              <textarea
                placeholder="Topics (one per line)&#10;e.g. First law&#10;Entropy&#10;Carnot cycle"
                value={topicsRaw}
                onChange={e => setTopicsRaw(e.target.value)}
                rows={4}
                className="w-full text-sm rounded-md border border-amber-100 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
              <div className="flex gap-2 items-center">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="border-amber-100" />
              </div>
              <Button onClick={create} disabled={creating} className="w-full bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create goal"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
        ) : goals.length === 0 && !showForm ? (
          <div className="text-center py-8">
            <Target className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm font-medium">No goals yet</p>
            <p className="text-xs text-muted-foreground">Set targets and let your AI coach help you crush them.</p>
          </div>
        ) : (
          goals.map(g => {
            const done = g.completed_topics.length;
            const total = g.topics.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const dl = daysLeft(g.target_date);
            const isComplete = done === total && total > 0;
            return (
              <motion.div
                key={g.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-2xl border p-3 bg-white",
                  isComplete ? "border-emerald-200 bg-emerald-50/40" : "border-amber-100"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm flex items-center gap-1.5">
                      {isComplete && <Trophy className="h-3.5 w-3.5 text-emerald-600" />}
                      {g.title}
                    </p>
                    {dl !== null && (
                      <Badge variant="outline" className={cn(
                        "mt-1 text-[10px]",
                        dl < 0 ? "border-rose-200 text-rose-700 bg-rose-50"
                          : dl <= 3 ? "border-amber-200 text-amber-800 bg-amber-50"
                            : "border-emerald-200 text-emerald-700 bg-emerald-50"
                      )}>
                        <CalendarClock className="h-3 w-3 mr-1" />
                        {dl < 0 ? `${Math.abs(dl)}d overdue` : dl === 0 ? "Due today" : `${dl} day${dl > 1 ? "s" : ""} left`}
                      </Badge>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => remove(g.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>

                <div className="mb-2">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">{done}/{total} topics</span>
                    <span className={cn("font-semibold", isComplete ? "text-emerald-700" : "text-amber-700")}>{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-amber-100/60 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7 }}
                      className={cn("h-full rounded-full bg-gradient-to-r", isComplete ? "from-emerald-400 to-emerald-600" : "from-amber-400 to-amber-600")}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  {g.topics.map(topic => {
                    const checked = g.completed_topics.includes(topic);
                    return (
                      <label key={topic} className="flex items-center gap-2 cursor-pointer text-sm group">
                        <Checkbox checked={checked} onCheckedChange={() => toggleTopic(g, topic)} />
                        <span className={cn(checked && "line-through text-muted-foreground")}>{topic}</span>
                      </label>
                    );
                  })}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LearningGoalsPanel;
