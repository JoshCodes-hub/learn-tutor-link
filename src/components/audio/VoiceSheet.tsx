import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Pin, Star, Volume2, Download as DownloadIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TtsVoice } from "@/lib/browserTts";

interface PinnedVoice { uri: string; name: string; lang: string }

interface Props {
  trigger: React.ReactNode;
  voices: TtsVoice[];
  voiceURI: string | null;
  pinned: PinnedVoice[];
  onPick: (id: string) => void;
  onTogglePin: (v: TtsVoice) => void;
  onExport: () => void;
}

export function VoiceSheet({ trigger, voices, voiceURI, pinned, onPick, onTogglePin, onExport }: Props) {
  const pinSet = new Set(pinned.map((p) => p.uri));
  const pinnedList = voices.filter((v) => pinSet.has(v.id));
  const en = voices.filter((v) => !pinSet.has(v.id) && v.lang.toLowerCase().startsWith("en"));
  const others = voices.filter((v) => !pinSet.has(v.id) && !v.lang.toLowerCase().startsWith("en"));

  const Section = ({ title, list }: { title: string; list: TtsVoice[] }) =>
    list.length === 0 ? null : (
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-1">{title}</p>
        <div className="grid grid-cols-1 gap-1.5">
          {list.map((v) => {
            const active = voiceURI === v.id;
            const isPinned = pinSet.has(v.id);
            return (
              <div key={v.id} className={cn("relative rounded-xl p-3 border transition-all flex items-center gap-3",
                active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40")}>
                <button onClick={() => onPick(v.id)} className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{v.name}</p>
                    {v.localService && (
                      <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700">OFFLINE</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{v.lang}</p>
                </button>
                <button onClick={() => onTogglePin(v)} aria-label={isPinned ? "Unpin" : "Pin"}
                  className={cn("p-1.5 rounded-md transition-colors",
                    isPinned ? "text-primary" : "text-muted-foreground/40 hover:text-primary")}>
                  {isPinned ? <Star className="w-4 h-4 fill-current" /> : <Pin className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-primary" />
            Voice
            {pinned.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">{pinned.length} pinned</span>
            )}
          </SheetTitle>
          <p className="text-[12px] text-muted-foreground">Pick the narrator. Pin favourites — they auto-resolve across devices.</p>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-4 mt-2">
          <Section title="Pinned" list={pinnedList} />
          <Section title="English" list={en} />
          <Section title="Other languages" list={others} />
        </div>
        <div className="pt-3 border-t mt-2">
          <Button variant="ghost" size="sm" onClick={onExport} disabled={!pinned.length} className="w-full">
            <DownloadIcon className="w-3.5 h-3.5 mr-1.5" /> Backup pinned voices
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}