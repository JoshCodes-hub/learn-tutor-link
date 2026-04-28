import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, Save, Building2 } from "lucide-react";
import AppScreen from "@/components/app-shell/AppScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentSchool } from "@/hooks/useCurrentSchool";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PALETTE = [
  { name: "Royal Navy", hex: "#1e3a8a" },
  { name: "Emerald",    hex: "#047857" },
  { name: "Burgundy",   hex: "#9f1239" },
  { name: "Royal Blue", hex: "#1d4ed8" },
  { name: "Charcoal",   hex: "#1f2937" },
  { name: "Heritage Gold", hex: "#a16207" },
];

export default function SchoolSettings() {
  const { school, loading, refetch } = useCurrentSchool();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (school) setForm({
      name: school.name || "",
      motto: (school as any).motto || "",
      address: school.address || "",
      phone: school.phone || "",
      email: school.email || "",
      principal_name: school.principal_name || "",
      brand_color: (school as any).brand_color || "#1e3a8a",
      report_footer: (school as any).report_footer || "",
      logo_url: (school as any).logo_url || "",
    });
  }, [school]);

  const onUpload = async (file: File) => {
    if (!school) return;
    setUploading(true);
    const path = `${school.id}/logo-${Date.now()}.${file.name.split(".").pop() || "png"}`;
    const { error } = await supabase.storage.from("school-logos").upload(path, file, { upsert: true, cacheControl: "3600" });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("school-logos").getPublicUrl(path);
    setForm((f: any) => ({ ...f, logo_url: data.publicUrl }));
    setUploading(false);
    toast.success("Logo uploaded");
  };

  const save = async () => {
    if (!school || !form) return;
    setSaving(true);
    const { error } = await supabase.from("schools").update({
      name: form.name, motto: form.motto, address: form.address, phone: form.phone,
      email: form.email, principal_name: form.principal_name,
      brand_color: form.brand_color, report_footer: form.report_footer, logo_url: form.logo_url,
    }).eq("id", school.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("School details updated");
    refetch?.();
  };

  if (loading || !form) return <AppScreen><Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mt-20" /></AppScreen>;

  return (
    <AppScreen title="School settings" subtitle="Branding & info on report cards" back>
      <div className="max-w-2xl mx-auto pb-28 space-y-5">
        {/* Live preview */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
            Report-card header preview
          </div>
          <div className="p-4 flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center bg-muted overflow-hidden border-2"
              style={{ borderColor: form.brand_color }}
            >
              {form.logo_url
                ? <img src={form.logo_url} alt="" className="w-full h-full object-contain" />
                : <Building2 className="w-7 h-7 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-lg font-bold truncate" style={{ color: form.brand_color, fontFamily: "Georgia, serif" }}>
                {(form.name || "School Name").toUpperCase()}
              </div>
              {form.motto && <div className="text-xs italic text-muted-foreground truncate">"{form.motto}"</div>}
              <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                {[form.address, form.phone, form.email].filter(Boolean).join("  ·  ")}
              </div>
              <div className="h-[3px] mt-2 rounded-full" style={{ backgroundColor: form.brand_color }} />
            </div>
          </div>
        </div>

        {/* Logo upload */}
        <Field label="School logo">
          <div className="flex items-center gap-3">
            <Button variant="outline" type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              {form.logo_url ? "Replace logo" : "Upload logo"}
            </Button>
            <p className="text-[11px] text-muted-foreground">PNG or JPG, square works best.</p>
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
          </div>
        </Field>

        {/* Brand color */}
        <Field label="Brand colour" hint="Used on report-card header and stripe">
          <div className="grid grid-cols-6 gap-2">
            {PALETTE.map((p) => (
              <button
                key={p.hex} type="button" title={p.name}
                onClick={() => setForm((f: any) => ({ ...f, brand_color: p.hex }))}
                className={cn("h-10 rounded-xl border-2 transition-all",
                  form.brand_color === p.hex ? "scale-105 ring-2 ring-offset-2 ring-foreground/20" : "border-transparent")}
                style={{ backgroundColor: p.hex }}
              />
            ))}
          </div>
        </Field>

        <Field label="School name">
          <Input value={form.name} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Motto" hint="Shown beneath the school name on every report">
          <Input value={form.motto} onChange={(e) => setForm((f: any) => ({ ...f, motto: e.target.value }))} placeholder="e.g. Knowledge & Discipline" />
        </Field>
        <Field label="Address">
          <Input value={form.address} onChange={(e) => setForm((f: any) => ({ ...f, address: e.target.value }))} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))} /></Field>
          <Field label="Email"><Input value={form.email} onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))} /></Field>
        </div>
        <Field label="Principal's name">
          <Input value={form.principal_name} onChange={(e) => setForm((f: any) => ({ ...f, principal_name: e.target.value }))} />
        </Field>
        <Field label="Report footer line" hint="Optional, e.g. school website or accreditation note">
          <Textarea rows={2} value={form.report_footer} onChange={(e) => setForm((f: any) => ({ ...f, report_footer: e.target.value }))} />
        </Field>
      </div>

      <div className="fixed bottom-0 inset-x-0 px-4 pb-3 bg-gradient-to-t from-background via-background to-transparent z-30"
           style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}>
        <div className="max-w-2xl mx-auto">
          <Button onClick={save} disabled={saving} className="w-full h-12 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold shadow-glow">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save changes</>}
          </Button>
        </div>
      </div>
    </AppScreen>
  );
}

const Field = ({ label, hint, children }: any) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-foreground">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);
