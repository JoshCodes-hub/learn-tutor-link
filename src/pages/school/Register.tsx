import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppScreen from "@/components/app-shell/AppScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { School, Loader2 } from "lucide-react";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta",
  "Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi",
  "Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
  "Taraba","Yobe","Zamfara"
];

const SchoolRegister = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "", state: "Lagos", lga: "", address: "",
    phone: "", email: "", motto: "", principal_name: "", approval_number: "",
  });

  useEffect(() => {
    if (!isLoading && !user) navigate("/auth?next=/school/register");
  }, [isLoading, user, navigate]);

  // If user already has a school, skip
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("schools").select("id,status").eq("owner_id", user.id).maybeSingle();
      if (data) navigate(data.status === "approved" ? "/school/dashboard" : "/school/pending", { replace: true });
    })();
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim()) return toast.error("School name is required");
    setSubmitting(true);
    const { error } = await supabase.from("schools").insert({ ...form, owner_id: user.id });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Application submitted — we'll review it shortly");
    navigate("/school/pending", { replace: true });
  };

  return (
    <AppScreen title="Register your school" subtitle="Takes under 2 minutes" back>
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <School className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-sm">School Management Suite</div>
            <div className="text-xs text-muted-foreground">Classes · Attendance · Results · Fees · Parents</div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>School name *</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bright Future College" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>State *</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              >
                {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label>LGA</Label>
              <Input value={form.lga} onChange={(e) => setForm({ ...form, lga: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone / WhatsApp</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>School email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Principal name</Label>
            <Input value={form.principal_name} onChange={(e) => setForm({ ...form, principal_name: e.target.value })} />
          </div>
          <div>
            <Label>School motto</Label>
            <Input value={form.motto} onChange={(e) => setForm({ ...form, motto: e.target.value })} />
          </div>
          <div>
            <Label>Ministry of Education approval no. <span className="text-muted-foreground">(optional)</span></Label>
            <Input value={form.approval_number} onChange={(e) => setForm({ ...form, approval_number: e.target.value })} />
          </div>
          <Button type="submit" size="lg" className="w-full h-12 rounded-2xl" disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Submit application
          </Button>
        </form>
      </div>
    </AppScreen>
  );
};

export default SchoolRegister;
