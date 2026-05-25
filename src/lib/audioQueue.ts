import { playGlobal, type GlobalAudioTrack } from "@/lib/globalAudio";

const LS_QUEUE = "audio.queue.v1";
const LS_INDEX = "audio.queue.idx.v1";

type Listener = () => void;
const listeners = new Set<Listener>();

function read(): { items: GlobalAudioTrack[]; index: number } {
  try {
    const items = JSON.parse(localStorage.getItem(LS_QUEUE) || "[]");
    const index = Number(localStorage.getItem(LS_INDEX) || 0);
    return { items: Array.isArray(items) ? items : [], index: Number.isFinite(index) ? index : 0 };
  } catch {
    return { items: [], index: 0 };
  }
}

function write(items: GlobalAudioTrack[], index: number) {
  try {
    localStorage.setItem(LS_QUEUE, JSON.stringify(items));
    localStorage.setItem(LS_INDEX, String(index));
  } catch { /* noop */ }
  listeners.forEach((l) => l());
}

export function subscribeQueue(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function getQueue() { return read(); }

export function setQueue(items: GlobalAudioTrack[], startIndex = 0) {
  write(items, Math.max(0, Math.min(startIndex, items.length - 1)));
  const at = items[startIndex];
  if (at) void playGlobal(at);
}

export function enqueueTrack(track: GlobalAudioTrack) {
  const { items, index } = read();
  const dedup = items.filter((t) => t.src !== track.src);
  dedup.push(track);
  write(dedup, Math.min(index, dedup.length - 1));
}

export function removeAt(idx: number) {
  const { items, index } = read();
  if (idx < 0 || idx >= items.length) return;
  const next = items.slice(0, idx).concat(items.slice(idx + 1));
  const nextIdx = idx < index ? Math.max(0, index - 1) : index;
  write(next, Math.min(nextIdx, Math.max(0, next.length - 1)));
}

export function playNext(): GlobalAudioTrack | null {
  const { items, index } = read();
  const nextIdx = index + 1;
  if (nextIdx >= items.length) return null;
  write(items, nextIdx);
  const t = items[nextIdx];
  if (t) void playGlobal(t);
  return t ?? null;
}

export function playPrev(): GlobalAudioTrack | null {
  const { items, index } = read();
  const nextIdx = Math.max(0, index - 1);
  write(items, nextIdx);
  const t = items[nextIdx];
  if (t) void playGlobal(t);
  return t ?? null;
}

export function clearQueue() {
  write([], 0);
}