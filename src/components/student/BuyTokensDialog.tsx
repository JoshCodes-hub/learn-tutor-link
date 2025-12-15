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
import { Coins, Copy, CheckCircle } from "lucide-react";

interface BuyTokensDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const TOKEN_PACKAGES = [
  { tokens: 100, price: 500, popular: false },
  { tokens: 250, price: 1000, popular: true },
  { tokens: 500, price: 1800, popular: false },
  { tokens: 1000, price: 3000, popular: false },
];

const BANK_DETAILS = {
  bankName: "Access Bank",
  accountNumber: "0123456789",
  accountName: "OverraPrep AI Ltd",
};

export function BuyTokensDialog({ open, onOpenChange, onSuccess }: BuyTokensDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<typeof TOKEN_PACKAGES[0] | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<"select" | "payment" | "confirm">("select");

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(BANK_DETAILS.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectPackage = (pkg: typeof TOKEN_PACKAGES[0]) => {
    setSelectedPackage(pkg);
    setStep("payment");
  };

  const handleSubmitRequest = async () => {
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
        amount_paid: selectedPackage.price,
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
      
      // Reset state
      setStep("select");
      setSelectedPackage(null);
      setPaymentReference("");
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
    if (step === "payment") {
      setStep("select");
      setSelectedPackage(null);
    } else if (step === "confirm") {
      setStep("payment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-accent" />
            Buy Tokens
          </DialogTitle>
          <DialogDescription>
            {step === "select" && "Select a token package to purchase"}
            {step === "payment" && "Make payment and enter your reference"}
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
                  ₦{pkg.price.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  ₦{(pkg.price / pkg.tokens).toFixed(2)} per token
                </p>
              </button>
            ))}
          </div>
        )}

        {step === "payment" && selectedPackage && (
          <div className="space-y-6 mt-4">
            {/* Selected Package Summary */}
            <div className="bg-accent/10 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">
                  {selectedPackage.tokens} Tokens
                </p>
                <p className="text-sm text-muted-foreground">Your selection</p>
              </div>
              <p className="font-display text-2xl font-bold text-accent">
                ₦{selectedPackage.price.toLocaleString()}
              </p>
            </div>

            {/* Bank Details */}
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
                    <span className="font-mono font-medium text-foreground">
                      {BANK_DETAILS.accountNumber}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleCopyAccount}
                    >
                      {copied ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Name:</span>
                  <span className="font-medium text-foreground">{BANK_DETAILS.accountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium text-accent">
                    ₦{selectedPackage.price.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Reference Input */}
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

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleBack}>
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmitRequest}
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
