import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AppScreenProps {
  title?: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

/**
 * Native-style screen container.
 * - Safe-area top/bottom padding
 * - Sticky header with optional back button
 * - Full-height scroll area
 */
export const AppScreen = ({ title, subtitle, back, onBack, right, children, className, noPadding }: AppScreenProps) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {(title || back || right) && (
        <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center gap-3 px-4 h-14">
            {back && (
              <button
                onClick={() => (onBack ? onBack() : navigate(-1))}
                aria-label="Back"
                className="-ml-2 p-2 rounded-full hover:bg-muted active:scale-95 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex-1 min-w-0">
              {title && <h1 className="font-display text-lg font-semibold truncate leading-tight">{title}</h1>}
              {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            </div>
            {right}
          </div>
        </header>
      )}
      <main
        className={cn("flex-1", noPadding ? "" : "px-4 py-4", className)}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        {children}
      </main>
    </div>
  );
};

export default AppScreen;
