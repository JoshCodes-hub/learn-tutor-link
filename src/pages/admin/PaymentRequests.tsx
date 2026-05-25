import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/layout/DashboardNav";
import { SEO } from "@/components/seo/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CreditCard, ExternalLink, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const PaymentRequests = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-payment-requests", tab],
    queryFn: async () => {
      let q = (supabase as any).from("payment_requests").select("*, profiles!payment_requests_user_id_fkey(full_name,email)").order("created_at", { ascending: false });
      if (tab === "pending") q = q.eq("status", "pending");
      const { data } = await q;
      return data ?? [];
    },
  });

  const openProof = async (path: string) => {
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 600);
    if (data?.signedUrl) setProofUrl(data.signedUrl);
    else toast.error("Could not load proof");
  };

  const approve = async (id: string) => {
    setBusy(id);
    try {
      const { error } = await (supabase as any).rpc("approve_payment_request", { _id: id, _note: null });
      if (error) throw new Error(error.message);
      toast.success("Approved");
      qc.invalidateQueries({ queryKey: ["admin-payment-requests"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    } finally { setBusy(null); }
  };

  const confirmReject = async () => {
    if (!rejectingId) return;
    setBusy(rejectingId);
    try {
      const { error } = await (supabase as any).rpc("reject_payment_request", { _id: rejectingId, _note: rejectNote || null });
      if (error) throw new Error(error.message);
      toast.success("Rejected");
      qc.invalidateQueries({ queryKey: ["admin-payment-requests"] });
      setRejectingId(null); setRejectNote("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    } finally { setBusy(null); }
  };

  return (
    <>
      <SEO title="Payment Requests" description="Approve manual subscription payments." url="https://overraprep.com/admin/payments" />
      <div className="min-h-screen bg-background pb-24">
        <DashboardNav role="admin" />
        <main className="container mx-auto px-4 py-6 max-w-5xl">
          <header className="mb-5">
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-amber-500" /> Payment Requests
            </h1>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant={tab === "pending" ? "default" : "outline"} onClick={() => setTab("pending")}>Pending</Button>
              <Button size="sm" variant={tab === "all" ? "default" : "outline"} onClick={() => setTab("all")}>All</Button>
            </div>
          </header>

          {isLoading ? (
            <div className="grid place-items-center py-16 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : requests.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">No payment requests.</Card>
          ) : (
            <div className="space-y-3">
              {requests.map((r: any) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{r.profiles?.full_name || r.profiles?.email || r.user_id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{r.profiles?.email}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline" className="capitalize">{r.plan_id}</Badge>
                        <span>{r.currency} {(r.amount_cents / 100).toFixed(2)}</span>
                        {r.reference && <span>Ref <strong>{r.reference}</strong></span>}
                        <span className="text-muted-foreground">{format(new Date(r.created_at), "PPp")}</span>
                      </div>
                      {r.admin_note && <p className="text-xs italic mt-2 text-muted-foreground">"{r.admin_note}"</p>}
                    </div>
                    <Badge
                      variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}
                      className={r.status === "approved" ? "bg-emerald-500 hover:bg-emerald-500" : ""}
                    >
                      {r.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.proof_path && (
                      <Button size="sm" variant="outline" onClick={() => openProof(r.proof_path)}>
                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> View proof
                      </Button>
                    )}
                    {r.status === "pending" && (
                      <>
                        <Button size="sm" disabled={busy === r.id}
                          onClick={() => approve(r.id)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white">
                          {busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" /> Approve</>}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRejectingId(r.id)}>
                          <X className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      <Dialog open={!!rejectingId} onOpenChange={(o) => !o && setRejectingId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Reject payment</DialogTitle></DialogHeader>
          <Textarea
            value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Reason (sent to the student)"
            rows={3}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectingId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmReject} disabled={!!busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!proofUrl} onOpenChange={(o) => !o && setProofUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Proof of payment</DialogTitle></DialogHeader>
          {proofUrl && (
            proofUrl.match(/\.pdf/i)
              ? <iframe src={proofUrl} className="w-full h-[70vh] rounded-lg border" />
              : <img src={proofUrl} alt="Proof" className="w-full max-h-[75vh] object-contain rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PaymentRequests;
