// Tiny IndexedDB-backed LRU for 5y OHLC history series.
// Falls back to in-memory map if IndexedDB is unavailable (SSR, private mode).

export interface HistoryPoint {
  date: string;
  close: number;
}

const DB_NAME = "marketatlas-history";
const STORE = "ohlc";
const VERSION = 1;
const MAX_ENTRIES = 60; // LRU cap
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface Entry {
  key: string;
  data: HistoryPoint[];
  source: string;
  storedAt: number;
  touchedAt: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memory = new Map<string, Entry>();

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("touchedAt", "touchedAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

function tx(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

export function historyKey(symbol: string, range: string, interval: string) {
  return `${symbol}|${range}|${interval}`;
}

export async function readHistory(
  key: string,
): Promise<{ data: HistoryPoint[]; source: string } | null> {
  const mem = memory.get(key);
  if (mem && Date.now() - mem.storedAt < TTL_MS) {
    mem.touchedAt = Date.now();
    return { data: mem.data, source: mem.source };
  }
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    const req = tx(db, "readonly").get(key);
    req.onsuccess = () => {
      const e = req.result as Entry | undefined;
      if (!e) return resolve(null);
      if (Date.now() - e.storedAt > TTL_MS) return resolve(null);
      // Touch async; don't block read.
      void touch(key);
      memory.set(key, e);
      resolve({ data: e.data, source: e.source });
    };
    req.onerror = () => resolve(null);
  });
}

async function touch(key: string) {
  const db = await openDB();
  if (!db) return;
  const store = tx(db, "readwrite");
  const req = store.get(key);
  req.onsuccess = () => {
    const e = req.result as Entry | undefined;
    if (e) {
      e.touchedAt = Date.now();
      store.put(e);
    }
  };
}

export async function writeHistory(
  key: string,
  data: HistoryPoint[],
  source: string,
): Promise<void> {
  const entry: Entry = {
    key,
    data,
    source,
    storedAt: Date.now(),
    touchedAt: Date.now(),
  };
  memory.set(key, entry);
  const db = await openDB();
  if (!db) return;
  const store = tx(db, "readwrite");
  store.put(entry);
  // LRU eviction
  const countReq = store.count();
  countReq.onsuccess = () => {
    const excess = countReq.result - MAX_ENTRIES;
    if (excess <= 0) return;
    const cursorReq = store.index("touchedAt").openCursor();
    let removed = 0;
    cursorReq.onsuccess = () => {
      const c = cursorReq.result;
      if (!c || removed >= excess) return;
      c.delete();
      removed++;
      c.continue();
    };
  };
}
