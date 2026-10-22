import type {
  AiMode,
  PortfolioDocument,
  Project,
  ProjectVersion,
  User,
} from "../../shared/portfolio";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const csrf = document.cookie
    .split("; ")
    .find((value) => value.startsWith("ps_csrf="))
    ?.split("=")
    .slice(1)
    .join("=");
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(csrf ? { "X-Portfolio-CSRF": decodeURIComponent(csrf) } : {}),
      ...init.headers,
    },
  });
  const data = await response.json().catch(() => ({
    error: "The server could not complete this request. Please try again.",
  }));
  if (!response.ok)
    throw new ApiError(
      typeof data.error === "string"
        ? data.error
        : data.error?.message || "Something went wrong. Please try again.",
      response.status,
    );
  return data as T;
}
export const authApi = {
  session: () => api<{ user: User | null }>("/auth/session"),
  signup: (name: string, email: string, password: string) =>
    api<{ user: User; recoveryCode: string }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
  login: (email: string, password: string) =>
    api<{ user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => api("/auth/logout", { method: "POST" }),
};
export const projectsApi = {
  list: () => api<{ projects: Project[] }>("/projects"),
  get: (id: string) => api<{ project: Project }>(`/projects/${id}`),
  create: async (document: PortfolioDocument, aiMode: AiMode = "society") => {
    const cleaned = structuredClone(document);
    const inline: Array<{
      object: { image?: string; photo?: string };
      field: "image" | "photo";
      data: string;
    }> = [];
    const copyableImage = (url: string) =>
      url.startsWith("data:") ||
      /^\/api\/assets\/asset_[A-Za-z0-9-]+$/.test(url);
    if (copyableImage(cleaned.profile.photo)) {
      inline.push({
        object: cleaned.profile,
        field: "photo",
        data: cleaned.profile.photo,
      });
      cleaned.profile.photo = "";
    }
    for (const section of cleaned.sections) {
      if (copyableImage(section.image)) {
        inline.push({ object: section, field: "image", data: section.image });
        section.image = "";
      }
      for (const item of section.items)
        if (copyableImage(item.image)) {
          inline.push({ object: item, field: "image", data: item.image });
          item.image = "";
        }
    }
    const { project } = await api<{ project: Project }>("/projects", {
      method: "POST",
      body: JSON.stringify({ name: cleaned.name, document: cleaned, aiMode }),
    });
    try {
      const copied = new Map<string, string>();
      for (const image of inline) {
        let url = copied.get(image.data);
        if (!url) {
          let data = image.data;
          if (data.startsWith("/api/assets/")) {
            const response = await fetch(data, { credentials: "same-origin" });
            const blob = await response.blob();
            if (
              !response.ok ||
              !/^image\/(png|jpeg|webp)$/.test(blob.type) ||
              blob.size > 400_000
            )
              throw new Error(
                "An image could not be copied. Your original portfolio is unchanged.",
              );
            const bytes = new Uint8Array(await blob.arrayBuffer());
            let binary = "";
            for (let offset = 0; offset < bytes.length; offset += 8192)
              binary += String.fromCharCode(
                ...bytes.subarray(offset, offset + 8192),
              );
            data = `data:${blob.type};base64,${btoa(binary)}`;
          }
          url = await uploadImage(project.id, data);
          copied.set(image.data, url);
        }
        image.object[image.field] = url;
      }
      if (!inline.length) return { project };
      return await projectsApi.update({ ...project, document: cleaned });
    } catch (error) {
      // Roll back this incomplete copy. The original local draft remains intact.
      await projectsApi.remove(project.id).catch(() => {});
      throw error;
    }
  },
  update: (project: Project) =>
    api<{ project: Project }>(`/projects/${project.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: project.document.name,
        document: project.document,
        aiMode: project.aiMode,
        archived: project.archived,
        expectedRevision: project.revision,
      }),
    }),
  remove: (id: string) => api(`/projects/${id}`, { method: "DELETE" }),
  versions: (id: string) =>
    api<{ versions: ProjectVersion[] }>(`/projects/${id}/versions`),
  restore: (id: string, versionId: string, expectedRevision: number) =>
    api<{ project: Project }>(`/projects/${id}/versions/${versionId}/restore`, {
      method: "POST",
      body: JSON.stringify({ expectedRevision }),
    }),
  publish: (id: string, slug: string | undefined, expectedRevision: number) =>
    api<{ project: Project; publicUrl: string }>(`/projects/${id}/publish`, {
      method: "POST",
      body: JSON.stringify({ slug, expectedRevision }),
    }),
  unpublish: (id: string, expectedRevision: number) =>
    api<{ project: Project }>(`/projects/${id}/unpublish`, {
      method: "POST",
      body: JSON.stringify({ expectedRevision }),
    }),
};

export async function uploadImage(
  projectId: string,
  dataUrl: string,
): Promise<string> {
  if (projectId.startsWith("local_")) return dataUrl;
  const result = await api<{ url: string }>(`/projects/${projectId}/assets`, {
    method: "POST",
    body: JSON.stringify({ dataUrl }),
  });
  return result.url;
}

const STORAGE_KEY = "portfolio-studio:drafts:v1";
export function getDrafts(): Project[] {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
export function saveDraft(project: Project): void {
  const drafts = getDrafts();
  const index = drafts.findIndex((p) => p.id === project.id);
  if (index < 0) drafts.unshift(project);
  else drafts[index] = project;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}
export function removeDraft(id: string): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(getDrafts().filter((p) => p.id !== id)),
  );
}
export const retainedDraftNotice =
  "Your portfolio is saved. Your imported CV or AI brief could not be moved, so the original draft is still in My portfolios on this device.";
export async function saveDraftToAccount(
  draft: Project,
): Promise<{ project: Project; draftRetained: boolean }> {
  const { project } = await projectsApi.create(draft.document, draft.aiMode);
  let draftRetained = false;
  // The saved project is authoritative even if optional browser storage is unavailable.
  try {
    const brief = sessionStorage.getItem(`portfolio-studio:brief:${draft.id}`);
    if (brief) {
      sessionStorage.setItem(`portfolio-studio:brief:${project.id}`, brief);
      sessionStorage.removeItem(`portfolio-studio:brief:${draft.id}`);
    }
  } catch {
    draftRetained = true;
  }
  if (!draftRetained) {
    try {
      removeDraft(draft.id);
    } catch {
      /* Keep the local copy if storage is unavailable. */
    }
  }
  return { project, draftRetained };
}
export function createDraft(
  document: PortfolioDocument,
  aiMode: AiMode = "society",
): Project {
  const now = new Date().toISOString();
  const project: Project = {
    id: `local_${crypto.randomUUID()}`,
    name: document.name,
    document,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    slug: null,
    revision: 0,
    aiMode,
    archived: false,
  };
  saveDraft(project);
  return project;
}
export async function loadProject(id: string): Promise<Project> {
  if (id.startsWith("local_")) {
    const p = getDrafts().find((p) => p.id === id);
    if (!p) throw new Error("This draft is no longer on this device.");
    return p;
  }
  return (await projectsApi.get(id)).project;
}
export function message(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
