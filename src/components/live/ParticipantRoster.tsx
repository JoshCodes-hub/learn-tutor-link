import { useEffect, useState } from 'react';
import { useParticipants, useLocalParticipant } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Mic, MicOff, Video, VideoOff, Crown, Users, Hand, MicOff as MuteIcon, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function fmtElapsed(joinedAt?: Date) {
  if (!joinedAt) return '';
  const s = Math.max(0, Math.floor((Date.now() - joinedAt.getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default function ParticipantRoster({ slotId, isHost }: { slotId: string; isHost: boolean }) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [, force] = useState(0);

  // tick for elapsed time
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  const handRaised = (localParticipant?.attributes as any)?.handRaised === '1';
  const toggleHand = async () => {
    try {
      await localParticipant.setAttributes({ handRaised: handRaised ? '' : '1' });
      toast.success(handRaised ? 'Hand lowered' : 'Hand raised');
    } catch (e) {
      toast.error('Could not update');
    }
  };

  const moderate = async (action: 'mute' | 'remove', identity: string, track_sid?: string) => {
    const { data, error } = await supabase.functions.invoke('livekit-moderate', {
      body: { slot_id: slotId, action, target_identity: identity, track_sid, muted: true },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? 'Failed');
    } else {
      toast.success(action === 'mute' ? 'Muted' : 'Removed');
    }
  };

  // Sort raised hands first, then host, then by join time
  const sorted = [...participants].sort((a, b) => {
    const ah = (a.attributes as any)?.handRaised === '1' ? 1 : 0;
    const bh = (b.attributes as any)?.handRaised === '1' ? 1 : 0;
    if (ah !== bh) return bh - ah;
    const aJ = a.joinedAt?.getTime() ?? 0;
    const bJ = b.joinedAt?.getTime() ?? 0;
    return aJ - bJ;
  });

  const raisedCount = participants.filter((p) => (p.attributes as any)?.handRaised === '1').length;

  return (
    <aside className="w-72 shrink-0 border-l bg-card flex flex-col h-full">
      <div className="px-3 py-2 border-b flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">Participants</h2>
        <span className="ml-auto text-xs text-muted-foreground">{participants.length}</span>
      </div>

      <div className="px-3 py-2 border-b">
        <Button
          size="sm"
          variant={handRaised ? 'default' : 'outline'}
          onClick={toggleHand}
          className="w-full gap-2"
        >
          <Hand className="w-4 h-4" />
          {handRaised ? 'Lower hand' : 'Raise hand'}
        </Button>
        {raisedCount > 0 && (
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {raisedCount} hand{raisedCount === 1 ? '' : 's'} raised
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sorted.map((p) => {
          const meta = (() => { try { return JSON.parse(p.metadata || '{}'); } catch { return {}; } })();
          const role = meta?.role;
          const pIsHost = role === 'host';
          const micOn = p.isMicrophoneEnabled;
          const camOn = p.isCameraEnabled;
          const raised = (p.attributes as any)?.handRaised === '1';
          const micTrack = p.getTrackPublication(Track.Source.Microphone);

          return (
            <div
              key={p.identity}
              className={`px-2 py-2 rounded-md ${raised ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/60'}`}
            >
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                    {(p.name || p.identity).charAt(0).toUpperCase()}
                  </div>
                  {raised && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Hand className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate flex items-center gap-1">
                    {p.name || p.identity}
                    {p.isLocal && <span className="text-[10px] text-muted-foreground">(you)</span>}
                    {pIsHost && <Crown className="w-3 h-3 text-primary" />}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {pIsHost ? 'Host' : 'Student'} · joined {fmtElapsed(p.joinedAt)} ago
                  </p>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                  {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5 text-destructive" />}
                  {camOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5 text-destructive" />}
                </div>
              </div>

              {isHost && !p.isLocal && !pIsHost && (
                <div className="flex gap-1 mt-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px] gap-1"
                    disabled={!micOn || !micTrack}
                    onClick={() => micTrack && moderate('mute', p.identity, micTrack.trackSid)}
                  >
                    <MuteIcon className="w-3 h-3" /> Mute
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px] gap-1 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Remove ${p.name || p.identity} from the room?`)) {
                        moderate('remove', p.identity);
                      }
                    }}
                  >
                    <UserMinus className="w-3 h-3" /> Remove
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {participants.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No one here yet</p>
        )}
      </div>
    </aside>
  );
}
