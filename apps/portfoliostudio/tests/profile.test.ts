import { describe, expect, it } from "vitest";
import { getTemplate } from "../src/data/templates";
import { syncProfileSections } from "../src/lib/profile";

const profileInput = (
  document: ReturnType<typeof getTemplate>["document"],
) => ({
  name: document.profile.name,
  headline: document.profile.headline,
  bio: document.profile.bio,
  email: document.profile.email,
});

function sectionOf(
  document: ReturnType<typeof getTemplate>["document"],
  type: "hero" | "contact",
) {
  const section = document.sections.find((item) => item.type === type);
  if (!section) throw new Error(`Template is missing ${type} section`);
  return section;
}

describe("syncProfileSections", () => {
  it("preserves hero and contact copy when only unrelated settings are saved", () => {
    const document = getTemplate("cobalt").document;
    const changed = syncProfileSections(document, profileInput(document));
    expect(changed).toEqual(document.sections);
  });

  it("updates the hero title when the profile headline changes", () => {
    const document = getTemplate("cobalt").document;
    const changed = syncProfileSections(document, {
      ...profileInput(document),
      headline: "A new direction for useful technology",
    });
    expect(sectionOf({ ...document, sections: changed }, "hero").title).toBe(
      "A new direction for useful technology",
    );
  });

  it("preserves deliberately customised contact copy when the email changes", () => {
    const document = getTemplate("cobalt").document;
    const contact = sectionOf(document, "contact");
    const customised = {
      ...document,
      sections: document.sections.map((section) =>
        section.id === contact.id
          ? { ...section, body: "Let's collaborate." }
          : section,
      ),
    };
    const changed = syncProfileSections(customised, {
      ...profileInput(customised),
      email: "new@example.com",
    });
    expect(
      sectionOf({ ...customised, sections: changed }, "contact").body,
    ).toBe("Let's collaborate.");
  });

  it("clears generated contact copy when the email is removed", () => {
    const document = getTemplate("cobalt").document;
    const contact = sectionOf(document, "contact");
    const generated = {
      ...document,
      sections: document.sections.map((section) =>
        section.id === contact.id
          ? { ...section, body: `Get in touch at ${document.profile.email}.` }
          : section,
      ),
    };
    const changed = syncProfileSections(generated, {
      ...profileInput(generated),
      email: "",
    });
    expect(sectionOf({ ...generated, sections: changed }, "contact").body).toBe(
      "",
    );
  });
});
