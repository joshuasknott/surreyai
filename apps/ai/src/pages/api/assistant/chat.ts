import type { APIRoute } from "astro";
import { handleAssistantChatRequest } from "@surreysocieties/assistant/server";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  return handleAssistantChatRequest(request, "ai");
};
