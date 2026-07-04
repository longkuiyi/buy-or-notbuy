import type { HistoryRecord, WishlistItem, TrendingItem } from '../types';

const DB_NAME = 'buy-sth-db';
const DB_VERSION = 1;
const HISTORY_STORE = 'history';
const WISHLIST_STORE = 'wishlist';
const TRENDING_KEY = 'buy-sth-trending';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        const store = db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(WISHLIST_STORE)) {
        const store = db.createObjectStore(WISHLIST_STORE, { keyPath: 'id' });
        store.createIndex('addedAt', 'addedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = action(store);
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
}

/* ---------------- 历史记录 ---------------- */

export async function saveHistory(record: HistoryRecord): Promise<void> {
  await withStore(HISTORY_STORE, 'readwrite', (store) => store.put(record));
}

export async function getAllHistory(): Promise<HistoryRecord[]> {
  const records = await withStore<HistoryRecord[]>(HISTORY_STORE, 'readonly', (store) =>
    store.getAll()
  );
  return records.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getHistoryById(id: string): Promise<HistoryRecord | undefined> {
  return withStore<HistoryRecord | undefined>(HISTORY_STORE, 'readonly', (store) =>
    store.get(id)
  );
}

export async function deleteHistory(id: string): Promise<void> {
  await withStore(HISTORY_STORE, 'readwrite', (store) => store.delete(id));
}

export async function clearHistory(): Promise<void> {
  await withStore(HISTORY_STORE, 'readwrite', (store) => store.clear());
}

/* ---------------- 心愿单 ---------------- */

export async function saveWishlistItem(item: WishlistItem): Promise<void> {
  await withStore(WISHLIST_STORE, 'readwrite', (store) => store.put(item));
}

export async function getAllWishlist(): Promise<WishlistItem[]> {
  const items = await withStore<WishlistItem[]>(WISHLIST_STORE, 'readonly', (store) =>
    store.getAll()
  );
  return items.sort((a, b) => b.addedAt - a.addedAt);
}

export async function deleteWishlistItem(id: string): Promise<void> {
  await withStore(WISHLIST_STORE, 'readwrite', (store) => store.delete(id));
}

/* ---------------- 热门榜（localStorage） ---------------- */

export function recordTrending(productName: string, decision: string | null): void {
  if (!productName.trim()) return;
  try {
    const map = getTrendingMap();
    const key = productName.trim();
    const existing = map[key];
    map[key] = {
      productName: key,
      count: (existing?.count || 0) + 1,
      lastDecision: decision ?? existing?.lastDecision ?? null,
      lastSearchedAt: Date.now()
    };
    localStorage.setItem(TRENDING_KEY, JSON.stringify(map));
  } catch {
    // 忽略存储异常
  }
}

export function getTrending(limit = 8): TrendingItem[] {
  const map = getTrendingMap();
  return Object.values(map)
    .sort((a, b) => b.count - a.count || b.lastSearchedAt - a.lastSearchedAt)
    .slice(0, limit);
}

export function deleteTrendingItem(productName: string): void {
  try {
    const map = getTrendingMap();
    delete map[productName.trim()];
    localStorage.setItem(TRENDING_KEY, JSON.stringify(map));
  } catch {
    // 忽略存储异常
  }
}

export function clearTrending(): void {
  try {
    localStorage.removeItem(TRENDING_KEY);
  } catch {
    // 忽略存储异常
  }
}

function getTrendingMap(): Record<string, TrendingItem> {
  try {
    const raw = localStorage.getItem(TRENDING_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
