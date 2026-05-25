import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Music, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AMBIENT_LIST, type AmbientPreset } from "@/lib/ambientAudio";

interface Props {
  trigger: React.ReactNode;
  ambient: AmbientPreset;
  ambientVol: number;
  onPick: (p: AmbientPreset) => void;
  onVol: (v: number) => void;
}

export function AmbientSheet({ trigger, ambient, ambientVol, onPick, onVol }: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="max-h-[70vh]">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Music className="w-4 h-4 text-primary" /> Focus Sounds
          </SheetTitle>
          <p className="text-[12px] text-muted-foreground">Layer ambient audio under the narration.</p>
        </SheetHeader>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {AMBIENT_LIST.map((a) => {
            const active = ambient === a.id;
            return (
              <button key={a.id} onClick={() => onPick(a.id)}
                className={cn("flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all",
                  active ? "border-primary bg-primary/10 shadow-md scale-[1.02]"
                    : "border-border hover:border-primary/40 hover:bg-muted/40")}>
                <span className="text-3xl leading-none">{a.emoji}</span>
                <span className={cn("text-[11px] font-bold", active ? "text-primary" : "text-foreground")}>
                  {a.label}
                </span>
              </button>
            );
          })}
        </div>
        {ambient !== "off" && (
          <div className="mt-5 flex items-center gap-3">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <input type="range" min={0} max={1} step={0.05} value={ambientVol}
              onChange={(e) => onVol(Number(e.target.value))}
              className="flex-1 accent-primary" />
            <span className="text-[11px] font-mono text-muted-foreground w-10 text-right">
              {Math.round(ambientVol * 100)}%
            </span>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}