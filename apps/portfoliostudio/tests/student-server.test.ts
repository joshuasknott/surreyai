import { describe, expect, it } from "vitest";
import { createApp } from "../server/app";
import { publicPortfolioDocument } from "../server/ssr";
import { portfolioSchema } from "../shared/portfolio";
import { getTemplate } from "../src/data/templates";

describe("student profile server boundaries", () => {
  it("requires an authenticated session for AI CV extraction", async () => {
    const response = await createApp().request(
      new Request("http://localhost/api/ai/extract-cv", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "Alex Morgan\nEducation\nBSc" }),
      }),
    );
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "not_authenticated",
    });
  });

  it("returns a schema-validated AI profile through the existing provider path", async () => {
    const app = createApp();
    const signup = await app.request(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "student-extract@example.com",
          name: "Student Extract",
          password: "a-long-test-passphrase",
        }),
      }),
    );
    expect(signup.status).toBe(201);
    const cookies = signup.headers.get("set-cookie") || "";
    const session = cookies.match(/ps_session=([^;]+)/)?.[1];
    const csrf = cookies.match(/ps_csrf=([^;]+)/)?.[1];
    expect(session).toBeTruthy();
    expect(csrf).toBeTruthy();
    const profile = {
      version: 1,
      name: "Alex Morgan",
      headline: "Computer science student",
      bio: "Interested in accessible tools.",
      location: "Guildford",
      email: "alex@example.com",
      photo: "",
      links: [],
      education: [],
      experience: [],
      projects: [],
      volunteering: [],
      skills: [],
      interests: [],
      achievements: [],
    };
    let modelInput: unknown;
    const response = await app.request(
      "/api/ai/extract-cv",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Origin: "http://localhost",
          Cookie: `ps_session=${session}; ps_csrf=${csrf}`,
          "X-Portfolio-CSRF": csrf!,
        },
        body: JSON.stringify({
          text: "Alex Morgan\nProfile\nAccessible tools",
        }),
      },
      {
        AI: {
          run: async (_model: string, input: unknown) => {
            modelInput = input;
            return {
              response: JSON.stringify({
                profile: {
                  ...profile,
                  bio: "Date of Birth - 01/01/2000\n42 High Street, Guildford\nInterested in accessible tools.",
                },
                warnings: [],
              }),
            };
          },
        },
      },
    );
    expect(response.status).toBe(200);
    const extracted = (await response.json()) as {
      profile: typeof profile;
      warnings: string[];
      method: string;
    };
    expect(extracted).toMatchObject({
      profile: { name: "Alex Morgan", version: 1 },
      method: "ai",
    });
    expect(extracted.warnings).toContain(
      "Review AI-imported facts before publishing.",
    );
    expect(extracted.profile.bio).toBe("Interested in accessible tools.");
    const promptText = JSON.stringify(modelInput);
    expect(promptText).toContain(
      "Do not nest these category arrays under a categories key",
    );
    expect(promptText).toContain(
      "never omit an array because the local hint is empty",
    );
    expect(promptText).toContain(
      "Do not treat document disclaimers, QA notes, footer labels",
    );
    expect(extracted.warnings).toContain(
      "Sensitive address or birth-date text was removed from the import.",
    );

    const document = portfolioSchema.parse(getTemplate("cobalt").document);
    document.student = profile;
    const { student: _student, ...generatedWithoutStudent } = document;
    generatedWithoutStudent.sections = generatedWithoutStudent.sections.map(
      (section) =>
        section.id === "hero"
          ? { ...section, title: "A changed heading" }
          : section,
    );
    let generateInput: unknown;
    let generateAttempts = 0;
    const generated = await app.request(
      "/api/ai/generate",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Origin: "http://localhost",
          Cookie: `ps_session=${session}; ps_csrf=${csrf}`,
          "X-Portfolio-CSRF": csrf!,
        },
        body: JSON.stringify({
          document,
          prompt: "Rewrite the hero heading",
        }),
      },
      {
        AI: {
          run: async (_model: string, input: unknown) => {
            generateInput = input;
            generateAttempts += 1;
            if (generateAttempts === 1)
              return {
                response: JSON.stringify({
                  document: { version: 1 },
                  summary: "Incomplete document.",
                }),
              };
            return {
              response: JSON.stringify({
                document: {
                  ...generatedWithoutStudent,
                  student: { unsafe: true },
                },
                summary: "Updated heading.",
              }),
            };
          },
        },
      },
    );
    expect(generated.status).toBe(200);
    expect(generateAttempts).toBe(2);
    const generatePrompt = JSON.stringify(generateInput);
    expect(generatePrompt).toContain("Full-document JSON contract");
    expect(generatePrompt).toContain("Canonical student facts");
    expect(generatePrompt).not.toContain('"student":');
    const generatedBody = (await generated.json()) as {
      document: typeof document;
    };
    expect(generatedBody.document.student).toEqual(profile);
  });

  it("removes canonical student facts and hidden sections from public documents", () => {
    const document = structuredClone(getTemplate("cobalt").document);
    document.student = {
      version: 1,
      name: "Alex Morgan",
      headline: "Student",
      bio: "Private CV summary",
      location: "Guildford",
      email: "alex@example.com",
      photo: "",
      links: [],
      education: [],
      experience: [],
      projects: [],
      volunteering: [],
      skills: [],
      interests: [],
      achievements: [],
    };
    document.sections[1].visible = false;
    const publicDocument = publicPortfolioDocument(document);
    expect("student" in publicDocument).toBe(false);
    expect(publicDocument.sections.some((section) => !section.visible)).toBe(
      false,
    );
    expect(JSON.stringify(publicDocument)).not.toContain("Private CV summary");
  });
});
