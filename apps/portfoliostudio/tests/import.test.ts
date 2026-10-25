import { describe, expect, it } from "vitest";
import { pdfTextItemsToText } from "../src/lib/import";
import { extractStudentProfile } from "../shared/student";

describe("PDF CV text import", () => {
  it("preserves PDF.js line boundaries so headings remain parseable", () => {
    const text = pdfTextItemsToText([
      {
        str: "Ada Lovelace",
        transform: [1, 0, 0, 1, 72, 740],
        width: 70,
        height: 12,
        hasEOL: true,
      },
      {
        str: "Education",
        transform: [1, 0, 0, 1, 72, 710],
        width: 60,
        height: 12,
        hasEOL: true,
      },
      {
        str: "University of Surrey",
        transform: [1, 0, 0, 1, 72, 690],
        width: 110,
        height: 10,
      },
      {
        str: "Computer Science",
        transform: [1, 0, 0, 1, 190, 690],
        width: 90,
        height: 10,
        hasEOL: true,
      },
      {
        str: "Experience",
        transform: [1, 0, 0, 1, 72, 650],
        width: 65,
        height: 12,
        hasEOL: true,
      },
      {
        str: "Research Intern",
        transform: [1, 0, 0, 1, 72, 630],
        width: 90,
        height: 10,
        hasEOL: true,
      },
      {
        str: "Built an accessible search prototype",
        transform: [1, 0, 0, 1, 72, 610],
        width: 180,
        height: 10,
        hasEOL: true,
      },
    ]);

    expect(text).toMatch(/Ada Lovelace\n+Education\nUniversity of Surrey Computer Science/);
    expect(text).toContain("University of Surrey Computer Science\n\nExperience");
    const extracted = extractStudentProfile(text).profile;
    expect(extracted.name).toBe("Ada Lovelace");
    expect(extracted.education[0]?.title).toBe("University of Surrey Computer Science");
    expect(extracted.experience[0]?.title).toBe("Research Intern");
  });

  it("retains PDF item order for same-line columns and supports missing hasEOL", () => {
    const text = pdfTextItemsToText([
      { str: "Left column", transform: [1, 0, 0, 1, 72, 500], width: 55 },
      { str: "Right column", transform: [1, 0, 0, 1, 300, 500], width: 65 },
      { str: "Next line", transform: [1, 0, 0, 1, 72, 480], width: 50 },
    ]);
    expect(text).toBe("Left column Right column\nNext line");
  });

  it("promotes a header appended after body columns without reordering the body", () => {
    const text = pdfTextItemsToText([
      { str: "PROFILE", transform: [1, 0, 0, 1, 72, 620], width: 45 },
      {
        str: "Education",
        transform: [1, 0, 0, 1, 72, 550],
        width: 60,
      },
      {
        str: "BSc Computer Science",
        transform: [1, 0, 0, 1, 72, 530],
        width: 120,
      },
      {
        str: "Portfolio Studio QA",
        transform: [1, 0, 0, 1, 72, 760],
        width: 120,
      },
      {
        str: "Computer science student",
        transform: [1, 0, 0, 1, 72, 740],
        width: 130,
      },
    ]);
    expect(text.startsWith("Portfolio Studio QA\nComputer science student")).toBe(
      true,
    );
    const extracted = extractStudentProfile(text).profile;
    expect(extracted.name).toBe("Portfolio Studio QA");
    expect(extracted.education[0]?.title).toBe("BSc Computer Science");
  });
});
