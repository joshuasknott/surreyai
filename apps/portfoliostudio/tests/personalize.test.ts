import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { getTemplate, templates } from "../src/data/templates";
import { PortfolioRenderer } from "../src/portfolio/PortfolioRenderer";
import {
  createPersonalizedPortfolio,
  createStudentCanvas,
  mergeStudentProfile,
  recommendDesigns,
  studentFromDocument,
  switchPortfolioDesign,
} from "../src/data/personalize";
import type { StudentProfile } from "../shared/student";
import { portfolioSchema } from "../shared/portfolio";
import type { PortfolioDocument } from "../shared/portfolio";

const entry = (
  id: string,
  title: string,
  description = "A useful piece of work with clear notes.",
  image = "",
) => ({
  id,
  title,
  subtitle: "",
  description,
  image,
  imageAlt: title,
  url: "",
  tags: [],
  date: "",
});
const student = (overrides: Partial<StudentProfile> = {}): StudentProfile => ({
  version: 1,
  name: "Sam Rivera",
  headline: "Design and research student",
  bio: "I make complex information easier to understand and use.",
  location: "Guildford",
  email: "sam@example.com",
  photo: "",
  links: [
    { id: "linkedin", label: "LinkedIn", url: "https://linkedin.com/in/sam" },
  ],
  education: [
    entry(
      "edu-1",
      "BA Design",
      "Second year, studying research and visual communication.",
    ),
  ],
  experience: [
    entry(
      "exp-1",
      "Library assistant",
      "Helping people find useful resources.",
    ),
  ],
  projects: [
    entry("project-1", "Study guide", "A project documenting a clear process."),
  ],
  volunteering: [],
  skills: [entry("skill-1", "Research")],
  interests: [entry("interest-1", "Walking")],
  achievements: [],
  ...overrides,
});

describe("final ten personalized designs", () => {
  it("keeps a name-first hero connected to the name and its subtitle to the headline", () => {
    const source = createPersonalizedPortfolio("portrait", student());
    const updated = mergeStudentProfile(
      source,
      student({ name: "Sam Taylor", headline: "Research student" }),
    ).document;
    const hero = updated.sections.find((section) => section.type === "hero")!;
    expect(hero.title).toBe("Sam Taylor");
    expect(hero.subtitle).toBe("Research student");
  });
  it("preserves custom search metadata when the source information changes", () => {
    const source = createPersonalizedPortfolio("portrait", student());
    source.seo = {
      title: "Sam’s research portfolio",
      description: "My selected work.",
    };
    const updated = mergeStudentProfile(
      source,
      student({ bio: "A revised introduction." }),
    ).document;
    expect(updated.seo).toEqual(source.seo);
  });
  it("keeps jobs and volunteering separate during updates and preserves manual deletions", () => {
    const profile = student({
      volunteering: [entry("volunteer-1", "Food bank helper")],
    });
    const source = createPersonalizedPortfolio("signal-v2", profile);
    const jobs = source.sections.find(
      (section) => section.sourceCategory === "experience",
    )!;
    jobs.items = [];
    const updated = mergeStudentProfile(source, {
      ...profile,
      volunteering: [
        entry("volunteer-1", "Food bank helper", "Updated volunteer work."),
      ],
    }).document;
    expect(
      updated.sections.find(
        (section) => section.sourceCategory === "experience",
      )?.items,
    ).toEqual([]);
    expect(
      updated.sections
        .flatMap((section) => section.items)
        .filter((item) => item.id === "volunteer-1"),
    ).toHaveLength(1);
    expect(
      updated.sections.find(
        (section) => section.sourceCategory === "volunteering",
      )?.items[0].description,
    ).toBe("Updated volunteer work.");
  });
  it("handles maximum-length names and bios without shrinking or invalid metadata", () => {
    const profile = student({
      name: "N".repeat(120),
      headline: "H".repeat(240),
      bio: "B".repeat(6000),
    });
    for (const template of templates) {
      const document = createPersonalizedPortfolio(template.id, profile);
      expect(() => portfolioSchema.parse(document)).not.toThrow();
      expect(document.profile.bio).toHaveLength(6000);
      expect(document.seo.description).toHaveLength(400);
    }
  });
  const ids = [
    "signal-v2",
    "field-notes",
    "cobalt-v2",
    "portrait",
    "offset",
    "ledger",
    "nightfall",
    "open-studio",
    "first-light",
    "colourblock",
  ];
  it("exposes all ten concepts while retaining legacy templates", () => {
    expect(
      ids.every((id) => templates.some((template) => template.id === id)),
    ).toBe(true);
    expect(getTemplate("cobalt").id).toBe("cobalt");
    expect(getTemplate("signal").id).toBe("signal");
  });
  it("personalizes each direction without demo project copy or template media", () => {
    for (const id of ids) {
      const document = createPersonalizedPortfolio(id, student());
      const rendered = renderToStaticMarkup(
        React.createElement(PortfolioRenderer, { document }),
      );
      expect(document.templateId).toBe(id);
      expect(rendered).toContain(`pf-template-${id}`);
      expect(rendered).not.toContain("Maya Shah");
      expect(rendered).not.toContain("Aisha Bennett");
      expect(rendered).not.toContain("Leo Park");
      expect(
        document.sections
          .filter((section) => section.visible)
          .every(
            (section) =>
              section.type === "hero" ||
              section.type === "contact" ||
              section.image === "" ||
              section.image === student().photo,
          ),
      ).toBe(true);
    }
  });
  it("represents every supplied category in every direction and stays schema-valid", () => {
    const complete = student({
      volunteering: [entry("vol-1", "Community helper")],
      achievements: [entry("award-1", "Course prize")],
    });
    for (const id of ids) {
      const document = createPersonalizedPortfolio(id, complete);
      portfolioSchema.parse(document);
      const supplied = [
        "education",
        "experience",
        "projects",
        "volunteering",
        "skills",
        "interests",
        "achievements",
      ] as const;
      for (const category of supplied)
        expect(
          (document.student as StudentProfile)[category].map((item) => item.id),
        ).toEqual(
          expect.arrayContaining(complete[category].map((item) => item.id)),
        );
      const renderedIds = document.sections.flatMap((section) =>
        section.items.map((item) => item.id),
      );
      for (const category of supplied)
        expect(renderedIds).toEqual(
          expect.arrayContaining(complete[category].map((item) => item.id)),
        );
      expect(
        document.sections
          .filter((section) => section.type === "experience")
          .every((section) => section.items.length <= 40),
      ).toBe(true);
    }
  });
  it("keeps a sparse portfolio to a hero and does not invent work", () => {
    const sparse = student({
      education: [],
      experience: [],
      projects: [],
      volunteering: [],
      skills: [],
      interests: [],
      achievements: [],
      bio: "",
    });
    const document = createPersonalizedPortfolio("signal-v2", sparse);
    expect(
      document.sections
        .filter((section) => section.visible)
        .map((section) => section.type),
    ).toEqual(["hero", "contact"]);
    expect(
      document.sections.some((section) =>
        section.items.some((item) => item.title === "Reading list organiser"),
      ),
    ).toBe(false);
  });
  it("creates a hero-only canvas while retaining imported facts in student data", () => {
    const document = createStudentCanvas(student());
    expect(document.sections).toHaveLength(1);
    expect(document.sections[0].type).toBe("hero");
    expect(
      (document as typeof document & { student?: StudentProfile }).student
        ?.projects[0].id,
    ).toBe("project-1");
  });
  it("changes presentation without losing authored content, IDs, media or visibility", () => {
    const original = createPersonalizedPortfolio("signal-v2", student());
    original.sections[1].visible = false;
    original.sections[1].items[0].image = "/uploads/owned.webp";
    original.sections[1].items[0].description = "Edited by Sam.";
    const switched = switchPortfolioDesign(original, "portrait");
    expect(switched.templateId).toBe("portrait");
    expect(switched.profile).toEqual(original.profile);
    expect(switched.sections.map((section) => section.id)).toEqual(
      original.sections.map((section) => section.id),
    );
    expect(switched.sections.map((section) => section.visible)).toEqual(
      original.sections.map((section) => section.visible),
    );
    expect(switched.sections[1].items[0]).toMatchObject({
      id: "exp-1",
      image: "/uploads/owned.webp",
      description: "Edited by Sam.",
    });
  });
  it("recommends by content shape and returns three stable options", () => {
    const recommendations = recommendDesigns(student());
    expect(recommendations).toHaveLength(3);
    expect(
      new Set(recommendations.map((recommendation) => recommendation.id)).size,
    ).toBe(3);
    expect(
      recommendations.every(
        (recommendation) => recommendation.reason.length > 20,
      ),
    ).toBe(true);
    expect(
      recommendDesigns(
        student({
          projects: [],
          experience: [],
          education: [],
          skills: [],
          interests: [],
          volunteering: [],
          achievements: [],
        }),
      )[0].id,
    ).toBe("first-light");
  });
  it("merges unchanged imported values but reports and preserves handcrafted edits", () => {
    const original = createPersonalizedPortfolio(
      "signal-v2",
      student(),
    ) as PortfolioDocument & { student?: StudentProfile };
    original.sections[0].title = "My own heading";
    original.sections[1].items[0].description = "My own description";
    const next = student({
      headline: "Updated headline",
      experience: [
        entry("exp-1", "Library assistant", "Updated imported description."),
        entry("exp-2", "Peer mentor", "New entry."),
      ],
    });
    const result = mergeStudentProfile(original, next);
    expect(result.document.sections[0].title).toBe("My own heading");
    expect(result.document.sections[1].items[0].description).toBe(
      "My own description",
    );
    expect(
      result.document.sections[1].items.some((item) => item.id === "exp-2"),
    ).toBe(true);
    expect(
      result.conflicts.some((conflict) => conflict.includes("Hero heading")),
    ).toBe(true);
  });
  it("maps a legacy document back to the top-level student contract", () => {
    const document = getTemplate("cobalt").document;
    const profile = studentFromDocument(document);
    expect(profile.version).toBe(1);
    expect(profile.name).toBe(document.profile.name);
    expect(profile.projects.length).toBeGreaterThan(0);
    expect(profile.education).toEqual([]);
  });
  it("treats legacy content as authored when no canonical student payload exists", () => {
    const legacy = structuredClone(getTemplate("cobalt").document);
    legacy.sections[0].title = "Handwritten legacy heading";
    const result = mergeStudentProfile(
      legacy,
      student({ headline: "Imported headline" }),
    );
    expect(result.document.sections[0].title).toBe(
      "Handwritten legacy heading",
    );
    expect(
      result.conflicts.some(
        (conflict) =>
          conflict.includes("Profile headline") ||
          conflict.includes("Hero heading"),
      ),
    ).toBe(true);
  });
});
