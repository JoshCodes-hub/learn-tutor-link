import { Bot } from "lucide-react";

export default function AiTypingDots() {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <Bot className="w-4 h-4 text-primary" />
      <span>AI is typing</span>
      <span className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "120ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "240ms" }} />
      </span>
    </div>
  );
}
