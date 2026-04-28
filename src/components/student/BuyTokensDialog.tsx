import { useState } from "react";
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
import { Coins, Copy, CheckCircle, CreditCard, Landmark } from "lucide-react";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";

interface BuyTokensDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Pkg = {
  tokens: number;
  priceUsd: number;        // dollars (display)
  priceNgn: number;        // legacy bank-transfer amount
  priceId: string;         // Paddle external price id
  popular: boolean;
};

const TOKEN_PACKAGES: Pkg[] = [
  { tokens: 100,  priceUsd: 0.70, priceNgn: 500,  priceId: "tokens_100_onetime",  popular: false },
  { tokens: 250,  priceUsd: 1.50, priceNgn: 1000, priceId: "tokens_250_onetime",  popular: true  },
  { tokens: 500,  priceUsd: 2.00, priceNgn: 1800, priceId: "tokens_500_onetime",  popular: false },
  { tokens: 1000, priceUsd: 3.00, priceNgn: 3000, priceId: "tokens_1000_onetime", popular: false },
];

const BANK_DETAILS = {
  bankName: "Access Bank",
  accountNumber: "0123456789",
  accountName: "OverraPrep AI Ltd",
};

type Step = "select" | "method" | "card" | "bank";

export function BuyTokensDialog({ open, onOpenChange, onSuccess }: BuyTokensDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<Pkg | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<Step>("select");

  const reset = () => {
    setStep("select");
    setSelectedPackage(null);
    setPaymentReference("");
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(BANK_DETAILS.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectPackage = (pkg: Pkg) => {
    setSelectedPackage(pkg);
    setStep("method");
  };

  const handlePayCard = async () => {
    if (!user || !selectedPackage) return;
    setIsSubmitting(true);
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(selectedPackage.priceId);

      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        customer: user.email ? { email: user.email } : undefined,
        customData: { userId: user.id },
        settings: {
          displayMode: "overlay",
          successUrl: `${window.location.origin}/student/dashboard?purchase=success`,
          allowLogout: false,
          variant: "one-page",
        },
      });

      // Close our dialog so the Paddle overlay is unobstructed.
      // The webhook will credit tokens; the success page shows confirmation.
      onOpenChange(false);
      reset();
    } catch (err) {
      console.error("Card checkout error:", err);
      toast({
        title: "Checkout error",
        description: "Could not open card checkout. Try the bank transfer option.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitBankRequest = async () => {
    if (!user || !selectedPackage || !paymentReference.trim()) {
      toast({
        title: "Error",
        description: "Please fill in the payment reference",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("token_purchase_requests").insert({
        user_id: user.id,
        tokens_requested: selectedPackage.tokens,
        amount_paid: selectedPackage.priceNgn,
        payment_reference: paymentReference.trim(),
        payment_method: "bank_transfer",
        status: "pending",
      });
      if (error) throw error;
      toast({
        title: "Request Submitted",
        description: "Your token purchase request has been submitted. You'll be credited once the payment is verified.",
      });
      onOpenChange(false);
      onSuccess?.();
      reset();
    } catch (error) {
      console.error("Error submitting request:", error);
      toast({
        title: "Error",
        description: "Failed to submit purchase request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === "method") { reset(); }
    else if (step === "card" || step === "bank") { setStep("method"); }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-accent" />
            Buy Tokens
          </DialogTitle>
          <DialogDescription>
            {step === "select" && "Select a token package to purchase"}
            {step === "method" && "Choose how you'd like to pay"}
            {step === "bank" && "Make payment and enter your reference"}
            {step === "card" && "Pay securely with card"}
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {TOKEN_PACKAGES.map((pkg) => (
              <button
                key={pkg.tokens}
                onClick={() => handleSelectPackage(pkg)}
                className={`relative p-4 rounded-xl border-2 text-left transition-all hover:border-primary hover:bg-primary/5 ${
                  pkg.popular ? "border-accent bg-accent/5" : "border-border"
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-2 right-2 text-xs font-medium bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                    Popular
                  </span>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-5 h-5 text-accent" />
                  <span className="font-display text-xl font-bold text-foreground">
                    {pkg.tokens}
                  </span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  ${pkg.priceUsd.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  ≈ ₦{pkg.priceNgn.toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        )}

        {step === "method" && selectedPackage && (
          <div className="space-y-4 mt-4">
            <div className="bg-accent/10 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{selectedPackage.tokens} Tokens</p>
                <p className="text-sm text-muted-foreground">Your selection</p>
              </div>
              <p className="font-display text-2xl font-bold text-accent">
                ${selectedPackage.priceUsd.toFixed(2)}
              </p>
            </div>

            <button
              onClick={() => setStep("card")}
              className="w-full p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left flex items-center gap-3"
            >
              <CreditCard className="w-6 h-6 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-foreground">Pay with card</p>
                <p className="text-xs text-muted-foreground">Instant credit. Visa, Mastercard, and more.</p>
              </div>
            </button>

            <button
              onClick={() => setStep("bank")}
              className="w-full p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left flex items-center gap-3"
            >
              <Landmark className="w-6 h-6 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-foreground">Bank transfer (₦)</p>
                <p className="text-xs text-muted-foreground">Manual verification. Credited within 24h.</p>
              </div>
            </button>

            <Button variant="outline" className="w-full" onClick={handleBack}>
              Back
            </Button>
          </div>
        )}

        {step === "card" && selectedPackage && (
          <div className="space-y-6 mt-4">
            <div className="bg-accent/10 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{selectedPackage.tokens} Tokens</p>
                <p className="text-sm text-muted-foreground">Pay with card</p>
              </div>
              <p className="font-display text-2xl font-bold text-accent">
                ${selectedPackage.priceUsd.toFixed(2)}
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              You'll be redirected to a secure checkout. Tokens are credited automatically the moment the payment succeeds.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleBack}>Back</Button>
              <Button className="flex-1" onClick={handlePayCard} disabled={isSubmitting}>
                {isSubmitting ? "Opening..." : `Pay $${selectedPackage.priceUsd.toFixed(2)}`}
              </Button>
            </div>
          </div>
        )}

        {step === "bank" && selectedPackage && (
          <div className="space-y-6 mt-4">
            <div className="bg-accent/10 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{selectedPackage.tokens} Tokens</p>
                <p className="text-sm text-muted-foreground">Bank transfer</p>
              </div>
              <p className="font-display text-2xl font-bold text-accent">
                ₦{selectedPackage.priceNgn.toLocaleString()}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Transfer to:</h4>
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank:</span>
                  <span className="font-medium text-foreground">{BANK_DETAILS.bankName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Account No:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-foreground">{BANK_DETAILS.accountNumber}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyAccount}>
                      {copied ? <CheckCircle className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Name:</span>
                  <span className="font-medium text-foreground">{BANK_DETAILS.accountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium text-accent">₦{selectedPackage.priceNgn.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Payment Reference / Receipt Number</Label>
              <Input
                id="reference"
                placeholder="Enter your bank transfer reference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the reference from your bank transfer receipt
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleBack}>Back</Button>
              <Button
                className="flex-1"
                onClick={handleSubmitBankRequest}
                disabled={!paymentReference.trim() || isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
