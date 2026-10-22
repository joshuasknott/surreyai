import type { PortfolioDocument } from "../../shared/portfolio";

export type ProfileSectionSync = {
  name: string;
  headline: string;
  bio: string;
  email: string;
};

/**
 * Keep profile fields and generated section copy in sync without overwriting
 * section copy that a user has deliberately customised in the editor.
 */
export function syncProfileSections(
  document: PortfolioDocument,
  nextProfile: ProfileSectionSync,
) {
  const previous = document.profile;
  const nextName = nextProfile.name.trim() || previous.name;
  const nextHeadline = nextProfile.headline.trim();
  const nextEmail = nextProfile.email.trim();
  const headlineChanged = nextHeadline !== previous.headline;
  const nameChanged = nextName !== previous.name;
  const bioChanged = nextProfile.bio !== previous.bio;
  const emailChanged = nextEmail !== previous.email;
  const previousContactCopy = previous.email
    ? `Get in touch at ${previous.email}.`
    : "";

  return document.sections.map((section) => {
    if (section.type === "hero") {
      return {
        ...section,
        ...(headlineChanged ? { title: nextHeadline } : {}),
        ...(nameChanged ? { subtitle: nextName } : {}),
        ...(bioChanged ? { body: nextProfile.bio } : {}),
      };
    }
    if (
      section.type === "contact" &&
      emailChanged &&
      (section.body === previousContactCopy || section.body.trim() === "")
    ) {
      return {
        ...section,
        body: nextEmail ? `Get in touch at ${nextEmail}.` : "",
      };
    }
    return section;
  });
}
