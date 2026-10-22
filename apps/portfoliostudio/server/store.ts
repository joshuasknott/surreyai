import type { PortfolioDocument } from "../shared/portfolio";

export interface Store {
  get<T>(key: string): Promise<T | null>;
  put<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  deleteIfValue<T>(key: string, expected: T): Promise<boolean>;
  list<T>(prefix: string): Promise<Array<{ key: string; value: T }>>;
  putIfAbsent<T>(key: string, value: T): Promise<boolean>;
  /** Atomically consume amount from a bucket, returning false at the cap. */
  consumeCounter(
    key: string,
    bucket: number,
    amount: number,
    limit: number,
  ): Promise<boolean>;
  compareAndSwap<T>(
    key: string,
    expected: T | null,
    value: T,
  ): Promise<boolean>;
}

type Stored = { value: unknown; etag: number };

/** The same atomic semantics used by the D1 adapter, useful for tests and local development. */
export class MemoryStore implements Store {
  private readonly values = new Map<string, Stored>();
  async get<T>(key: string): Promise<T | null> {
    const value = this.values.get(key)?.value;
    return value === undefined ? null : structuredClone(value as T);
  }
  async put<T>(key: string, value: T): Promise<void> {
    const current = this.values.get(key);
    this.values.set(key, {
      value: structuredClone(value),
      etag: (current?.etag ?? 0) + 1,
    });
  }
  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
  async deleteIfValue<T>(key: string, expected: T): Promise<boolean> {
    const current = this.values.get(key);
    if (!current || JSON.stringify(current.value) !== JSON.stringify(expected))
      return false;
    this.values.delete(key);
    return true;
  }
  async list<T>(prefix: string): Promise<Array<{ key: string; value: T }>> {
    return [...this.values.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, stored]) => ({
        key,
        value: structuredClone(stored.value as T),
      }));
  }
  async putIfAbsent<T>(key: string, value: T): Promise<boolean> {
    if (this.values.has(key)) return false;
    this.values.set(key, { value: structuredClone(value), etag: 1 });
    return true;
  }
  async consumeCounter(
    key: string,
    bucket: number,
    amount: number,
    limit: number,
  ): Promise<boolean> {
    if (
      !Number.isSafeInteger(bucket) ||
      !Number.isSafeInteger(amount) ||
      amount < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < amount
    )
      return false;
    const current = this.values.get(key)?.value as
      { bucket?: number; count?: number } | undefined;
    const currentBucket = current?.bucket === bucket ? (current.count ?? 0) : 0;
    if (!Number.isSafeInteger(currentBucket) || currentBucket + amount > limit)
      return false;
    this.values.set(key, {
      value: { bucket, count: currentBucket + amount },
      etag: (this.values.get(key)?.etag ?? 0) + 1,
    });
    return true;
  }
  async compareAndSwap<T>(
    key: string,
    expected: T | null,
    value: T,
  ): Promise<boolean> {
    const current = this.values.get(key);
    if (JSON.stringify(current?.value ?? null) !== JSON.stringify(expected))
      return false;
    this.values.set(key, {
      value: structuredClone(value),
      etag: (current?.etag ?? 0) + 1,
    });
    return true;
  }
}

export interface D1DatabaseLike {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = Record<string, unknown>>(): Promise<T | null>;
      all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
      run(): Promise<unknown>;
    };
  };
  exec(query: string): Promise<unknown>;
}

export async function ensureD1Schema(db: D1DatabaseLike): Promise<void> {
  await db.exec(
    "CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL DEFAULT (unixepoch()))",
  );
  await db.exec(
    "CREATE TABLE IF NOT EXISTS counters (key TEXT PRIMARY KEY, bucket INTEGER NOT NULL, count INTEGER NOT NULL, updated_at INTEGER NOT NULL DEFAULT (unixepoch()))",
  );
}

/** D1's primary-key constraint supplies the create-if-absent operation. */
export class D1Store implements Store {
  constructor(private readonly db: D1DatabaseLike) {}
  async get<T>(key: string): Promise<T | null> {
    const row = await this.db
      .prepare("SELECT value FROM kv WHERE key = ?1")
      .bind(key)
      .first<{ value: string }>();
    return row ? (JSON.parse(row.value) as T) : null;
  }
  async put<T>(key: string, value: T): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO kv(key,value,updated_at) VALUES(?1,?2,unixepoch()) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
      )
      .bind(key, JSON.stringify(value))
      .run();
  }
  async delete(key: string): Promise<void> {
    await this.db.prepare("DELETE FROM kv WHERE key = ?1").bind(key).run();
  }
  async deleteIfValue<T>(key: string, expected: T): Promise<boolean> {
    const result = await this.db
      .prepare("DELETE FROM kv WHERE key = ?1 AND value = ?2")
      .bind(key, JSON.stringify(expected))
      .run();
    return (result as { meta?: { changes?: number } }).meta?.changes === 1;
  }
  async list<T>(prefix: string): Promise<Array<{ key: string; value: T }>> {
    // Use an indexed lexicographic range instead of LIKE.  Project keys contain
    // underscores, and an escaped LIKE pattern without an explicit ESCAPE clause
    // silently returns no rows in SQLite/D1.
    const rows = await this.db
      .prepare(
        "SELECT key,value FROM kv WHERE key >= ?1 AND key < ?2 ORDER BY key",
      )
      .bind(prefix, `${prefix}\uffff`)
      .all<{ key: string; value: string }>();
    return rows.results.map((row) => ({
      key: row.key,
      value: JSON.parse(row.value) as T,
    }));
  }
  async putIfAbsent<T>(key: string, value: T): Promise<boolean> {
    try {
      await this.db
        .prepare(
          "INSERT INTO kv(key,value,updated_at) VALUES(?1,?2,unixepoch())",
        )
        .bind(key, JSON.stringify(value))
        .run();
      return true;
    } catch (error) {
      // Only a primary-key collision means that another request won the claim.
      // Propagate D1 outages and malformed statements so callers do not turn a
      // storage failure into a false "already exists" response.
      const message = error instanceof Error ? error.message : String(error);
      if (/unique|constraint/i.test(message)) return false;
      throw error;
    }
  }
  async consumeCounter(
    key: string,
    bucket: number,
    amount: number,
    limit: number,
  ): Promise<boolean> {
    if (
      !Number.isSafeInteger(bucket) ||
      !Number.isSafeInteger(amount) ||
      amount < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < amount
    )
      return false;
    const result = await this.db
      .prepare(
        `INSERT INTO counters(key,bucket,count,updated_at) VALUES(?1,?2,?3,unixepoch())
         ON CONFLICT(key) DO UPDATE SET
           bucket=excluded.bucket,
           count=CASE WHEN counters.bucket=excluded.bucket THEN counters.count + excluded.count ELSE excluded.count END,
           updated_at=excluded.updated_at
         WHERE counters.bucket != excluded.bucket OR counters.count + excluded.count <= ?4`,
      )
      .bind(key, bucket, amount, limit)
      .run();
    return (result as { meta?: { changes?: number } }).meta?.changes === 1;
  }
  async compareAndSwap<T>(
    key: string,
    expected: T | null,
    value: T,
  ): Promise<boolean> {
    if (expected === null) return this.putIfAbsent(key, value);
    const result = await this.db
      .prepare(
        "UPDATE kv SET value=?2, updated_at=unixepoch() WHERE key=?1 AND value=?3",
      )
      .bind(key, JSON.stringify(value), JSON.stringify(expected))
      .run();
    return (result as { meta?: { changes?: number } }).meta?.changes === 1;
  }
}

export type ProjectDocument = PortfolioDocument;
