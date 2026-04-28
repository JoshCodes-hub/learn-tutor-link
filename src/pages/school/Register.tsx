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
import { School, Loader2, ChevronLeft, ChevronRight, Upload, ShieldCheck } from "lucide-react";
import DocumentUploadField from "@/components/applications/DocumentUploadField";
import { motion, AnimatePresence } from "framer-motion";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta",
  "Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi",
  "Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
  "Taraba","Yobe","Zamfara",
];

const CLASS_OPTIONS = ["Nursery", "Primary", "JSS (1-3)", "SSS (1-3)"];
const STEPS = ["Identity", "Legal", "Leadership", "Capacity"] as const;

interface FormState {
  // Identity
  name: string; logo_url: string | null; established_year: string;
  state: string; lga: string; address: string; motto: string;
  // Legal
  approval_number: string; approval_letter_url: string | null; cac_document_url: string | null;
  // Leadership
  principal_name: string; principal_phone: string; owner_id_url: string | null;
  official_email: string; official_phone: string;
  // Capacity
  student_count: string; classes_offered: string[]; website: string; social_link: string;
}

const initial: FormState = {
  name: "", logo_url: null, established_year: "", state: "Lagos", lga: "", address: "", motto: "",
  approval_number: "", approval_letter_url: null, cac_document_url: null,
  principal_name: "", principal_phone: "", owner_id_url: null,
  official_email: "", official_phone: "",
  student_count: "", classes_offered: [], website: "", social_link: "",
};

const SchoolRegister = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!isLoading && !user) navigate("/auth?next=/school/register"); }, [isLoading, user, navigate]);

  // If user already has a school, skip
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("schools").select("id,status").eq("owner_id", user.id).maybeSingle();
      if (data) navigate(data.status === "approved" ? "/school/dashboard" : "/school/pending", { replace: true });
    })();
  }, [user, navigate]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const toggleClass = (c: string) => {
    update("classes_offered",
      form.classes_offered.includes(c) ? form.classes_offered.filter((x) => x !== c) : [...form.classes_offered, c]
    );
  };

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!form.name.trim()) return "School name required";
      if (!form.state) return "State required";
      if (!form.address.trim()) return "Address required";
    }
    if (step === 1) {
      if (!form.approval_number.trim()) return "Ministry of Education approval number required";
      if (!form.approval_letter_url) return "Upload the approval letter";
    }
    if (step === 2) {
      if (!form.principal_name.trim()) return "Principal name required";
      if (form.principal_phone.trim().length < 10) return "Valid principal phone required";
      if (!form.owner_id_url) return "Upload owner ID";
      if (!form.official_email.includes("@")) return "Valid school email required";
      if (form.official_phone.trim().length < 10) return "Valid official phone required";
    }
    if (step === 3) {
      if (!form.student_count || Number(form.student_count) <= 0) return "Enter total student count";
      if (form.classes_offered.length === 0) return "Pick at least one class level";
    }
    return null;
  };

  const next = () => { const e = validateStep(); if (e) return toast.error(e); setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    if (!user) return;
    const e = validateStep(); if (e) return toast.error(e);
    setSubmitting(true);
    const { error } = await supabase.from("schools").insert({
      owner_id: user.id,
      name: form.name,
      logo_url: form.logo_url,
      established_year: form.established_year ? Number(form.established_year) : null,
      state: form.state, lga: form.lga, address: form.address, motto: form.motto,
      approval_number: form.approval_number,
      approval_letter_url: form.approval_letter_url,
      cac_document_url: form.cac_document_url,
      principal_name: form.principal_name,
      principal_phone: form.principal_phone,
      owner_id_url: form.owner_id_url,
      official_email: form.official_email, email: form.official_email,
      official_phone: form.official_phone, phone: form.official_phone,
      student_count: form.student_count ? Number(form.student_count) : null,
      classes_offered: form.classes_offered,
      website: form.website || null,
      social_link: form.social_link || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Application submitted — we'll review it shortly");
    navigate("/school/pending", { replace: true });
  };

  return (
    <AppScreen title="Register your school" subtitle={`Step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`} back>
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20 mb-5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <School className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-sm">School Management Suite</div>
            <div className="text-xs text-muted-foreground">Classes · Attendance · Results · Fees · Parents</div>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {step === 0 && user && (
              <>
                <div>
                  <Label>School name *</Label>
                  <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Bright Future College" />
                </div>
                <DocumentUploadField
                  userId={user.id} kind="school-logo" label="School Logo"
                  description="Square image works best (JPG/PNG)"
                  accept="image" value={form.logo_url} onChange={(u) => update("logo_url", u)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Established Year</Label>
                    <Input type="number" min={1900} max={new Date().getFullYear()} value={form.established_year} onChange={(e) => update("established_year", e.target.value)} placeholder="2005" />
                  </div>
                  <div>
                    <Label>State *</Label>
                    <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.state} onChange={(e) => update("state", e.target.value)}>
                      {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <Label>LGA</Label>
                  <Input value={form.lga} onChange={(e) => update("lga", e.target.value)} />
                </div>
                <div>
                  <Label>Address *</Label>
                  <Textarea rows={2} value={form.address} onChange={(e) => update("address", e.target.value)} />
                </div>
                <div>
                  <Label>School motto</Label>
                  <Input value={form.motto} onChange={(e) => update("motto", e.target.value)} />
                </div>
              </>
            )}

            {step === 1 && user && (
              <>
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Verification keeps the platform trusted. We never share these documents publicly.
                  </p>
                </div>
                <div>
                  <Label>Ministry of Education Approval Number *</Label>
                  <Input value={form.approval_number} onChange={(e) => update("approval_number", e.target.value)} placeholder="e.g. MOE/LAG/2018/0123" />
                </div>
                <DocumentUploadField
                  userId={user.id} kind="approval-letter" label="Approval Letter"
                  description="Scanned MoE approval document (PDF or image)"
                  required value={form.approval_letter_url} onChange={(u) => update("approval_letter_url", u)}
                />
                <DocumentUploadField
                  userId={user.id} kind="cac-document" label="CAC Document (if private)"
                  description="Optional: Certificate of Incorporation for private schools"
                  value={form.cac_document_url} onChange={(u) => update("cac_document_url", u)}
                />
              </>
            )}

            {step === 2 && user && (
              <>
                <div>
                  <Label>Principal Name *</Label>
                  <Input value={form.principal_name} onChange={(e) => update("principal_name", e.target.value)} />
                </div>
                <div>
                  <Label>Principal Phone *</Label>
                  <Input type="tel" value={form.principal_phone} onChange={(e) => update("principal_phone", e.target.value)} placeholder="08012345678" />
                </div>
                <DocumentUploadField
                  userId={user.id} kind="owner-id" label="Owner / Proprietor ID"
                  description="Government ID of the school owner (PDF or image)"
                  required value={form.owner_id_url} onChange={(u) => update("owner_id_url", u)}
                />
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label>Official School Email *</Label>
                    <Input type="email" value={form.official_email} onChange={(e) => update("official_email", e.target.value)} placeholder="info@school.com" />
                  </div>
                  <div>
                    <Label>Official School Phone *</Label>
                    <Input type="tel" value={form.official_phone} onChange={(e) => update("official_phone", e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <Label>Total Student Count *</Label>
                  <Input type="number" min={1} value={form.student_count} onChange={(e) => update("student_count", e.target.value)} placeholder="e.g. 250" />
                </div>
                <div>
                  <Label>Classes Offered *</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {CLASS_OPTIONS.map((c) => {
                      const active = form.classes_offered.includes(c);
                      return (
                        <button
                          type="button" key={c} onClick={() => toggleClass(c)}
                          className={`rounded-xl border p-3 text-sm text-left transition-all ${active ? "border-primary bg-primary/10 font-medium" : "border-border hover:border-primary/40"}`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label>Website</Label>
                  <Input type="url" value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://school.com" />
                </div>
                <div>
                  <Label>Social Media Link</Label>
                  <Input type="url" value={form.social_link} onChange={(e) => update("social_link", e.target.value)} placeholder="Facebook / Instagram / X" />
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3 mt-8 pt-5 border-t border-border">
          <Button variant="outline" onClick={back} disabled={step === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : <><Upload className="w-4 h-4 mr-2" /> Submit Application</>}
            </Button>
          )}
        </div>
      </div>
    </AppScreen>
  );
};

export default SchoolRegister;
