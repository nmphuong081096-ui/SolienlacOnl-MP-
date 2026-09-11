import {
  getDb,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
} from './firebase';

const STORAGE_PREFIX = 'gvcn360_';

export interface StorageService {
  getActiveDriver(): 'firestore' | 'localStorage';
  getCollection<T extends { id: string }>(collectionName: string): Promise<T[]>;
  saveItem<T extends { id: string }>(collectionName: string, item: T): Promise<T>;
  saveBatch<T extends { id: string }>(collectionName: string, items: T[]): Promise<void>;
  deleteItem(collectionName: string, id: string): Promise<void>;
  deleteAll(collectionName: string): Promise<void>;
  getSingleDoc<T>(collectionName: string, docId: string, defaultVal: T): Promise<T>;
  setSingleDoc<T>(collectionName: string, docId: string, data: T): Promise<T>;
  get<T = unknown>(collectionName: string): Promise<T | null>;
}

export const storage: StorageService = {
  getActiveDriver(): 'firestore' | 'localStorage' {
    const db = getDb();
    return db ? 'firestore' : 'localStorage';
  },

  async getCollection<T extends { id: string }>(collectionName: string): Promise<T[]> {
    const db = getDb();
    if (db) {
      try {
        const colRef = collection(db, collectionName);
        const snapshot = await getDocs(colRef);
        const items: T[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...d.data() } as T);
        });
        localStorage.setItem(STORAGE_PREFIX + collectionName, JSON.stringify(items));
        return items;
      } catch (err) {
        console.warn(`Firestore read failed for collection ${collectionName}, reading from cache:`, err);
      }
    }

    // LocalStorage fallback
    try {
      const cached = localStorage.getItem(STORAGE_PREFIX + collectionName);
      if (cached) {
        return JSON.parse(cached) as T[];
      }
    } catch {
      // Ignore error
    }
    return [];
  },

  async saveItem<T extends { id: string }>(collectionName: string, item: T): Promise<T> {
    const db = getDb();
    if (db) {
      try {
        const docRef = doc(db, collectionName, item.id);
        await setDoc(docRef, item, { merge: true });
      } catch (err) {
        console.warn(`Firestore write failed for ${collectionName}/${item.id}:`, err);
      }
    }

    const currentList: T[] = await storage.getCollection<T>(collectionName);
    const index = currentList.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      currentList[index] = item;
    } else {
      currentList.push(item);
    }
    localStorage.setItem(STORAGE_PREFIX + collectionName, JSON.stringify(currentList));
    return item;
  },

  async saveBatch<T extends { id: string }>(collectionName: string, items: T[]): Promise<void> {
    const db = getDb();
    if (db && items.length > 0) {
      try {
        const chunks: T[][] = [];
        for (let i = 0; i < items.length; i += 400) {
          chunks.push(items.slice(i, i + 400));
        }
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          for (const item of chunk) {
            const docRef = doc(db, collectionName, item.id);
            batch.set(docRef, item, { merge: true });
          }
          await batch.commit();
        }
      } catch (err) {
        console.warn(`Firestore batch write failed for ${collectionName}:`, err);
      }
    }

    const currentList: T[] = await storage.getCollection<T>(collectionName);
    const itemMap = new Map<string, T>(currentList.map((i) => [i.id, i]));
    for (const item of items) {
      itemMap.set(item.id, item);
    }
    const updatedList = Array.from(itemMap.values());
    localStorage.setItem(STORAGE_PREFIX + collectionName, JSON.stringify(updatedList));
  },

  async deleteItem(collectionName: string, id: string): Promise<void> {
    const db = getDb();
    if (db) {
      try {
        const docRef = doc(db, collectionName, id);
        await deleteDoc(docRef);
      } catch (err) {
        console.warn(`Firestore delete failed for ${collectionName}/${id}:`, err);
      }
    }

    const currentList = await storage.getCollection<{ id: string }>(collectionName);
    const filtered = currentList.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_PREFIX + collectionName, JSON.stringify(filtered));
  },

  async deleteAll(collectionName: string): Promise<void> {
    const db = getDb();
    if (db) {
      try {
        const colRef = collection(db, collectionName);
        const snapshot = await getDocs(colRef);
        const batch = writeBatch(db);
        snapshot.forEach((d) => {
          batch.delete(d.ref);
        });
        await batch.commit();
      } catch (err) {
        console.warn(`Firestore deleteAll failed for ${collectionName}:`, err);
      }
    }

    localStorage.removeItem(STORAGE_PREFIX + collectionName);
    localStorage.setItem(STORAGE_PREFIX + collectionName, JSON.stringify([]));
  },

  async getSingleDoc<T>(collectionName: string, docId: string, defaultVal: T): Promise<T> {
    const db = getDb();
    if (db) {
      try {
        const docRef = doc(db, collectionName, docId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const val = snap.data() as T;
          localStorage.setItem(STORAGE_PREFIX + `${collectionName}_${docId}`, JSON.stringify(val));
          return val;
        }
      } catch (err) {
        console.warn(`Firestore singleDoc read failed for ${collectionName}/${docId}:`, err);
      }
    }

    try {
      const cached = localStorage.getItem(STORAGE_PREFIX + `${collectionName}_${docId}`);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch {
      // Ignore
    }
    return defaultVal;
  },

  async setSingleDoc<T>(collectionName: string, docId: string, data: T): Promise<T> {
    const db = getDb();
    if (db) {
      try {
        const docRef = doc(db, collectionName, docId);
        await setDoc(docRef, data, { merge: true });
      } catch (err) {
        console.warn(`Firestore singleDoc set failed for ${collectionName}/${docId}:`, err);
      }
    }

    localStorage.setItem(STORAGE_PREFIX + `${collectionName}_${docId}`, JSON.stringify(data));
    return data;
  },

  async get<T = unknown>(collectionName: string): Promise<T | null> {
    try {
      const cached = localStorage.getItem(STORAGE_PREFIX + collectionName);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch {
      // Ignore
    }
    return null;
  },
};
