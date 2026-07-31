import type { EditorDraft, SavedProject } from "../types";

/**
 * Persistence for saved projects and the in-progress draft.
 *
 * IndexedDB rather than localStorage: an image editor stores multi-megabyte
 * documents, and localStorage is synchronous, string-only, and capped around
 * 5 MB total — the old flattened-PNG save could exhaust it in two saves.
 *
 * Deliberately thin. Everything that can be *wrong* lives in `projectDoc.ts`,
 * which is pure and tested; this file is I/O only, and the test environment is
 * `node` with no `indexedDB` to run against.
 *
 * No call here rejects. IndexedDB is unavailable in Safari private mode and in
 * some WebViews, and a storage failure must degrade to "this save didn't
 * stick" rather than an unhandled rejection in the editor.
 */

const DB_NAME = "stride";
const DB_VERSION = 1;
const PROJECTS = "projects";
const META = "meta";
const DRAFT_KEY = "draft";

/** Pre-release: the old flattened-PNG projects are not migrated. */
const LEGACY_KEY = "stride_projects";

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROJECTS)) {
        db.createObjectStore(PROJECTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META, { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      dropLegacyStorage();
      resolve(request.result);
    };

    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });

  return dbPromise;
}

/**
 * Clears the pre-release `stride_projects` entries.
 *
 * Those held a flattened export PNG in place of a document, so there is
 * nothing in them a real project could be rebuilt from — carrying them forward
 * would only preserve the bug.
 */
function dropLegacyStorage(): void {
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Storage disabled entirely; nothing to clear.
  }
}

type TxMode = "readonly" | "readwrite";

/** Runs `work` inside a transaction, resolving to `fallback` on any failure. */
async function withStore<T>(
  storeName: string,
  mode: TxMode,
  work: (store: IDBObjectStore) => IDBRequest,
  fallback: T
): Promise<T> {
  const db = await openDb();
  if (!db) return fallback;

  return new Promise<T>((resolve) => {
    let request: IDBRequest;
    try {
      const tx = db.transaction(storeName, mode);
      tx.onabort = () => resolve(fallback);
      tx.onerror = () => resolve(fallback);
      request = work(tx.objectStore(storeName));
    } catch {
      resolve(fallback);
      return;
    }

    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => resolve(fallback);
  });
}

// ── Projects ────────────────────────────────────────────────────────────────

/** Newest first. A read failure yields an empty list, so the UI shows its
 *  empty state rather than crashing. */
export async function listProjects(): Promise<SavedProject[]> {
  const all = await withStore<SavedProject[]>(
    PROJECTS,
    "readonly",
    (store) => store.getAll(),
    []
  );

  return (all ?? [])
    .slice()
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

export async function getProject(id: string): Promise<SavedProject | null> {
  const found = await withStore<SavedProject | undefined>(
    PROJECTS,
    "readonly",
    (store) => store.get(id),
    undefined
  );

  return found ?? null;
}

/** Resolves false when the write did not stick, so callers can say so. */
export async function saveProject(project: SavedProject): Promise<boolean> {
  const result = await withStore<IDBValidKey | null>(
    PROJECTS,
    "readwrite",
    (store) => store.put(project),
    null
  );

  return result !== null;
}

export async function deleteProject(id: string): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;

  return new Promise<boolean>((resolve) => {
    try {
      const tx = db.transaction(PROJECTS, "readwrite");
      tx.oncomplete = () => resolve(true);
      tx.onabort = () => resolve(false);
      tx.onerror = () => resolve(false);
      tx.objectStore(PROJECTS).delete(id);
    } catch {
      resolve(false);
    }
  });
}

// ── Draft ───────────────────────────────────────────────────────────────────

/** One slot, not one per project — "restore your last session?" needs exactly
 *  one answer. */
export async function saveDraft(draft: Omit<EditorDraft, "key">): Promise<boolean> {
  const result = await withStore<IDBValidKey | null>(
    META,
    "readwrite",
    (store) => store.put({ ...draft, key: DRAFT_KEY }),
    null
  );

  return result !== null;
}

export async function loadDraft(): Promise<EditorDraft | null> {
  const found = await withStore<EditorDraft | undefined>(
    META,
    "readonly",
    (store) => store.get(DRAFT_KEY),
    undefined
  );

  return found ?? null;
}

export async function clearDraft(): Promise<void> {
  const db = await openDb();
  if (!db) return;

  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(META, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onabort = () => resolve();
      tx.onerror = () => resolve();
      tx.objectStore(META).delete(DRAFT_KEY);
    } catch {
      resolve();
    }
  });
}
