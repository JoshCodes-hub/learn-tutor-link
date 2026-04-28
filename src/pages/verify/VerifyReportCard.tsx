import { useEffect, useState } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ShieldCheck, ShieldX, Loader2, Search, BadgeCheck, School, GraduationCap } from "lucide-react";
import { lookupVerification } from "@/lib/reportCardVerification";
import { motion } from "framer-motion";
import { SEO } from "@/components/seo/SEO";
import SiteFooter from "@/components/layout/SiteFooter";

type Status = "idle" | "checking" | "valid" | "invalid";

export default function VerifyReportCard() {
  const [params, setParams] = useSearchParams();
  const routeParams = useParams<{ id?: string }>();
  const [code, setCode] = useState(routeParams.id || params.get("id") || "");
  const [status, setStatus] = useState<Status>("idle");
  const [record, setRecord] = useState<any>(null);

  const verify = async (raw: string) => {
    const id = raw.trim();
    if (!id) return;
    setStatus("checking");
    setRecord(null);
    try {
      const data = await lookupVerification(id);
      if (data) {
        setRecord(data);
        setStatus("valid");
      } else {
        setStatus("invalid");
      }
    } catch {
      setStatus("invalid");
    }
  };

  useEffect(() => {
    const id = routeParams.id || params.get("id");
    if (id) verify(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeParams.id]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setParams({ id: code });
    verify(code);
  };

  return (
    <>
      <SEO title="Verify Report Card" description="Validate the authenticity of a school report card issued on OverraPrep AI." />

      <main className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 px-4 py-10">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-4">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">Verify Report Card</h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              Enter the verification ID printed at the bottom of the report card to confirm it was issued by an OverraPrep AI school.
            </p>
          </div>

          <Card variant="elevated" className="mb-6">
            <CardContent className="p-5">
              <form onSubmit={onSubmit} className="flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC-2T-X9F2A1B"
                  className="font-mono uppercase"
                  maxLength={32}
                />
                <Button type="submit" disabled={status === "checking" || !code.trim()}>
                  {status === "checking" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-1" /> Verify</>}
                </Button>
              </form>
            </CardContent>
          </Card>

          {status === "valid" && record && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-success/30 bg-success/5">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="w-5 h-5 text-success" />
                    <CardTitle className="text-lg text-success">Authentic — verified record</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Row icon={School} label="School" value={record.school_name} />
                  <Row icon={GraduationCap} label="Student" value={record.student_name} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Class" value={record.class_label || "—"} />
                    <Field label="Term" value={record.term_label || "—"} />
                    <Field label="Total" value={record.total_score != null ? Number(record.total_score).toFixed(1) : "—"} />
                    <Field label="Average" value={record.average_score != null ? `${Number(record.average_score).toFixed(1)}%` : "—"} />
                    <Field label="Position" value={record.position ? `#${record.position} of ${record.class_size}` : "—"} />
                    <Field label="Issued" value={new Date(record.issued_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} />
                  </div>
                  <div className="pt-2 text-[11px] text-muted-foreground font-mono break-all">
                    Verification ID: {record.verification_id}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {status === "invalid" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ShieldX className="w-5 h-5 text-destructive" />
                    <CardTitle className="text-lg text-destructive">Could not verify this ID</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    No record matches that verification ID. Double-check for typos. If the issue persists, please contact the issuing school directly.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

const Row = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/40">
    <Icon className="w-4 h-4 text-primary mt-0.5" />
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  </div>
);

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="p-3 rounded-xl bg-card border border-border/40">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
    <p className="font-semibold text-foreground text-sm">{value}</p>
  </div>
);
