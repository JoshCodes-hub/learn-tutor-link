import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Banknote, Coins, AlertCircle } from "lucide-react";

interface WithdrawalRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
  onSuccess?: () => void;
}

export function WithdrawalRequestDialog({
  open,
  onOpenChange,
  availableBalance,
  onSuccess,
}: WithdrawalRequestDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);

  useEffect(() => {
    const fetchPendingWithdrawals = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("withdrawal_requests")
        .select("amount")
        .eq("tutor_id", user.id)
        .in("status", ["pending", "approved"]);

      if (data) {
        const total = data.reduce((sum, w) => sum + w.amount, 0);
        setPendingWithdrawals(total);
      }
    };

    if (open) {
      fetchPendingWithdrawals();
    }
  }, [user, open]);

  const effectiveBalance = availableBalance - pendingWithdrawals;
  const numAmount = parseInt(amount) || 0;

  const handleSubmit = async () => {
    if (!user) return;

    if (numAmount < 100) {
      toast({
        title: "Minimum withdrawal",
        description: "Minimum withdrawal amount is 100 tokens",
        variant: "destructive",
      });
      return;
    }

    if (numAmount > effectiveBalance) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough tokens to withdraw this amount",
        variant: "destructive",
      });
      return;
    }

    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all bank details",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("withdrawal_requests").insert({
        tutor_id: user.id,
        amount: numAmount,
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Your withdrawal request has been submitted for review.",
      });

      onOpenChange(false);
      onSuccess?.();

      // Reset form
      setAmount("");
      setBankName("");
      setAccountNumber("");
      setAccountName("");
    } catch (error) {
      console.error("Error submitting withdrawal:", error);
      toast({
        title: "Error",
        description: "Failed to submit withdrawal request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-success" />
            Request Withdrawal
          </DialogTitle>
          <DialogDescription>
            Withdraw your earned tokens to your bank account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Balance Summary */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Earnings</span>
              <span className="font-medium text-foreground flex items-center gap-1">
                <Coins className="w-4 h-4 text-accent" />
                {availableBalance}
              </span>
            </div>
            {pendingWithdrawals > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pending Withdrawals</span>
                <span className="text-accent">-{pendingWithdrawals}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2">
              <span className="font-medium text-foreground">Available</span>
              <span className="font-bold text-success">{effectiveBalance}</span>
            </div>
          </div>

          {effectiveBalance < 100 && (
            <div className="flex items-start gap-2 p-3 bg-accent/10 rounded-lg">
              <AlertCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Minimum withdrawal is 100 tokens. Keep creating great content to earn more!
              </p>
            </div>
          )}

          {/* Withdrawal Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount to Withdraw (tokens)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={100}
                max={effectiveBalance}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                placeholder="e.g. Access Bank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                placeholder="10-digit account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                maxLength={10}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                placeholder="Name on bank account"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              numAmount < 100 ||
              numAmount > effectiveBalance ||
              !bankName.trim() ||
              !accountNumber.trim() ||
              !accountName.trim()
            }
          >
            {isSubmitting ? "Submitting..." : "Submit Withdrawal Request"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Withdrawals are processed within 24-48 hours after admin approval
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
