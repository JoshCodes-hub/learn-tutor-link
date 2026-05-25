import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: { id: string; name: string; price_cents: number; currency: string } | null;
  onSubmitted?: () => void;
}

export const SubmitPaymentDialog = ({ open, onOpenChange, plan, onSubmitted }: Props) => {
  const { user } = useAuth();
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user?.id || !plan) return;
    if (!reference.trim() && !file) {
      toast.error("Add a payment reference or upload proof");
      return;
    }
    setSubmitting(true);
    try {
      let proofPath: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("payment-proofs")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw new Error(upErr.message);
        proofPath = path;
      }
      const { error } = await (supabase as any).from("payment_requests").insert({
        user_id: user.id,
        plan_id: plan.id,
        amount_cents: plan.price_cents,
        currency: plan.currency,
        reference: reference.trim() || null,
        proof_path: proofPath,
        admin_note: note.trim() || null,
      });
      if (error) throw new Error(error.message);
      toast.success("Payment submitted — we'll review it shortly");
      onSubmitted?.();
      onOpenChange(false);
      setReference(""); setNote(""); setFile(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit payment for {plan?.name}</DialogTitle>
          <DialogDescription>
            Transfer the equivalent amount to the OverraPrep account, then submit the reference and (optionally) a screenshot of your receipt.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs">
          <p className="font-semibold text-amber-800">Payment account</p>
          <p className="text-amber-900 mt-1">Bank: <strong>Opay</strong></p>
          <p className="text-amber-900">Account name: <strong>OverraPrep AI</strong></p>
          <p className="text-amber-900">Account #: <strong>9012345678</strong></p>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Payment reference</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. TRX123456" />
          </div>
          <div>
            <Label className="text-xs">Proof of payment (image / PDF, optional)</Label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <Label className="text-xs">Note (optional)</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything we should know?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700"
          >
            {submitting ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Submitting…</> : <><Upload className="w-4 h-4 mr-1.5" /> Submit</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitPaymentDialog;
