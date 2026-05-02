/**
 * Browser-side AgentDB-flavoured client.
 *
 * Per the R-2.1 browser-compat survey (`docs/integration-r2-survey.md`),
 * `@claude-flow/memory`'s backends import `node:fs`/`node:events` and
 * cannot be bundled for the browser. This wrapper imports ONLY the
 * package's pure-JS pieces (`HnswLite`, `cosineSimilarity`) and pairs
 * them with IndexedDB for persistence — same algorithm of record as
 * the Node side, no fork.
 *
 * Public API mirrors the shape Repo classes expect:
 *
 *   put(id, namespace, data, vector?) → void
 *   get(id) → entry | null
 *   list(namespace?) → entry[]
 *   delete(id) → void
 *   searchByVector(vector, k) → [{id, score, entry}]
 *
 * HnswLite is lazy-loaded on first vector op (kept out of the
 * non-vector hot path). `idb` is used for the DB driver — already a
 * goal_ui dep from the existing RVF integration.
 */

import { type IDBPDatabase, openDB } from 'idb';

const DB_NAME = 'ruflo-research-agentdb';
const DB_VERSION = 1;
const STORE = 'entries';

export interface AgentDbEntry<T = unknown> {
  /** Stable key — `${namespace}:${innerKey}` is the convention used by repos. */
  id: string;
  /** Namespace — e.g. `widget`, `goal`, `research-config`. */
  namespace: string;
  /** Arbitrary JSON payload. */
  data: T;
  /** Optional 384d (or other) vector for HNSW recall. */
  vector?: Float32Array;
  /** Insertion / last-update timestamp (ms since epoch). */
  updatedAt: number;
}

export interface AgentDbSearchHit<T = unknown> {
  id: string;
  score: number;
  entry: AgentDbEntry<T>;
}

interface IDBSchemaShape {
  entries: {
    key: string;
    value: SerializedEntry;
    indexes: { 'by-namespace': string };
  };
}

/** IDB stores plain objects, not Float32Array. We round-trip via base64. */
interface SerializedEntry {
  id: string;
  namespace: string;
  data: unknown;
  vectorB64?: string;
  vectorDim?: number;
  updatedAt: number;
}

function f32ToB64(v: Float32Array): string {
  const bytes = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64ToF32(s: string): Float32Array {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}

function serialize<T>(e: AgentDbEntry<T>): SerializedEntry {
  return {
    id: e.id,
    namespace: e.namespace,
    data: e.data,
    vectorB64: e.vector ? f32ToB64(e.vector) : undefined,
    vectorDim: e.vector ? e.vector.length : undefined,
    updatedAt: e.updatedAt,
  };
}

function deserialize<T>(s: SerializedEntry): AgentDbEntry<T> {
  return {
    id: s.id,
    namespace: s.namespace,
    data: s.data as T,
    vector: s.vectorB64 ? b64ToF32(s.vectorB64) : undefined,
    updatedAt: s.updatedAt,
  };
}

let dbPromise: Promise<IDBPDatabase<IDBSchemaShape>> | null = null;
function getDb(): Promise<IDBPDatabase<IDBSchemaShape>> {
  if (!dbPromise) {
    dbPromise = openDB<IDBSchemaShape>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('by-namespace', 'namespace', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

// ── HnswLite lazy loader ──────────────────────────────────────────
// Imported on first vector op so non-vector callers don't pull the
// algorithm into their hot path.
type HnswLiteCtor = new (
  dimensions: number,
  m: number,
  efConstruction: number,
  metric: string,
) => {
  add(id: string, vector: Float32Array): void;
  search(query: Float32Array, k: number): Array<{ id: string; score: number }>;
};

let hnswLiteClassPromise: Promise<HnswLiteCtor> | null = null;
async function loadHnswLite(): Promise<HnswLiteCtor> {
  if (!hnswLiteClassPromise) {
    hnswLiteClassPromise = import('@claude-flow/memory/hnsw-lite').then(
      (m) => m.HnswLite as unknown as HnswLiteCtor,
    );
  }
  return hnswLiteClassPromise;
}

const DEFAULT_DIMENSIONS = 384;

export class AgentDbClient {
  private hnswCache = new Map<string /*namespace*/, ReturnType<HnswLiteCtor['prototype']['constructor']>>();
  private hnswHydrated = new Set<string>();

  async put<T>(id: string, namespace: string, data: T, vector?: Float32Array): Promise<void> {
    const db = await getDb();
    const entry: AgentDbEntry<T> = { id, namespace, data, vector, updatedAt: Date.now() };
    await db.put(STORE, serialize(entry));
    if (vector) {
      // Mirror into the in-memory HNSW for this namespace if it's
      // already been hydrated. If not, the next searchByVector call
      // will rebuild from IDB and pick up this entry.
      if (this.hnswHydrated.has(namespace)) {
        const hnsw = this.hnswCache.get(namespace);
        if (hnsw) hnsw.add(id, vector);
      }
    }
  }

  async get<T>(id: string): Promise<AgentDbEntry<T> | null> {
    const db = await getDb();
    const raw = await db.get(STORE, id);
    return raw ? deserialize<T>(raw) : null;
  }

  async list<T>(namespace?: string): Promise<Array<AgentDbEntry<T>>> {
    const db = await getDb();
    if (!namespace) {
      const all = await db.getAll(STORE);
      return all.map((s) => deserialize<T>(s));
    }
    const ns = await db.getAllFromIndex(STORE, 'by-namespace', namespace);
    return ns.map((s) => deserialize<T>(s));
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(STORE, id);
  }

  async searchByVector<T>(
    namespace: string,
    queryVector: Float32Array,
    k = 10,
  ): Promise<Array<AgentDbSearchHit<T>>> {
    const HnswLite = await loadHnswLite();
    let hnsw = this.hnswCache.get(namespace);
    if (!hnsw) {
      hnsw = new HnswLite(queryVector.length || DEFAULT_DIMENSIONS, 16, 200, 'cosine');
      this.hnswCache.set(namespace, hnsw);
    }
    if (!this.hnswHydrated.has(namespace)) {
      const all = await this.list<T>(namespace);
      for (const e of all) if (e.vector) hnsw.add(e.id, e.vector);
      this.hnswHydrated.add(namespace);
    }
    const hits = hnsw.search(queryVector, k);
    const out: Array<AgentDbSearchHit<T>> = [];
    for (const h of hits) {
      const entry = await this.get<T>(h.id);
      if (entry) out.push({ id: h.id, score: h.score, entry });
    }
    return out;
  }
}

// Singleton — repos call into the same instance so the in-memory
// HNSW caches survive across repo instances.
let singleton: AgentDbClient | null = null;
export function getAgentDbClient(): AgentDbClient {
  if (!singleton) singleton = new AgentDbClient();
  return singleton;
}
