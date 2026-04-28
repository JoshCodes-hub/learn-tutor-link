import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Clock, Loader2, CalendarDays, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSchool } from "@/hooks/useCurrentSchool";
import AppScreen from "@/components/app-shell/AppScreen";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Status = "present" | "absent" | "late";

const STATUS_META: Record<Status, { label: string; icon: any; tint: string; ring: string }> = {
  present: { label: "Present", icon: Check, tint: "bg-success text-success-foreground", ring: "ring-success/40" },
  late:    { label: "Late",    icon: Clock, tint: "bg-amber-500 text-white",            ring: "ring-amber-400/40" },
  absent:  { label: "Absent",  icon: X,     tint: "bg-destructive text-destructive-foreground", ring: "ring-destructive/40" },
};

export default function SchoolAttendance() {
  const { school, loading: sloading } = useCurrentSchool();
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!school) return;
    supabase.from("school_classes").select("*").eq("school_id", school.id).order("level").then(({ data }) => {
      setClasses(data || []);
      if (data?.[0]) setClassId(data[0].id);
    });
  }, [school]);

  useEffect(() => {
    if (!school || !classId) return;
    setLoading(true);
    (async () => {
      const { data: roster } = await supabase
        .from("school_students")
        .select("*")
        .eq("school_id", school.id)
        .eq("class_id", classId)
        .eq("is_active", true)
        .order("full_name");
      setStudents(roster || []);

      const { data: existing } = await supabase
        .from("attendance")
        .select("student_id,status")
        .eq("school_id", school.id)
        .eq("class_id", classId)
        .eq("date", date);

      const next: Record<string, Status> = {};
      (existing || []).forEach((r: any) => (next[r.student_id] = r.status as Status));
      // default everyone to present for one-tap mark
      (roster || []).forEach((s: any) => { if (!next[s.id]) next[s.id] = "present"; });
      setMarks(next);
      setLoading(false);
    })();
  }, [school, classId, date]);

  const summary = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0 };
    Object.values(marks).forEach((s) => (c[s] += 1));
    return c;
  }, [marks]);

  const setStatus = (sid: string, s: Status) => setMarks((m) => ({ ...m, [sid]: s }));

  const save = async () => {
    if (!school || !classId) return;
    setSaving(true);
    // delete + insert for that day/class
    await supabase.from("attendance").delete().eq("school_id", school.id).eq("class_id", classId).eq("date", date);
    const rows = Object.entries(marks).map(([student_id, status]) => ({
      school_id: school.id, class_id: classId, student_id, date, status,
    }));
    if (rows.length) {
      const { error } = await supabase.from("attendance").insert(rows);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    toast.success("Attendance saved");
    setSaving(false);
  };

  if (sloading) return <AppScreen><Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mt-20" /></AppScreen>;

  return (
    <AppScreen title="Attendance" subtitle={school?.name} back>
      <div className="max-w-2xl mx-auto pb-24">
        {/* Hero summary */}
        <div className="relative overflow-hidden rounded-3xl p-5 mb-4 border border-primary/20 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
          <div className="flex items-center justify-between mb-3 relative">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Today's roll call</div>
              <div className="font-display text-2xl font-bold leading-tight">{summary.present}/{students.length} <span className="text-sm font-normal text-muted-foreground">present</span></div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["present","late","absent"] as Status[]).map((s) => {
              const m = STATUS_META[s];
              return (
                <div key={s} className="rounded-2xl bg-background/60 backdrop-blur p-3 border border-border/40">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center mb-1", m.tint)}>
                    <m.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-display text-lg font-bold">{summary[s]}</div>
                  <div className="text-[10px] text-muted-foreground">{m.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-3">
          <select
            value={classId ?? ""}
            onChange={(e) => setClassId(e.target.value)}
            className="flex-1 h-11 px-3 rounded-2xl border border-border bg-card text-sm font-medium"
          >
            {classes.map((c) => <option key={c.id} value={c.id}>{c.level} {c.arm}</option>)}
          </select>
          <label className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 pl-9 pr-3 rounded-2xl border border-border bg-card text-sm font-medium"
            />
          </label>
        </div>

        {/* Roster */}
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mt-10" />
        ) : students.length === 0 ? (
          <div className="text-center py-12 rounded-3xl border border-dashed border-border/60">
            <p className="text-sm text-muted-foreground">No students in this class yet.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {students.map((s, i) => {
                const status = marks[s.id] ?? "present";
                const meta = STATUS_META[status];
                return (
                  <motion.li
                    key={s.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.015 }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/50 ring-1 transition-all",
                      meta.ring
                    )}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center font-display font-bold text-xs text-primary">
                      {s.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.full_name}</div>
                      <div className="text-[10px] text-muted-foreground">{s.student_code}</div>
                    </div>
                    <div className="flex gap-1 bg-muted/60 rounded-xl p-0.5">
                      {(["present","late","absent"] as Status[]).map((s2) => {
                        const Icon = STATUS_META[s2].icon;
                        const active = status === s2;
                        return (
                          <button
                            key={s2}
                            aria-label={STATUS_META[s2].label}
                            onClick={() => setStatus(s.id, s2)}
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90",
                              active ? STATUS_META[s2].tint + " shadow-sm" : "text-muted-foreground"
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {students.length > 0 && (
        <div className="fixed bottom-16 inset-x-0 px-4 pb-3 bg-gradient-to-t from-background via-background to-transparent z-30 md:bottom-0 md:pb-6" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}>
          <div className="max-w-2xl mx-auto">
            <Button onClick={save} disabled={saving} className="w-full h-12 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold shadow-glow">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : `Save attendance · ${date}`}
            </Button>
          </div>
        </div>
      )}
    </AppScreen>
  );
}
