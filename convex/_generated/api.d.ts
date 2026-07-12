/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agentBuilds from "../agentBuilds.js";
import type * as assistant from "../assistant.js";
import type * as assistantRateLimits from "../assistantRateLimits.js";
import type * as auditLogs from "../auditLogs.js";
import type * as committee from "../committee.js";
import type * as events from "../events.js";
import type * as memberships from "../memberships.js";
import type * as permissions from "../permissions.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as societies from "../societies.js";
import type * as storage from "../storage.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agentBuilds: typeof agentBuilds;
  assistant: typeof assistant;
  assistantRateLimits: typeof assistantRateLimits;
  auditLogs: typeof auditLogs;
  committee: typeof committee;
  events: typeof events;
  memberships: typeof memberships;
  permissions: typeof permissions;
  seed: typeof seed;
  settings: typeof settings;
  societies: typeof societies;
  storage: typeof storage;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
