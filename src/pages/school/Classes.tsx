import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppScreen from "@/components/app-shell/AppScreen";
import AppListItem from "@/components/app-shell/AppListItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

const LEVELS = ["JSS1","JSS2","JSS3","SS1","SS2","SS3"];

export default function SchoolClasses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState("JSS1");
  const [arm, setArm] = useState("A");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: school } = await supabase.from("schools").select("id,status").eq("owner_id", user.id).maybeSingle();
      if (!school || school.status !== "approved") return navigate("/school/register");
      setSchoolId(school.id);
      const { data } = await supabase.from("school_classes").select("*").eq("school_id", school.id).order("level");
      setClasses(data || []);
      setLoading(false);
    })();
  }, [user, navigate]);

  const add = async () => {
    if (!schoolId) return;
    const { error, data } = await supabase.from("school_classes").insert({ school_id: schoolId, level, arm }).select().single();
    if (error) return toast.error(error.message);
    setClasses([...classes, data]);
    toast.success(`${level} ${arm} added`);
  };

  return (
    <AppScreen title="Classes" subtitle="JSS1 – SS3 with arms" back>
      <div className="max-w-lg mx-auto">
        <div className="flex gap-2 mb-4">
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="h-10 px-3 rounded-md border border-input bg-background text-sm flex-1">
            {LEVELS.map((l) => <option key={l}>{l}</option>)}
          </select>
          <Input value={arm} onChange={(e) => setArm(e.target.value.toUpperCase())} maxLength={2} className="w-20" />
          <Button onClick={add}><Plus className="w-4 h-4" /></Button>
        </div>

        {loading ? <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" /> : (
          <div className="space-y-2">
            {classes.map((c) => (
              <AppListItem key={c.id} icon={BookOpen} title={`${c.level} ${c.arm}`} subtitle="Tap to view students" onClick={() => navigate(`/school/students?class=${c.id}`)} />
            ))}
            {classes.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No classes yet. Add your first above.</p>}
          </div>
        )}
      </div>
    </AppScreen>
  );
}
