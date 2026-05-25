import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { BookmarkCheck, Play, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface AudioBookmark {
  id: string;
  sectionIdx: number;
  chunkIdx: number;
  label: string;
  createdAt: number;
}

interface Props {
  trigger: React.ReactNode;
  bookmarks: AudioBookmark[];
  onJump: (b: AudioBookmark) => void;
  onDelete: (id: string) => void;
  onClearAll?: () => void;
}

export function BookmarksSheet({ trigger, bookmarks, onJump, onDelete, onClearAll }: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[78vh] p-0 bg-gradient-to-b from-amber-50/60 to-white">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-amber-200/60">
          <div className="mx-auto w-10 h-1 rounded-full bg-amber-200 mb-3" />
          <SheetTitle className="flex items-center gap-2 text-left">
            <BookmarkCheck className="w-4 h-4 text-amber-600" /> Bookmarks
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {bookmarks.length} saved
            </span>
          </SheetTitle>
        </SheetHeader>

        {bookmarks.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Tap the <strong>Bookmark</strong> button while a section is playing to save your spot.
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[58vh] px-4 py-3">
              <ul className="space-y-2 pb-4">
                {bookmarks.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center gap-2 rounded-xl border border-amber-200/60 bg-white p-3 hover:bg-amber-50/60 transition-colors"
                  >
                    <button
                      onClick={() => onJump(b)}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="text-[13px] font-semibold truncate">{b.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Section {b.sectionIdx + 1} · Chunk {b.chunkIdx + 1} ·{" "}
                        {new Date(b.createdAt).toLocaleString()}
                      </p>
                    </button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onJump(b)}
                      aria-label="Jump to bookmark"
                      className="h-8 w-8 text-amber-700 hover:bg-amber-100"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelete(b.id)}
                      aria-label="Delete bookmark"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
            {onClearAll && (
              <div className="px-4 py-3 border-t border-amber-200/60">
                <Button variant="ghost" size="sm" onClick={onClearAll} className="w-full text-muted-foreground hover:text-destructive">
                  Clear all bookmarks
                </Button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}