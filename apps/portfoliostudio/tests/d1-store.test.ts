import { describe, expect, it } from "vitest";
import { D1Store, type D1DatabaseLike } from "../server/store";

function fakeD1(initial: Record<string, unknown> = {}) {
  const values = new Map(
    Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]),
  );
  const counters = new Map<string, { bucket: number; count: number }>();
  const queries: string[] = [];
  const db: D1DatabaseLike = {
    prepare(query) {
      queries.push(query);
      return {
        bind(...args: unknown[]) {
          return {
            async first<T>() {
              const key = String(args[0]);
              const value = values.get(key);
              return (value === undefined ? null : { value }) as T | null;
            },
            async all<T>() {
              const from = String(args[0]);
              const to = String(args[1]);
              return {
                results: [...values.entries()]
                  .filter(([key]) => key >= from && key < to)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([key, value]) => ({ key, value })) as T[],
              };
            },
            async run() {
              if (query.includes("INSERT INTO counters")) {
                const key = String(args[0]);
                const bucket = Number(args[1]);
                const amount = Number(args[2]);
                const limit = Number(args[3]);
                const current = counters.get(key);
                if (!current) {
                  counters.set(key, { bucket, count: amount });
                  return { meta: { changes: 1 } };
                }
                if (current.bucket !== bucket) {
                  counters.set(key, { bucket, count: amount });
                  return { meta: { changes: 1 } };
                }
                if (current.count + amount > limit)
                  return { meta: { changes: 0 } };
                current.count += amount;
                return { meta: { changes: 1 } };
              }
              if (
                query.startsWith("DELETE FROM kv WHERE key = ?1 AND value = ?2")
              ) {
                const key = String(args[0]);
                if (values.get(key) !== String(args[1]))
                  return { meta: { changes: 0 } };
                values.delete(key);
                return { meta: { changes: 1 } };
              }
              const key = String(args[0]);
              if (query.startsWith("INSERT") && values.has(key))
                throw new Error("UNIQUE constraint failed: kv.key");
              if (query.startsWith("INSERT")) values.set(key, String(args[1]));
              if (
                query.startsWith("UPDATE") &&
                values.get(key) === String(args[2])
              )
                values.set(key, String(args[1]));
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
    async exec() {
      return undefined;
    },
  };
  return { db, queries };
}

describe("D1Store", () => {
  it("lists project keys containing underscores using an indexed range", async () => {
    const { db, queries } = fakeD1({
      "owner:user_one:project:p_1": { id: "p_1" },
      "owner:user_one:project:p_2": { id: "p_2" },
      "owner:user_two:project:p_3": { id: "p_3" },
    });
    const rows = await new D1Store(db).list<{ id: string }>(
      "owner:user_one:project:",
    );
    expect(rows.map((row) => row.value.id)).toEqual(["p_1", "p_2"]);
    expect(queries[0]).toContain("key >= ?1 AND key < ?2");
  });

  it("only treats a uniqueness collision as a failed claim", async () => {
    const duplicate = fakeD1({ "slug:claimed": { id: "old" } });
    expect(
      await new D1Store(duplicate.db).putIfAbsent("slug:claimed", {
        id: "new",
      }),
    ).toBe(false);

    const outage: D1DatabaseLike = {
      prepare() {
        return {
          bind() {
            return {
              first: async () => null,
              all: async () => ({ results: [] }),
              run: async () => {
                throw new Error("D1 connection unavailable");
              },
            };
          },
        };
      },
      async exec() {
        return undefined;
      },
    };
    await expect(
      new D1Store(outage).putIfAbsent("slug:new", { id: "new" }),
    ).rejects.toThrow("D1 connection unavailable");
  });

  it("consumes a D1 counter atomically at its exact limit", async () => {
    const { db, queries } = fakeD1();
    const store = new D1Store(db);
    expect(await store.consumeCounter("rate:ip", 42, 1, 3)).toBe(true);
    expect(await store.consumeCounter("rate:ip", 42, 1, 3)).toBe(true);
    expect(await store.consumeCounter("rate:ip", 42, 1, 3)).toBe(true);
    expect(await store.consumeCounter("rate:ip", 42, 1, 3)).toBe(false);
    expect(
      queries.some(
        (query) =>
          query.includes("INSERT INTO counters") &&
          query.includes("ON CONFLICT"),
      ),
    ).toBe(true);
  });

  it("deletes a claim only when its value still matches", async () => {
    const { db } = fakeD1({
      "slug:claim": { projectId: "project_1", claimToken: "claim_1" },
    });
    const store = new D1Store(db);
    expect(
      await store.deleteIfValue("slug:claim", {
        projectId: "other",
        claimToken: "claim_1",
      }),
    ).toBe(false);
    expect(
      await store.deleteIfValue("slug:claim", {
        projectId: "project_1",
        claimToken: "claim_1",
      }),
    ).toBe(true);
    expect(await store.get("slug:claim")).toBeNull();
  });
});
