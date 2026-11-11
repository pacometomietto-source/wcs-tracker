/*
 * db.js — lecture et écriture dans IndexedDB (la base de données de l'iPhone).
 * Tu n'as normalement jamais besoin de modifier ce fichier.
 */
const DB_NAME = 'wcs-tracker';
const DB_VERSION = 1;
export const STORES = ['events', 'expenses', 'competitions', 'settings'];

let dbPromise = null;

function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      // Appelé la première fois (ou quand DB_VERSION augmente) : on crée les tables.
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const name of STORES) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id' });
          }
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

// Lance une opération et attend qu'elle soit bien enregistrée.
async function run(storeNames, mode, work) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    const request = work(tx);
    tx.oncomplete = () => resolve(request instanceof IDBRequest ? request.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const getAll = (store) =>
  run(store, 'readonly', (tx) => tx.objectStore(store).getAll());

export const get = (store, id) =>
  run(store, 'readonly', (tx) => tx.objectStore(store).get(id));

export const putMany = (store, items) =>
  run(store, 'readwrite', (tx) => {
    const s = tx.objectStore(store);
    items.forEach((item) => s.put(item));
  });

export const put = (store, item) => putMany(store, [item]);

export const deleteMany = (store, ids) =>
  run(store, 'readwrite', (tx) => {
    const s = tx.objectStore(store);
    ids.forEach((id) => s.delete(id));
  });

export const remove = (store, id) => deleteMany(store, [id]);

// Remplace TOUT le contenu (utilisé par l'import d'une sauvegarde).
export const replaceAll = (data) =>
  run(STORES, 'readwrite', (tx) => {
    for (const name of STORES) {
      const s = tx.objectStore(name);
      s.clear();
      (data[name] || []).forEach((item) => s.put(item));
    }
  });
