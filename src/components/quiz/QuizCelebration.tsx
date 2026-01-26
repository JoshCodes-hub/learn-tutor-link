import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface QuizCelebrationProps {
  score: number;
  isVisible: boolean;
}

const Confetti = ({ delay }: { delay: number }) => {
  const colors = ["bg-accent", "bg-primary", "bg-success", "bg-secondary"];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const randomLeft = Math.random() * 100;
  const randomDuration = 2 + Math.random() * 2;
  const randomSize = 8 + Math.random() * 8;

  return (
    <div
      className={cn(
        "absolute rounded-sm opacity-0 animate-confetti",
        randomColor
      )}
      style={{
        left: `${randomLeft}%`,
        width: `${randomSize}px`,
        height: `${randomSize}px`,
        animationDelay: `${delay}ms`,
        animationDuration: `${randomDuration}s`,
      }}
    />
  );
};

export const QuizCelebration = ({ score, isVisible }: QuizCelebrationProps) => {
  const [confettiPieces, setConfettiPieces] = useState<number[]>([]);

  useEffect(() => {
    if (isVisible && score >= 70) {
      // Create confetti pieces
      const pieces = Array.from({ length: 50 }, (_, i) => i);
      setConfettiPieces(pieces);

      // Clear confetti after animation
      const timer = setTimeout(() => {
        setConfettiPieces([]);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, score]);

  if (!isVisible || score < 70) return null;

  const getMessage = () => {
    if (score >= 90) return "🏆 Outstanding!";
    if (score >= 80) return "🎉 Excellent!";
    return "👏 Great Job!";
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Confetti */}
      {confettiPieces.map((_, i) => (
        <Confetti key={i} delay={i * 50} />
      ))}

      {/* Celebration Message */}
      <div className="absolute inset-0 flex items-center justify-center animate-bounce-in">
        <div className="bg-card/95 backdrop-blur-lg border border-border rounded-2xl p-8 shadow-2xl text-center">
          <p className="text-4xl font-display font-bold mb-2">{getMessage()}</p>
          <p className="text-xl text-muted-foreground">You scored {score}%</p>
        </div>
      </div>
    </div>
  );
};
