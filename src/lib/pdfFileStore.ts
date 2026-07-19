const DB_NAME = 'pdf-presenter';
const STORE_NAME = 'files';
const FILE_KEY = 'current';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Notes, timers, and page position already live in localStorage (see syncStore.ts), but a
// blob: URL only stays valid inside the tab that created it — reloading, or opening the app
// in a fresh tab, kills it. Keeping the actual PDF bytes here lets us rebuild a working blob
// URL afterward instead of throwing the whole session away.
export async function savePdfFile(file: File): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(file, FILE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadPdfFile(): Promise<File | null> {
  const db = await openDb();
  const file = await new Promise<File | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(FILE_KEY);
    request.onsuccess = () => resolve((request.result as File | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return file;
}

export async function clearPdfFile(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(FILE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
