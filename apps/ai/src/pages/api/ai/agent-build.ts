import type { APIRoute } from "astro";
import { createConvexClient } from "@surreysocieties/admin";
import { api } from "../../../../../../convex/_generated/api.js";
import type { Id } from "../../../../../../convex/_generated/dataModel.js";

type JsonObject = Record<string, unknown>;

const JSON_HEADERS = { "Content-Type": "application/json" };

export const GET: APIRoute = async ({ url }) => {
  const id = (url.searchParams.get("id") || "").trim();
  if (!id) {
    return jsonResponse({ error: "Missing build id" }, 400);
  }

  try {
    const client = createConvexClient();
    const build = await client.query(api.agentBuilds.get, { id: id as Id<"agentBuilds"> });
    if (!isRecord(build)) {
      return jsonResponse({ error: "Build not found" }, 404);
    }

    return jsonResponse({
      id,
      task: build.task,
      title: build.title,
      source: build.source,
      model: build.model,
      createdAt: build.createdAt,
      output: {
        planner: {
          thinking: build.plannerThinking,
          output: build.plannerOutput,
        },
        researcher: {
          thinking: build.researcherThinking,
          output: build.researcherOutput,
        },
        builder: {
          thinking: build.builderThinking,
          output: build.builderOutput,
        },
        reviewer: {
          thinking: build.reviewerThinking,
          output: build.reviewerOutput,
        },
      },
    });
  } catch {
    return jsonResponse({ error: "Build could not be loaded" }, 502);
  }
};

function jsonResponse(data: JsonObject, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
