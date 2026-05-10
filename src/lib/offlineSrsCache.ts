// Tiny IndexedDB-backed cache for SRS cards + queued reviews.
// No external deps. Falls back silently if IndexedDB unavailable.

const DB_NAME = "overra-srs";
const DB_VERSION = 1;
const STORE_CARDS = "cards";       // key: card.id, value: SrsCard
const STORE_QUEUE = "review_queue"; // key: auto, value: { cardId, quality, prev, next, ts, userId }
const STORE_META  = "meta";         // key: string, value: any

function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CARDS)) db.createObjectStore(STORE_CARDS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORE_QUEUE)) db.createObjectStore(STORE_QUEUE, { keyPath: "id", autoIncrement: true });
      if (!db.objectStoreNames.contains(STORE_META))  db.createObjectStore(STORE_META);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<T | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result: any = null;
    const req = fn(s);
    if (req) (req as IDBRequest).onsuccess = () => { result = (req as IDBRequest).result; };
    t.oncomplete = () => resolve(result as T);
    t.onerror = () => resolve(null);
  });
}

export type CachedCard = {
  id: string; user_id: string; front: string; back: string;
  source_kind: string; source_id: string | null; tag: string | null;
  ease_factor: number; interval_days: number; repetitions: number;
  due_at: string; last_reviewed_at: string | null;
};

export async function cacheDueCards(cards: CachedCard[]) {
  const db = await open();
  if (!db) return;
  await new Promise<void>((res) => {
    const t = db.transaction(STORE_CARDS, "readwrite");
    const s = t.objectStore(STORE_CARDS);
    s.clear();
    cards.forEach(c => s.put(c));
    t.oncomplete = () => res();
    t.onerror = () => res();
  });
  await tx(STORE_META, "readwrite", s => s.put(Date.now(), "due_cached_at"));
}

export async function getCachedDueCards(): Promise<CachedCard[]> {
  return (await tx<CachedCard[]>(STORE_CARDS, "readonly", s => s.getAll())) ?? [];
}

export async function getCachedAt(): Promise<number | null> {
  return (await tx<number>(STORE_META, "readonly", s => s.get("due_cached_at"))) ?? null;
}

export async function queueReview(entry: {
  cardId: string; quality: number;
  next: { ease_factor: number; interval_days: number; repetitions: number; due_at: string };
  prevIntervalDays: number; userId: string;
}) {
  await tx(STORE_QUEUE, "readwrite", s => s.add({ ...entry, ts: Date.now() }));
  // Also update cached card so subsequent offline reviews use new state
  const card = await tx<CachedCard>(STORE_CARDS, "readonly", s => s.get(entry.cardId));
  if (card) {
    const updated: CachedCard = {
      ...card,
      ease_factor: entry.next.ease_factor,
      interval_days: entry.next.interval_days,
      repetitions: entry.next.repetitions,
      due_at: entry.next.due_at,
      last_reviewed_at: new Date().toISOString(),
    };
    await tx(STORE_CARDS, "readwrite", s => s.put(updated));
  }
}

export async function getQueuedReviews(): Promise<any[]> {
  return (await tx<any[]>(STORE_QUEUE, "readonly", s => s.getAll())) ?? [];
}

export async function clearQueue() {
  await tx(STORE_QUEUE, "readwrite", s => s.clear());
}

export async function removeQueuedById(id: number) {
  await tx(STORE_QUEUE, "readwrite", s => s.delete(id));
}
