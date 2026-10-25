import { describe, expect, it } from "vitest";
import {
  extractStudentProfile,
  studentProfileSchema,
} from "../shared/student";

describe("student profile extraction", () => {
  it("keeps explicit facts across common CV sections without inventing details", () => {
    const result = extractStudentProfile(`
      Alex Morgan
      alex@example.com
      Based in Guildford
      https://github.com/alexmorgan

      Profile
      Date of Birth - 01/01/2000
      42 High Street, Guildford
      GU2 7XH
      Computer science student interested in accessible tools.

      Education
      BSc Computer Science, University of Surrey, 2024–2027

      Experience
      Student developer, Campus Lab, 2025–Present
      Built a small scheduling tool.

      Projects
      Study planner: A coursework planning prototype.

      Skills
      TypeScript, React, SQL

      Date of birth: 01/01/2000
      12 Example Street, Guildford
    `);
    expect(result.method).toBe("local");
    expect(result.profile.name).toBe("Alex Morgan");
    expect(result.profile.email).toBe("alex@example.com");
    expect(result.profile.location).toBe("Guildford");
    expect(result.profile.bio).toContain("accessible tools");
    expect(result.profile.bio).not.toContain("01/01/2000");
    expect(result.profile.bio).not.toContain("High Street");
    expect(result.profile.bio).not.toContain("GU2 7XH");
    expect(result.profile.education[0]?.title).toContain("BSc Computer Science");
    expect(result.profile.experience[0]?.date).toContain("2025");
    expect(result.profile.projects[0]?.title).toBe("Study planner");
    expect(result.profile.skills.map((entry) => entry.title)).toEqual([
      "TypeScript",
      "React",
      "SQL",
    ]);
    expect(JSON.stringify(result.profile)).not.toContain("Example Street");
    expect(JSON.stringify(result.profile)).not.toContain("01/01/2000");
  });

  it("returns an empty bounded profile for missing text", () => {
    const result = extractStudentProfile("");
    expect(result.profile.version).toBe(1);
    expect(result.profile.education).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("keeps multiple UK-style dated entries and does not mistake CV headings for names", () => {
    const result = extractStudentProfile(`
      CURRICULUM VITAE
      Priya Shah
      priya.shah@example.co.uk | https://www.linkedin.com/in/priyashah
      Location: Guildford, UK

      Education
      BSc Mathematics — University of Surrey — 2023–2026
      A levels — Guildford College — 2021–2023

      Work Experience
      Software Intern — Bright Labs — Jun 2025–Sep 2025
      Built internal reporting tools.
      Library Assistant — Surrey Library — 2024–2025

      Projects
      Data dashboard — 2025 — Coursework project
      Accessibility audit — 2024 — Student society project

      Skills
      Python, SQL, TypeScript
      User research, presentations

      Date of birth: 04/05/2003
      Address: 42 High Street, Guildford
    `);
    expect(result.profile.name).toBe("Priya Shah");
    expect(result.profile.education).toHaveLength(2);
    expect(result.profile.experience).toHaveLength(2);
    expect(result.profile.projects).toHaveLength(2);
    expect(result.profile.skills.map((entry) => entry.title)).toEqual([
      "Python",
      "SQL",
      "TypeScript",
      "User research",
      "presentations",
    ]);
    expect(result.profile.location).toBe("Guildford, UK");
    expect(JSON.stringify(result.profile)).not.toContain("04/05/2003");
    expect(JSON.stringify(result.profile)).not.toContain("High Street");
  });

  it("validates bounded safe links and image fields", () => {
    expect(
      studentProfileSchema.safeParse({
        version: 1,
        name: "A",
        links: [{ id: "x", label: "x", url: "javascript:alert(1)" }],
      }).success,
    ).toBe(false);
    expect(
      studentProfileSchema.safeParse({
        version: 1,
        photo: "https://example.com/photo.webp",
      }).success,
    ).toBe(true);
  });

  it("bounds unusually long CV sections instead of dropping the whole profile", () => {
    const result = extractStudentProfile(
      `Alex Morgan\nSkills\n${Array.from(
        { length: 45 },
        (_, index) => `Skill ${index + 1}`,
      ).join("\n")}`,
    );
    expect(result.profile.skills).toHaveLength(40);
    expect(result.warnings).toContain(
      "skills entries were limited to the first 40 items.",
    );
  });
});
