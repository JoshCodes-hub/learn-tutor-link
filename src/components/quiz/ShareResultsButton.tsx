import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { shareContent, haptic } from "@/lib/native";

interface ShareResultsButtonProps {
  quizTitle: string;
  score: number;
  quizId: string;
}

export const ShareResultsButton = ({ quizTitle, score, quizId }: ShareResultsButtonProps) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/quiz/${quizId}`;
  const shareMessage = `🎯 I just scored ${score}% on "${quizTitle}" on OverraPrep AI!\n\nTry it yourself: ${shareUrl}`;

  const handleNativeShare = async () => {
    void haptic("light");
    const ok = await shareContent({
      title: `My Quiz Result - ${quizTitle}`,
      text: `I scored ${score}% on ${quizTitle}!`,
      url: shareUrl,
      dialogTitle: "Share your result",
    });
    if (ok) {
      setCopied(true);
      toast.success("Result shared!");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Failed to share");
    }
  };

  const handleShareWhatsApp = () => {
    void haptic("light");
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(whatsappUrl, "_blank");
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
        {copied ? "Shared!" : "Share Result"}
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
