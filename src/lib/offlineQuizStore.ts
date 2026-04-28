// Lightweight IndexedDB store for offline CBT sets.
// One DB, two stores: "sets" (metadata) and "questions" (per set).

const DB_NAME = "overaprep-offline";
const DB_VERSION = 1;
const SET_STORE = "sets";
const Q_STORE = "questions";

export interface OfflineQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  image_url: string | null;
  course_name?: string | null;
}

export interface OfflineSet {
  id: string; // local set id
  title: string;
  source: "recommended" | "weak-area" | "manual";
  course_name?: string | null;
  question_count: number;
  downloaded_at: number;
  user_id: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SET_STORE)) {
        const s = db.createObjectStore(SET_STORE, { keyPath: "id" });
        s.createIndex("user_id", "user_id", { unique: false });
      }
      if (!db.objectStoreNames.contains(Q_STORE)) {
        const q = db.createObjectStore(Q_STORE, { keyPath: ["set_id", "id"] });
        q.createIndex("set_id", "set_id", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveOfflineSet(set: OfflineSet, questions: OfflineQuestion[]) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction([SET_STORE, Q_STORE], "readwrite");
    tx.objectStore(SET_STORE).put(set);
    const qStore = tx.objectStore(Q_STORE);
    questions.forEach((q) => qStore.put({ ...q, set_id: set.id }));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listOfflineSets(userId: string): Promise<OfflineSet[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SET_STORE, "readonly");
    const idx = tx.objectStore(SET_STORE).index("user_id");
    const req = idx.getAll(userId);
    req.onsuccess = () => resolve((req.result as OfflineSet[]).sort((a, b) => b.downloaded_at - a.downloaded_at));
    req.onerror = () => reject(req.error);
  });
}

export async function getOfflineSet(setId: string): Promise<{ set: OfflineSet | null; questions: OfflineQuestion[] }> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([SET_STORE, Q_STORE], "readonly");
    const setReq = tx.objectStore(SET_STORE).get(setId);
    const qReq = tx.objectStore(Q_STORE).index("set_id").getAll(setId);
    let set: OfflineSet | null = null;
    let questions: OfflineQuestion[] = [];
    setReq.onsuccess = () => (set = setReq.result || null);
    qReq.onsuccess = () => (questions = (qReq.result as any[]).map(({ set_id, ...rest }) => rest));
    tx.oncomplete = () => resolve({ set, questions });
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteOfflineSet(setId: string) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction([SET_STORE, Q_STORE], "readwrite");
    tx.objectStore(SET_STORE).delete(setId);
    const idx = tx.objectStore(Q_STORE).index("set_id");
    const req = idx.openCursor(setId);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
