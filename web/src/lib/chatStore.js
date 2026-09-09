const DB_NAME = 'manak-mitra-local';
const DB_VERSION = 1;
const STORE_NAME = 'conversations';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is unavailable in this browser.'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open local chat database.'));
  });
}

function transact(mode, operation) {
  return openDatabase().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = operation(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Local chat database operation failed.'));
    transaction.oncomplete = () => db.close();
  }));
}

export function createConversationRecord(messages) {
  const now = new Date().toISOString();
  const id = window.crypto?.randomUUID?.() || `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return { id, title: 'New compliance inquiry', messages, createdAt: now, updatedAt: now };
}

export function listConversations() {
  return transact('readonly', (store) => store.getAll()).then((rows) =>
    (rows || []).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
  );
}

export function getConversation(id) {
  return transact('readonly', (store) => store.get(id));
}

export function saveConversation(conversation) {
  return transact('readwrite', (store) => store.put(conversation));
}

export function deleteConversation(id) {
  return transact('readwrite', (store) => store.delete(id));
}
