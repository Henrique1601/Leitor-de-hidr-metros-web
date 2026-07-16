const DB_NAME = 'hidrometro-cache';
const STORE = 'extractions';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function makeKey(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const ab = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(ab.slice(0, 256));
      const parts = [file.name, file.size.toString()];
      for (let i = 0; i < bytes.length; i++) {
        parts.push(bytes[i].toString(16));
      }
      let hash = 0;
      const str = parts.join(':');
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
      }
      resolve(`photo_${Math.abs(hash).toString(36)}`);
    };
    reader.readAsArrayBuffer(file.slice(0, 256));
  });
}

export interface CachedResult {
  arquivo: string;
  apartamentosEsperados: string[];
  medidores: any[];
}

export async function getCachedResult(file: File): Promise<CachedResult | null> {
  try {
    const db = await openDB();
    const key = await makeKey(file);
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCachedResult(file: File, result: CachedResult): Promise<void> {
  try {
    const db = await openDB();
    const key = await makeKey(file);
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(result, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // silently ignore cache errors
  }
}

export async function clearCache(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // silently ignore
  }
}
