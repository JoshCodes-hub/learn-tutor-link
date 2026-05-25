import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  trigger: React.ReactNode;
  rate: number;
  speeds?: number[];
  onPick: (r: number) => void;
}

const DEFAULTS = [0.75, 0.85, 1, 1.15, 1.25, 1.5, 1.75, 2];

export function SpeedSheet({ trigger, rate, speeds = DEFAULTS, onPick }: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl p-0 bg-gradient-to-b from-amber-50/60 to-white">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-amber-200/60">
          <div className="mx-auto w-10 h-1 rounded-full bg-amber-200 mb-3" />
          <SheetTitle className="flex items-center gap-2 text-left">
            <Gauge className="w-4 h-4 text-amber-600" /> Playback speed
            <span className="ml-auto text-xs font-normal text-amber-700">{rate}x</span>
          </SheetTitle>
        </SheetHeader>

        <div className="p-5 pb-8">
          <div className="grid grid-cols-4 gap-2.5">
            {speeds.map((s) => {
              const active = Math.abs(s - rate) < 0.01;
              return (
                <button
                  key={s}
                  onClick={() => onPick(s)}
                  className={cn(
                    "rounded-xl py-3 text-sm font-bold transition-all active:scale-95",
                    active
                      ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 ring-2 ring-amber-300"
                      : "bg-white text-amber-800 ring-1 ring-amber-200/60 hover:bg-amber-50"
                  )}
                >
                  {s}x
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-[11px] text-center text-muted-foreground">
            Tip: Try 1.25x for review and 0.85x for new material.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}