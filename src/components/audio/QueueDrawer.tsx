import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ListMusic, Play, X, Trash2 } from "lucide-react";
import {
  getQueue, subscribeQueue, removeAt, clearQueue, setQueue,
} from "@/lib/audioQueue";
import type { GlobalAudioTrack } from "@/lib/globalAudio";

export function QueueDrawer() {
  const [state, setState] = useState<{ items: GlobalAudioTrack[]; index: number }>(getQueue());

  useEffect(() => {
    const off = subscribeQueue(() => setState(getQueue()));
    return off;
  }, []);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 rounded-full border-amber-200 text-amber-700 hover:bg-amber-50">
          <ListMusic className="w-4 h-4 mr-1.5" />
          Queue
          {state.items.length > 0 && (
            <span className="ml-1.5 text-[10px] font-bold bg-amber-500 text-white rounded-full px-1.5">
              {state.items.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle className="font-display">Up next</SheetTitle>
        </SheetHeader>
        {state.items.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-8 text-center">
            Your queue is empty. Add tracks to listen continuously.
          </p>
        ) : (
          <>
            <div className="mt-4 space-y-1.5 max-h-[70vh] overflow-y-auto">
              {state.items.map((t, i) => {
                const active = i === state.index;
                return (
                  <div
                    key={`${t.src}-${i}`}
                    className={`flex items-center gap-2 p-2 rounded-lg border ${
                      active ? "border-amber-300 bg-amber-50/70" : "border-transparent hover:bg-muted/40"
                    }`}
                  >
                    <button
                      className="w-8 h-8 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center shrink-0"
                      onClick={() => setQueue(state.items, i)}
                      aria-label="Play"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium truncate">{t.title || "Untitled"}</p>
                      {t.subtitle && <p className="text-[11px] text-muted-foreground truncate">{t.subtitle}</p>}
                    </div>
                    <button
                      className="opacity-60 hover:opacity-100"
                      onClick={() => removeAt(i)}
                      aria-label="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-destructive hover:text-destructive"
              onClick={() => clearQueue()}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear queue
            </Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default QueueDrawer;