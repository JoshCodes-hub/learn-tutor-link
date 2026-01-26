import { Progress } from "@/components/ui/progress";

interface QuizProgressBarProps {
  currentIndex: number;
  totalQuestions: number;
  answeredCount: number;
}

export const QuizProgressBar = ({ currentIndex, totalQuestions, answeredCount }: QuizProgressBarProps) => {
  const progressPercent = ((currentIndex + 1) / totalQuestions) * 100;
  const answeredPercent = (answeredCount / totalQuestions) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Question {currentIndex + 1} of {totalQuestions}</span>
        <span>{Math.round(answeredPercent)}% answered</span>
      </div>
      <Progress value={progressPercent} className="h-2" />
    </div>
  );
};
