import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import { convexToJson, jsonToConvex, v } from "convex/values";
import { internalAction } from "../convex/_generated/server";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import type { Activity } from "../convex/plannerModel";

const GATE_SECRET = "local-preview-sign-in-gateway";
const OWNER_IDENTITY = {
  subject: "owner",
  issuer: "https://fixture.test",
  tokenIdentifier: "https://fixture.test|owner",
  name: "Joshua Knott",
  email: "joshhknott@gmail.com",
  emailVerified: true,
} as const;

/** This token only exists in this process and is never a production credential. */
export const PREVIEW_TOKEN =
  `${Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url")}.` +
  `${Buffer.from(JSON.stringify({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.local-preview-signature`;

const modules = {
  "./_generated/server.js": () => import("../convex/_generated/server.js"),
  "./planner.ts": () => import("../convex/planner"),
  "./plannerSignIn.ts": () => import("../convex/plannerSignIn"),
  "./users.ts": () => import("../convex/users"),
  "./http.ts": () => import("../convex/http"),
  "./plannerFiles.ts": () => import("../convex/plannerFiles"),
  // A local preview must not enqueue or send real committee email.
  "./plannerEmail.ts": async () => ({
    deliver: internalAction({
      args: { id: v.id("plannerNotifications") },
      returns: v.null(),
      handler: async () => null,
    }),
  }),
};

type FunctionKind = "query" | "mutation";
type PreviewSocket = {
  send(data: string): void;
  close(options?: { code?: number; reason?: string }): Promise<void> | void;
  on(event: "message" | "close", listener: (...args: unknown[]) => void): void;
  readyState?: number;
};

type QueryState = {
  path: string;
  args: Record<string, unknown>;
  last?: string;
};

const activity = (title: string, category: string, description: string): Activity => ({
  title,
  kind: "event",
  category,
  description,
  date: "",
  startTime: "",
  endTime: "",
  location: "",
  registrationUrl: "",
});

const outreachActivity = (title: string, category: string, description: string): Activity => ({
  title,
  kind: "project",
  category,
  description,
  date: "",
  startTime: "",
  endTime: "",
  location: "",
  registrationUrl: "",
});

export type PreviewBackend = Awaited<ReturnType<typeof createPreviewBackend>>;

export async function createPreviewBackend({ origin = "http://127.0.0.1:4333" } = {}) {
  process.env.PLANNER_SIGN_IN_SECRET = GATE_SECRET;
  process.env.CONVEX_SITE_URL = origin;

  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert("societies", {
      name: "Surrey Artificial Intelligence Society",
      shortName: "Surrey AI Society",
      slug: "ai",
      domain: "surreyaisociety.org",
    });
    await ctx.db.insert("users", {
      email: OWNER_IDENTITY.email,
      name: OWNER_IDENTITY.name,
      clerkId: OWNER_IDENTITY.tokenIdentifier,
    });
    // The owner identity is authorised by OWNER_EMAIL in planner access. This
    // access row is intentionally absent so the preview exercises that path.
  });

  const owner = t.withIdentity(OWNER_IDENTITY);
  for (const [title, category, description, stage] of [
    ["Welcome workshop", "Workshop", "A beginner-friendly session to shape the next event.", "planning"],
    ["Industry guest session", "Talk", "Explore a possible speaker format and the audience it could serve.", "ideas"],
    ["Committee social", "Social", "A low-pressure event idea for the society community.", "ready"],
  ] as const) {
    await owner.mutation(api.planner.create, {
      activity: activity(title, category, description),
      workspace: "events",
      stage,
    });
  }

  for (const [title, kind, nextAction, description, stage] of [
    ["Local AI startup", "Sponsorship", "Prepare a short introduction", "Explore a possible partnership for future society activity.", "planning"],
    ["University careers team", "University", "Share a workshop outline", "Keep a conversation open about practical student sessions.", "ideas"],
    ["Alumni speaker network", "Speakers", "Ask for introductions", "Map potential speakers without assuming availability.", "ready"],
    ["Joint society session", "Collaboration", "Check a shared format", "Explore a collaborative event with another student society.", "planning"],
  ] as const) {
    await owner.mutation(api.planner.create, {
      activity: outreachActivity(title, kind, description),
      workspace: "outreach",
      outreachKind: kind,
      nextAction,
      stage,
    });
  }

  const streams = new Set<PreviewSocket>();
  const emitters = new Map<PreviewSocket, () => Promise<void>>();
  let streamTimestamp = 0n;

  async function invoke(kind: FunctionKind, path: string, args: Record<string, unknown>) {
    const value = kind === "mutation"
      ? await owner.mutation(makeFunctionReference<"mutation">(path), args)
      : await owner.query(makeFunctionReference<"query">(path), args);
    if (kind === "mutation") await pushStreams();
    return value;
  }

  async function handleConvex(kind: FunctionKind, body: { path?: string; args?: unknown[] }) {
    if (!body.path || !Array.isArray(body.args)) throw new Error("Malformed local Convex request");
    const args = jsonToConvex((body.args[0] === undefined ? null : body.args[0]) as never) as Record<string, unknown>;
    return invoke(kind, body.path, args);
  }

  const encodedTimestamp = (value: bigint) => {
    const bytes = Buffer.alloc(8);
    bytes.writeBigUInt64LE(value);
    return bytes.toString("base64");
  };

  async function registerSocket(socket: PreviewSocket) {
    let closed = false;
    let authenticated = false;
    let querySet = 0;
    let identity = 0;
    let version = { querySet: 0, identity: 0, ts: encodedTimestamp(0n) };
    const queries = new Map<number, QueryState>();
    let serial = Promise.resolve();

    const emit = async () => {
      if (closed) return;
      const modifications: unknown[] = [];
      if (authenticated) {
        for (const [queryId, query] of queries) {
          let modification: Record<string, unknown>;
          try {
            const value = await invoke("query", query.path, query.args);
            modification = { type: "QueryUpdated", queryId, value: convexToJson(value), logLines: [], journal: null };
          } catch (error) {
            modification = {
              type: "QueryFailed",
              queryId,
              errorMessage: error instanceof Error ? error.message : "Local preview query failed",
              errorData: null,
              logLines: [],
              journal: null,
            };
          }
          const signature = JSON.stringify(modification);
          if (signature !== query.last) {
            query.last = signature;
            modifications.push(modification);
          }
        }
      }
      if (closed) return;
      const next = { querySet, identity, ts: encodedTimestamp(++streamTimestamp) };
      socket.send(JSON.stringify({ type: "Transition", startVersion: version, endVersion: next, modifications }));
      version = next;
    };

    const enqueue = (operation: () => Promise<void>) => {
      serial = serial.then(operation).catch(() => undefined);
      return serial;
    };

    streams.add(socket);
    emitters.set(socket, emit);
    socket.on("close", () => {
      closed = true;
      streams.delete(socket);
      emitters.delete(socket);
    });
    socket.on("message", (raw) => enqueue(async () => {
      const message = JSON.parse(String(raw));
      if (message.type === "Authenticate") {
        authenticated = message.tokenType === "User" && message.value === PREVIEW_TOKEN;
        identity = Number(message.baseVersion || 0) + 1;
      } else if (message.type === "ModifyQuerySet") {
        querySet = Number(message.newVersion || 0);
        for (const change of message.modifications || []) {
          if (change.type === "Add") {
            queries.set(Number(change.queryId), {
              path: String(change.udfPath),
              args: jsonToConvex(change.args?.[0] ?? {}) as Record<string, unknown>,
            });
          } else if (change.type === "Remove") {
            queries.delete(Number(change.queryId));
          }
        }
      }
      await emit();
    }));

    await enqueue(emit);
  }

  async function pushStreams() {
    await Promise.all([...emitters.values()].map((emit) => emit()));
  }

  return {
    owner,
    token: PREVIEW_TOKEN,
    invoke,
    handleConvex,
    registerSocket,
    async seedHackChecklist() {
      return owner.mutation(api.planner.seedHackChecklist, {});
    },
    async close() {
      streams.clear();
    },
  };
}
