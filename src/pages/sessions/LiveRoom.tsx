import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LiveKitRoom, VideoConference, RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';
import ParticipantRoster from '@/components/live/ParticipantRoster';
import { Users } from 'lucide-react';

interface TokenResponse {
  token: string; url: string; room: string; identity: string; isHost: boolean; title: string;
}

export default function LiveRoom() {
  const { slotId } = useParams<{ slotId: string }>();
  const nav = useNavigate();
  const [data, setData] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRoster, setShowRoster] = useState(true);

  useEffect(() => {
    if (!slotId) return;
    (async () => {
      const { data: res, error } = await supabase.functions.invoke('livekit-token', {
        body: { slot_id: slotId },
      });
      if (error || (res as any)?.error) {
        setError((res as any)?.error ?? error?.message ?? 'Could not join');
      } else setData(res as TokenResponse);
    })();
  }, [slotId]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-10 h-10 text-destructive mb-2" />
        <p className="font-semibold">Cannot join session</p>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => nav('/sessions')}>Back to sessions</Button>
      </div>
    );
  }
  if (!data) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <header className="flex items-center gap-2 px-3 py-2 border-b shrink-0">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-sm font-semibold flex-1 truncate">{data.title} {data.isHost && <span className="text-xs text-primary">· Host</span>}</h1>
      </header>
      <div className="flex-1 min-h-0">
        <LiveKitRoom
          token={data.token}
          serverUrl={data.url}
          connect
          video
          audio
          data-lk-theme="default"
          style={{ height: '100%' }}
          onDisconnected={() => nav('/sessions')}
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
}
