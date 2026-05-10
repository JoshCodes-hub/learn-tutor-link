import { useParticipants } from '@livekit/components-react';
import { Mic, MicOff, Video, VideoOff, Crown, Users } from 'lucide-react';

export default function ParticipantRoster() {
  const participants = useParticipants();

  return (
    <aside className="w-64 shrink-0 border-l bg-card flex flex-col h-full">
      <div className="px-3 py-2 border-b flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">Participants</h2>
        <span className="ml-auto text-xs text-muted-foreground">{participants.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {participants.map((p) => {
          const meta = (() => { try { return JSON.parse(p.metadata || '{}'); } catch { return {}; } })();
          const isHost = meta?.role === 'host';
          const micOn = p.isMicrophoneEnabled;
          const camOn = p.isCameraEnabled;
          return (
            <div key={p.identity} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                {(p.name || p.identity).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate flex items-center gap-1">
                  {p.name || p.identity}
                  {p.isLocal && <span className="text-[10px] text-muted-foreground">(you)</span>}
                  {isHost && <Crown className="w-3 h-3 text-primary" />}
                </p>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5 text-destructive" />}
                {camOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5 text-destructive" />}
              </div>
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
