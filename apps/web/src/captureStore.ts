export type LocalAudio = {
  id: string; title: string; createdAt: string; durationSeconds: number;
  mimeType: string; bytes: number; fileName?: string; state: 'capturing' | 'saved' | 'interrupted';
};
let opening: Promise<IDBDatabase> | undefined;
function db() {
  return opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('lecture-companion-audio', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('lessons', { keyPath: 'id' });
      request.result.createObjectStore('chunks', { keyPath: ['id', 'index'] });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { opening = undefined; reject(new Error('Local audio storage is unavailable. Enable browser storage before recording.')); };
  });
}
async function transaction<T>(stores: string[], mode: IDBTransactionMode, work: (tx: IDBTransaction) => IDBRequest<T>) {
  const database = await db();
  return new Promise<T>((resolve, reject) => {
    const tx = database.transaction(stores, mode);
    const request = work(tx);
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = tx.onabort = () => reject(new Error('Audio could not be saved locally. Free storage, then try saving again.'));
  });
}
export async function saveLocal(audio: LocalAudio) { await transaction(['lessons'], 'readwrite', tx => tx.objectStore('lessons').put(audio)); }
export async function saveChunk(audio: LocalAudio, index: number, blob: Blob) {
  await transaction(['lessons', 'chunks'], 'readwrite', tx => {
    tx.objectStore('chunks').put({ id: audio.id, index, blob });
    return tx.objectStore('lessons').put(audio);
  });
}
export async function listLocal(): Promise<LocalAudio[]> {
  const all = await transaction(['lessons'], 'readonly', tx => tx.objectStore('lessons').getAll());
  return (all as LocalAudio[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function audioBlob(audio: LocalAudio) {
  const chunks = await transaction(['chunks'], 'readonly', tx => tx.objectStore('chunks').getAll(IDBKeyRange.bound([audio.id, 0], [audio.id, Number.MAX_SAFE_INTEGER])));
  // Only combine fragments from this recording, in order, keeping the container header.
  return new Blob((chunks as { blob: Blob }[]).map(c => c.blob), { type: audio.mimeType });
}
export async function deleteLocal(id: string) {
  await transaction(['lessons', 'chunks'], 'readwrite', tx => {
    tx.objectStore('chunks').delete(IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]));
    return tx.objectStore('lessons').delete(id);
  });
}
