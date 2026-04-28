import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Loader2, Search, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSchool } from "@/hooks/useCurrentSchool";
import AppScreen from "@/components/app-shell/AppScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const genCode = () => "STU-" + Math.random().toString(36).slice(2, 7).toUpperCase();

export default function SchoolStudents() {
  const { school, loading: sloading } = useCurrentSchool();
  const [params] = useSearchParams();
  const initialClass = params.get("class");
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState<string | null>(initialClass);
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [gender, setGender] = useState("M");
  const [parentPhone, setParentPhone] = useState("");
  const [newClassId, setNewClassId] = useState<string | null>(null);

  const refresh = async () => {
    if (!school) return;
    setLoading(true);
    const { data } = await supabase
      .from("school_students")
      .select("*")
      .eq("school_id", school.id)
      .eq("is_active", true)
      .order("full_name");
    setStudents(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!school) return;
    supabase.from("school_classes").select("*").eq("school_id", school.id).order("level").then(({ data }) => {
      setClasses(data || []);
      if (!newClassId && data?.[0]) setNewClassId(data[0].id);
    });
    refresh();
  }, [school]);

  const filtered = useMemo(() => {
    return students.filter((s) =>
      (!classId || s.class_id === classId) &&
      (!search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.student_code.toLowerCase().includes(search.toLowerCase()))
    );
  }, [students, classId, search]);

  const add = async () => {
    if (!school || !name.trim() || !newClassId) return toast.error("Name and class required");
    const { error } = await supabase.from("school_students").insert({
      school_id: school.id,
      class_id: newClassId,
      full_name: name.trim(),
      gender,
      parent_phone: parentPhone || null,
      student_code: genCode(),
    });
    if (error) return toast.error(error.message);
    toast.success("Student admitted");
    setName(""); setParentPhone(""); setOpen(false);
    refresh();
  };

  if (sloading) return <AppScreen><Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mt-20" /></AppScreen>;

  return (
    <AppScreen title="Students" subtitle={`${filtered.length} learners`} back right={
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-glow active:scale-95">
            <Plus className="w-4 h-4" />
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Admit student</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex gap-2">
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm">
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
              <select value={newClassId ?? ""} onChange={(e) => setNewClassId(e.target.value)} className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm">
                {classes.map((c) => <option key={c.id} value={c.id}>{c.level} {c.arm}</option>)}
              </select>
            </div>
            <Input placeholder="Parent phone (optional)" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} />
            <Button className="w-full" onClick={add}><UserPlus className="w-4 h-4 mr-2" /> Admit</Button>
          </div>
        </DialogContent>
      </Dialog>
    }>
      <div className="max-w-2xl mx-auto">
        {/* Search + class chips */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search name or code…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11 rounded-2xl" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 -mx-1 px-1 scrollbar-hide">
          <Chip active={!classId} onClick={() => setClassId(null)}>All</Chip>
          {classes.map((c) => (
            <Chip key={c.id} active={classId === c.id} onClick={() => setClassId(c.id)}>{c.level} {c.arm}</Chip>
          ))}
        </div>

        {loading ? <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mt-6" /> : filtered.length === 0 ? (
          <div className="text-center py-12 rounded-3xl border border-dashed border-border/60">
            <p className="text-sm text-muted-foreground">No students. Tap + to admit one.</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((s, i) => {
              const cls = classes.find((c) => c.id === s.class_id);
              return (
                <motion.li
                  key={s.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.015 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/50"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center font-display font-bold text-primary text-xs">
                    {s.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{s.full_name}</div>
                    <div className="text-[10px] text-muted-foreground">{s.student_code} · {cls ? `${cls.level} ${cls.arm}` : "Unassigned"}</div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{s.gender}</span>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </AppScreen>
  );
}

const Chip = ({ active, onClick, children }: any) => (
  <button onClick={onClick}
    className={`shrink-0 px-3.5 h-8 rounded-full text-xs font-semibold transition-all ${
      active ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"
    }`}>{children}</button>
);
