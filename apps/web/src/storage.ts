// Scope cached selections and pending operations to the configured demo host.
// No access/provider credentials are stored here. No automatic mutation retries.
export class StorageFailure extends Error {}
export function read<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw) as T; } catch { return fallback; }
}
export function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { throw new StorageFailure('Browser storage is unavailable or full. Enable site storage before starting this action so retries stay safe.'); }
}
export function remove(key: string) { localStorage.removeItem(key); }
export const scopeKey = (base: string, name: string) => `lecture-companion:${base}:${name}`;
export type Pending<T> = { key: string; body: T };
export function operation<T>(scope: string, body: T): Pending<T> {
  const existing = read<Pending<T> | null>(scope, null);
  if (existing) return existing;
  const pending = { key: crypto.randomUUID(), body };
  write(scope, pending); // Must persist BEFORE a request can leave the browser.
  return pending;
}
export function clearRecording(base: string, recordingId: string) {
  const prefix = scopeKey(base, `recording:${recordingId}:`);
  Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(remove);
}

export type UploadDraft = { key: string; file: File; title: string };
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('lecture-companion-transfer', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('uploads');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new StorageFailure('Browser file storage is unavailable. Enable site storage to retain upload retries.'));
  });
}
export async function uploadDraft(base: string, value?: UploadDraft | null): Promise<UploadDraft | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('uploads', value === undefined ? 'readonly' : 'readwrite');
      const store = tx.objectStore('uploads');
      const request = value === undefined ? store.get(base) : value === null ? store.delete(base) : store.put(value, base);
      tx.oncomplete = () => resolve(value === undefined ? request.result as UploadDraft | undefined : undefined);
      tx.onerror = () => reject(new StorageFailure('Could not keep the file for recovery. Free browser storage before uploading.'));
      tx.onabort = () => reject(new StorageFailure('Could not keep the file for recovery. Free browser storage before uploading.'));
    });
  } finally { db.close(); }
}
