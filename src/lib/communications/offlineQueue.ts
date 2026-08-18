"use client";

export interface QueuedTextMessage {
  clientMessageId: string;
  jobId: string;
  userId: string;
  content: string;
  createdAt: string;
}

const DB_NAME = "pomocnik-comms";
const DB_VERSION = 1;
const STORE_NAME = "queued_text_messages";

function openQueueDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "clientMessageId" });
        store.createIndex("by_job_user", ["jobId", "userId"], { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open offline queue."));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | undefined> {
  const db = await openQueueDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = fn(store);
    let result: T | undefined;

    if (request) {
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error ?? new Error("Offline queue operation failed."));
    }

    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Offline queue transaction failed."));
    };
  });
}

export async function enqueueTextMessage(message: QueuedTextMessage): Promise<void> {
  await withStore("readwrite", (store) => store.put(message));
}

export async function removeQueuedTextMessage(clientMessageId: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(clientMessageId));
}

export async function listQueuedTextMessages(input: {
  jobId: string;
  userId: string;
}): Promise<QueuedTextMessage[]> {
  const rows = await withStore<QueuedTextMessage[]>("readonly", (store) =>
    store.index("by_job_user").getAll([input.jobId, input.userId])
  );
  return (rows ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
