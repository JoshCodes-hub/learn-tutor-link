import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface ShareResultsButtonProps {
  quizTitle: string;
  score: number;
  quizId: string;
}

export const ShareResultsButton = ({ quizTitle, score, quizId }: ShareResultsButtonProps) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/quiz/${quizId}`;
  const shareMessage = `🎯 I just scored ${score}% on "${quizTitle}" on OverraPrep AI!\n\nTry it yourself: ${shareUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      toast.success("Result copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleShareWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My Quiz Result - ${quizTitle}`,
          text: `I scored ${score}% on ${quizTitle}!`,
          url: shareUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Button
        variant="outline"
        className="flex-1"
        onClick={handleNativeShare}
      >
        {copied ? (
          <Check className="w-4 h-4 mr-2" />
        ) : (
          <Share2 className="w-4 h-4 mr-2" />
        )}
        {copied ? "Copied!" : "Share Result"}
      </Button>
      
      <Button
        variant="secondary"
        className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white"
        onClick={handleShareWhatsApp}
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        WhatsApp
      </Button>
    </div>
  );
};
