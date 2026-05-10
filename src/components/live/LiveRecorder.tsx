import { useEffect, useRef, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Button } from '@/components/ui/button';
import { Circle, StopCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { haptic } from '@/lib/native';

export default function LiveRecorder({ slotId }: { slotId: string }) {
  const room = useRoomContext();
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef<number>(0);
  const [state, setState] = useState<'idle' | 'recording' | 'uploading'>('idle');

  useEffect(() => () => { try { recRef.current?.stop(); } catch (_) {} }, []);

  const start = async () => {
    const localPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
    const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
    const stream = new MediaStream();
    if (camPub?.track?.mediaStreamTrack) stream.addTrack(camPub.track.mediaStreamTrack);
    if (localPub?.track?.mediaStreamTrack) stream.addTrack(localPub.track.mediaStreamTrack);
    if (stream.getTracks().length === 0) {
      toast.error('Enable your camera or mic first');
      return;
    }
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus' : 'video/webm';
    const rec = new MediaRecorder(stream, { mimeType: mime });
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => upload();
    rec.start(1000);
    recRef.current = rec;
    startRef.current = Date.now();
    setState('recording');
    haptic('medium');
    toast.success('Recording started');
  };

  const stop = () => {
    try { recRef.current?.stop(); } catch (_) {}
    haptic('medium');
  };

  const upload = async () => {
    setState('uploading');
    try {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not signed in');
      const path = `${user.id}/${slotId}-${Date.now()}.webm`;
      const { error: upErr } = await supabase.storage.from('class-recordings').upload(path, blob, {
        contentType: 'video/webm', upsert: false,
      });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from('class-recordings').createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl ?? path;
      const duration_s = Math.round((Date.now() - startRef.current) / 1000);
      await (supabase as any).from('live_recordings').insert({
        slot_id: slotId, tutor_id: user.id, file_url: url,
        duration_s, size_bytes: blob.size,
      });
      toast.success('Recording saved to your library');
      haptic('success');
    } catch (e: any) {
      toast.error(e?.message ?? 'Upload failed');
    } finally {
      setState('idle');
      chunksRef.current = [];
    }
  };

  if (state === 'uploading') {
    return <Button size="sm" variant="outline" disabled className="gap-2"><Loader2 className="w-4 h-4 animate-spin" />Saving…</Button>;
  }
  if (state === 'recording') {
    return <Button size="sm" variant="destructive" onClick={stop} className="gap-2"><StopCircle className="w-4 h-4" />Stop</Button>;
  }
  return <Button size="sm" variant="outline" onClick={start} className="gap-2"><Circle className="w-4 h-4 text-destructive fill-destructive" />Record</Button>;
}
