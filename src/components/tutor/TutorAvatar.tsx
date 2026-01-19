import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TutorAvatarProps {
  src: string | null | undefined;
  name: string | null | undefined;
  className?: string;
  fallbackClassName?: string;
}

const TutorAvatar = ({ src, name, className, fallbackClassName }: TutorAvatarProps) => {
  const [isLoading, setIsLoading] = useState(!!src);
  const [hasError, setHasError] = useState(false);

  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "T";

  return (
    <div className={cn("relative", className)}>
      {isLoading && !hasError && (
        <Skeleton className={cn("absolute inset-0 rounded-full", className)} />
      )}
      <Avatar className={cn(className, isLoading && !hasError && "opacity-0")}>
        <AvatarImage
          src={src || undefined}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
        <AvatarFallback className={cn("bg-primary/10 text-primary font-bold", fallbackClassName)}>
          {initials}
        </AvatarFallback>
      </Avatar>
    </div>
  );
};

export default TutorAvatar;
