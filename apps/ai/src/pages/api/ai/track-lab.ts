import type { APIRoute } from "astro";
import { isAIEnabled, generateContent } from "../../../lib/server/ai/gemini";
import {
  getTaskRelayFallback,
  getBuildSprintFallback,
  getRemixStudioFallback,
} from "../../../lib/server/ai/trackLabFallbacks";

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const feature = String(body.feature ?? "");

  if (!feature) {
    return new Response(JSON.stringify({ error: "Missing feature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!isAIEnabled()) {
    return new Response(JSON.stringify(buildFallback(feature, body)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const aiResult = await callGemini(feature, body);

  if (aiResult !== null) {
    return new Response(JSON.stringify(aiResult), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(buildFallback(feature, body)), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

function buildFallback(feature: string, body: Record<string, unknown>) {
  switch (feature) {
    case "remix-studio": {
      const input = String(body.input ?? "");
      const mode = String(body.mode ?? "sharpen");
      return { output: getRemixStudioFallback(input, mode) };
    }
    case "task-relay": {
      const goal = String(body.goal ?? "custom");
      const stage = typeof body.stage === "number" ? body.stage : 0;
      return { output: getTaskRelayFallback(goal, stage) };
    }
    case "build-sprint": {
      const theme = String(body.theme ?? "campus");
      const currentStage = typeof body.currentStage === "number" ? body.currentStage : 0;
      return getBuildSprintFallback(theme, currentStage);
    }
    default:
      return { output: null };
  }
}

async function callGemini(
  feature: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  let prompt = "";

  switch (feature) {
    case "remix-studio": {
      const input = String(body.input ?? "");
      const mode = String(body.mode ?? "sharpen");
      prompt = `You are a creative AI assistant for students. Transform this rough idea into a polished concept.\n\nIdea: "${input}"\nMode: ${mode}\n\nReturn a JSON object with these fields:\n- badge: a short label like "Refined Concept"\n- title: a catchy product name\n- tagline: one sentence description\n- sections: array of objects, each with "label" and either "items" (string array) or "text" (string)\n- tags: array of 3 short tech tags\n\nKeep it student-friendly and inspiring. Respond ONLY with valid JSON.`;
      break;
    }
    case "task-relay": {
      const goal = String(body.goal ?? "");
      const stage = typeof body.stage === "number" ? body.stage : 0;
      const stageNames = ["Understand","Research","Plan","Build","Review","Present"];
      prompt = `You are an AI agent in stage "${stageNames[stage]}" of a 6-step task pipeline.\nGoal: "${goal}"\n\nWrite one concise progress line (max 80 chars) describing what this agent accomplished. Be specific and actionable. Respond with plain text only, no JSON.`;
      break;
    }
    case "build-sprint": {
      const theme = String(body.theme ?? "");
      const currentStage = typeof body.currentStage === "number" ? body.currentStage : 0;
      const stageLabels = ["Idea","Team","Prototype","Demo","Showcase"];
      prompt = `You are helping students build a project. Theme: "${theme}". Current stage: "${stageLabels[currentStage]}".\n\nWrite a 1-2 sentence description of what happened at this stage. Be inspiring and specific. Respond with plain text only, no JSON.`;
      break;
    }
    default:
      return null;
  }

  const text = await generateContent(prompt);
  if (!text) return null;

  try {
    switch (feature) {
      case "remix-studio":
        return { output: JSON.parse(text) };
      case "task-relay":
        return { output: text.trim() };
      case "build-sprint":
        return { description: text.trim() };
      default:
        return null;
    }
  } catch {
    return null;
  }
}
