import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import type { ChatMessage, ChatProfile } from "@/hooks/useChatMessages";
import { sanitizeAIText } from "@/lib/sanitizeAI";

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  author?: ChatProfile;
  showAuthor: boolean;
}

export default function MessageBubble({ message, isOwn, author, showAuthor }: Props) {
  const isAi = message.is_ai;

  if (isAi) {
    return (
      <div className="flex gap-2 px-3 py-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold text-primary">OverraPrep AI</span>
            <span className="text-[10px] text-muted-foreground">{format(new Date(message.created_at), "p")}</span>
          </div>
          <div className="ai-prose max-w-none">
            <ReactMarkdown>{sanitizeAIText(message.content)}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2 px-3 py-1", isOwn && "flex-row-reverse")}>
      {!isOwn && showAuthor ? (
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={author?.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs">
            {(author?.full_name ?? "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : (
        !isOwn && <div className="w-8 shrink-0" />
      )}
      <div className={cn("max-w-[75%] flex flex-col", isOwn && "items-end")}>
        {!isOwn && showAuthor && (
          <span className="text-[11px] font-medium text-muted-foreground mb-0.5 px-1">
            {author?.full_name ?? "Someone"}
          </span>
        )}
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm"
          )}
        >
          {message.content}
        </div>
        <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
          {format(new Date(message.created_at), "p")}
        </span>
      </div>
    </div>
  );
}
