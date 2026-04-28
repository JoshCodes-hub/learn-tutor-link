import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Plus, Loader2, Receipt, TrendingUp, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSchool } from "@/hooks/useCurrentSchool";
import AppScreen from "@/components/app-shell/AppScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const naira = (n: number) => "₦" + (n || 0).toLocaleString();

export default function SchoolFees() {
  const { school, loading: sloading } = useCurrentSchool();
  const [fees, setFees] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");

  const refresh = async () => {
    if (!school) return;
    setLoading(true);
    const [{ data: f }, { data: p }] = await Promise.all([
      supabase.from("fees").select("*").eq("school_id", school.id).eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("fee_payments").select("*").eq("school_id", school.id).order("paid_on", { ascending: false }).limit(20),
    ]);
    setFees(f || []);
    setPayments(p || []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [school]);

  const totalExpected = fees.reduce((s, f) => s + Number(f.amount || 0), 0);
  const totalCollected = payments.reduce((s, p) => s + Number(p.amount_paid || 0), 0);
  const collectionPct = totalExpected ? Math.min(100, Math.round((totalCollected / totalExpected) * 100)) : 0;

  const addFee = async () => {
    if (!school || !title.trim() || !amount) return;
    const { error } = await supabase.from("fees").insert({
      school_id: school.id, title: title.trim(), amount: Number(amount),
    });
    if (error) return toast.error(error.message);
    toast.success("Fee item added");
    setOpen(false); setTitle(""); setAmount("");
    refresh();
  };

  if (sloading) return <AppScreen><Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mt-20" /></AppScreen>;

  return (
    <AppScreen title="Fees" subtitle={school?.name} back right={
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-glow active:scale-95">
            <Plus className="w-4 h-4" />
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>New fee item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="e.g. First term tuition" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input type="number" placeholder="Amount in ₦" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Button className="w-full" onClick={addFee}>Add fee</Button>
          </div>
        </DialogContent>
      </Dialog>
    }>
      <div className="max-w-2xl mx-auto">
        {/* Premium revenue card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-5 mb-4 text-primary-foreground bg-gradient-to-br from-amber-500 via-primary to-amber-700 shadow-glow"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-black/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest opacity-90 mb-1">
              <Wallet className="w-3.5 h-3.5" /> Collected this term
            </div>
            <div className="font-display text-3xl font-bold mb-1">{naira(totalCollected)}</div>
            <div className="text-xs opacity-80 mb-3">of {naira(totalExpected)} expected</div>
            <div className="h-2 rounded-full bg-black/20 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${collectionPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-white/90 rounded-full"
              />
            </div>
            <div className="flex justify-between mt-2 text-[11px] opacity-80">
              <span>{collectionPct}% collected</span>
              <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {payments.length} payments</span>
            </div>
          </div>
        </motion.div>

        {/* Fee items */}
        <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Fee structure</h2>
        {loading ? <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" /> : fees.length === 0 ? (
          <div className="text-center py-10 rounded-3xl border border-dashed border-border/60">
            <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No fee items yet. Tap + to add.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {fees.map((f, i) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all"
              >
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{f.title}</div>
                  <div className="text-[11px] text-muted-foreground">Per student</div>
                </div>
                <div className="font-display font-bold text-primary">{naira(Number(f.amount))}</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Recent payments */}
        <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Recent payments</h2>
        {payments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No payments recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {payments.map((p) => (
              <div key={p.id} className={cn("flex items-center justify-between p-3 rounded-xl bg-card border border-border/40")}>
                <div>
                  <div className="text-xs font-medium">Receipt {p.receipt_no || "—"}</div>
                  <div className="text-[10px] text-muted-foreground">{p.paid_on} · {p.method || "Cash"}</div>
                </div>
                <div className="text-sm font-display font-bold text-success">+{naira(Number(p.amount_paid))}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppScreen>
  );
}
