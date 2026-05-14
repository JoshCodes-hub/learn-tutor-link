/**
 * Tiny IndexedDB wrapper to cache tutor-material blobs for offline access.
 * Keyed by material id. Survives reloads; works without service worker.
 */

const DB_NAME = "overra-offline-library";
const STORE = "materials";
const VERSION = 1;

export interface CachedMaterial {
  id: string;
  title: string;
  mime: string;
  ext?: string;
  blob: Blob;
  cached_at: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheMaterialOffline(item: CachedMaterial): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getCachedMaterial(id: string): Promise<CachedMaterial | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => { db.close(); resolve((req.result as CachedMaterial) || null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function listCachedMaterialIds(): Promise<string[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAllKeys();
    req.onsuccess = () => { db.close(); resolve((req.result as string[]) || []); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function removeCachedMaterial(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Open a cached blob in a new tab via object URL. */
export function openCachedBlob(item: CachedMaterial): void {
  const url = URL.createObjectURL(item.blob);
  const w = window.open(url, "_blank", "noopener");
  // Revoke later to allow the new tab to load it.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  if (!w) {
    // Popup blocked — trigger download instead.
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.title}.${item.ext || (item.mime.split("/")[1] || "bin")}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

/* ---- Auto-save preference (per-device) ---- */
const AUTO_SAVE_KEY = "overra:autoSaveTutorMaterials";
export const getAutoSaveEnabled = (): boolean => {
  try { return localStorage.getItem(AUTO_SAVE_KEY) === "1"; } catch { return false; }
};
export const setAutoSaveEnabled = (v: boolean): void => {
  try { localStorage.setItem(AUTO_SAVE_KEY, v ? "1" : "0"); } catch { /* ignore */ }
};