import type {
  PortfolioDocument,
  PortfolioItem,
  PortfolioSection,
} from "../../shared/portfolio";
import { studentCategories, type StudentProfile } from "../../shared/student";
import { getTemplate } from "./templates";
export type { StudentProfile } from "../../shared/student";
export type StudentCategory = (typeof studentCategories)[number];
type StudentCategories = Record<StudentCategory, PortfolioItem[]>;
type PersonalisedDocument = PortfolioDocument & { student?: StudentProfile };
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const list = (value: unknown): PortfolioItem[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is PortfolioItem =>
        Boolean(entry && typeof entry === "object"),
      )
    : [];
const categoryItems = (student: StudentProfile, category: StudentCategory) =>
  list(student[category]).map((entry, index) => ({
    id: text(entry.id) || `${category}-${index + 1}`,
    title: text(entry.title),
    subtitle: text(entry.subtitle),
    description: text(entry.description),
    image: text(entry.image),
    imageAlt: text(entry.imageAlt) || text(entry.title),
    url: text(entry.url),
    tags: Array.isArray(entry.tags) ? entry.tags.map(text).filter(Boolean) : [],
    date: text(entry.date),
  }));
const profileFor = (student: StudentProfile): PortfolioDocument["profile"] => ({
  name: text(student.name) || "Your name",
  headline: text(student.headline),
  bio: text(student.bio),
  location: text(student.location),
  email: text(student.email),
  photo: text(student.photo),
  links: Array.isArray(student.links)
    ? student.links.map((link) => ({
        id: text(link.id),
        label: text(link.label),
        url: text(link.url),
      }))
    : [],
});
const factTypes: Partial<Record<StudentCategory, PortfolioSection["type"]>> = {
  education: "education",
  experience: "experience",
  projects: "projects",
  volunteering: "experience",
  skills: "skills",
  interests: "interests",
  achievements: "achievements",
};
const factTitles: Record<StudentCategory, string> = {
  education: "Education",
  experience: "Experience",
  projects: "Selected work",
  volunteering: "Volunteering",
  skills: "Skills",
  interests: "Interests",
  achievements: "Achievements",
};
const entryKey = (entry: PortfolioItem) =>
  text(entry.title).toLowerCase().replace(/\s+/g, " ");
const entryEqual = (left: PortfolioItem, right: PortfolioItem) =>
  JSON.stringify(left) === JSON.stringify(right);
function factSection(
  document: PortfolioDocument,
  category: StudentCategory,
  items: PortfolioItem[],
): PortfolioSection {
  const donor =
    document.sections.find((section) => section.type === factTypes[category]) ||
    document.sections.find(
      (section) => section.type !== "hero" && section.type !== "contact",
    ) ||
    document.sections[0];
  return {
    ...clone(donor),
    id: `student-${category}`,
    sourceCategory: category,
    type: factTypes[category] || "text",
    title: factTitles[category],
    subtitle: "",
    body: "",
    image: "",
    imageAlt: "",
    items,
    visible: true,
    buttonLabel: "",
    buttonUrl: "",
    layout: donor.layout,
    style: clone(donor.style),
  };
}
function personalSections(
  document: PortfolioDocument,
  student: StudentProfile,
): PortfolioSection[] {
  const represented = new Set<StudentCategory>();
  const sections = document.sections.map((original) => {
    const section = clone(original);
    if (section.type === "hero") {
      const nameTitle = [
        "signal-v2",
        "portrait",
        "open-studio",
        "first-light",
        "colourblock",
      ].includes(document.templateId);
      return {
        ...section,
        title: nameTitle
          ? text(student.name) || "Your name"
          : text(student.headline) || text(student.name) || "Your name",
        subtitle: nameTitle ? text(student.headline) : text(student.name),
        body: text(student.bio),
        image: text(student.photo),
        imageAlt: text(student.name),
        buttonLabel: "",
        buttonUrl: "",
      };
    }
    if (section.type === "about")
      return {
        ...section,
        title: "About",
        body: text(student.bio),
        image: "",
        imageAlt: "",
        items: [],
        buttonLabel: "",
        buttonUrl: "",
        visible: Boolean(text(student.bio)),
      };
    if (section.type === "contact") {
      const contact = [
        text(student.email),
        ...(student.links || [])
          .map((link) => text(link.label))
          .filter(Boolean),
      ]
        .filter(Boolean)
        .join(" · ");
      return {
        ...section,
        title: "Let’s connect.",
        body: contact,
        image: "",
        imageAlt: "",
        items: [],
        buttonLabel: "",
        buttonUrl: "",
        visible: true,
      };
    }
    let category: StudentCategory | undefined;
    if (
      (section.type === "projects" || section.type === "gallery") &&
      !represented.has("projects")
    )
      category = "projects";
    else if (section.type === "experience") {
      if (
        !represented.has("experience") &&
        categoryItems(student, "experience").length
      )
        category = "experience";
      else if (!represented.has("volunteering")) category = "volunteering";
    } else if (section.type === "education" && !represented.has("education"))
      category = "education";
    else if (section.type === "skills" && !represented.has("skills"))
      category = "skills";
    else if (section.type === "interests" && !represented.has("interests"))
      category = "interests";
    else if (
      section.type === "achievements" &&
      !represented.has("achievements")
    )
      category = "achievements";
    if (category && categoryItems(student, category).length) {
      represented.add(category);
      const items = categoryItems(student, category);
      return {
        ...section,
        sourceCategory: category,
        items,
        image: "",
        imageAlt: "",
        body: "",
        visible: true,
      };
    }
    if (
      [
        "projects",
        "gallery",
        "experience",
        "education",
        "skills",
        "interests",
        "achievements",
      ].includes(section.type)
    )
      return {
        ...section,
        image: "",
        imageAlt: "",
        items: [],
        body: "",
        visible: false,
      };
    return {
      ...section,
      title: "",
      subtitle: "",
      body: "",
      image: "",
      imageAlt: "",
      items: [],
      buttonLabel: "",
      buttonUrl: "",
      visible: false,
    };
  });
  const contactIndex = sections.findIndex(
    (section) => section.type === "contact",
  );
  const missing = studentCategories
    .filter(
      (category) =>
        !represented.has(category) && categoryItems(student, category).length,
    )
    .map((category) =>
      factSection(document, category, categoryItems(student, category)),
    );
  if (contactIndex < 0) return [...sections, ...missing];
  sections.splice(contactIndex, 0, ...missing);
  return sections;
}

export function createPersonalizedPortfolio(
  templateId: string,
  student: StudentProfile,
): PortfolioDocument {
  const template = getTemplate(templateId);
  const document = clone(template.document) as PersonalisedDocument;
  const profile = profileFor(student);
  document.profile = profile;
  document.name = `${profile.name}’s portfolio`.slice(0, 120);
  document.templateId = template.id;
  document.sections = personalSections(document, student);
  document.seo = {
    title: [profile.name, profile.headline]
      .filter(Boolean)
      .join(" — ")
      .slice(0, 160),
    description: profile.bio.slice(0, 400),
  };
  document.student = clone(student);
  return document;
}

export function createStudentCanvas(
  student: StudentProfile,
): PortfolioDocument {
  const document = createPersonalizedPortfolio(
    "first-light",
    student,
  ) as PersonalisedDocument;
  document.sections = document.sections
    .filter((section) => section.type === "hero")
    .map((section) => ({
      ...section,
      image: text(student.photo),
      imageAlt: text(student.name),
      title: text(student.headline) || text(student.name) || "Your name",
      subtitle: text(student.name),
      body: text(student.bio),
    }));
  document.templateId = "student-canvas";
  return document;
}

export function studentFromDocument(
  document: PortfolioDocument,
): StudentProfile {
  const source = document as PersonalisedDocument;
  if (source.student) return clone(source.student);
  const categories: Partial<StudentCategories> = {};
  document.sections.forEach((section) => {
    if (section.type === "projects" || section.type === "gallery")
      categories.projects = [
        ...(categories.projects || []),
        ...clone(section.items),
      ];
    else if (section.type === "experience" && /volunt/i.test(section.title))
      categories.volunteering = [
        ...(categories.volunteering || []),
        ...clone(section.items),
      ];
    else if (section.type === "experience")
      categories.experience = [
        ...(categories.experience || []),
        ...clone(section.items),
      ];
    else if (section.type === "education")
      categories.education = [
        ...(categories.education || []),
        ...clone(section.items),
      ];
    else if (section.type === "skills")
      categories.skills = [
        ...(categories.skills || []),
        ...clone(section.items),
      ];
    else if (section.type === "interests")
      categories.interests = [
        ...(categories.interests || []),
        ...clone(section.items),
      ];
    else if (section.type === "achievements")
      categories.achievements = [
        ...(categories.achievements || []),
        ...clone(section.items),
      ];
  });
  return {
    version: 1,
    ...clone(document.profile),
    education: [],
    experience: [],
    projects: [],
    volunteering: [],
    skills: [],
    interests: [],
    achievements: [],
    ...categories,
  };
}

export function switchPortfolioDesign(
  document: PortfolioDocument,
  id: string,
): PortfolioDocument {
  const source = clone(document) as PersonalisedDocument;
  const target = getTemplate(id).document;
  const donorByType = new Map<string, PortfolioSection>();
  target.sections.forEach((section) => {
    if (!donorByType.has(section.type)) donorByType.set(section.type, section);
  });
  source.templateId = getTemplate(id).id;
  source.theme = clone(target.theme);
  source.sections = source.sections.map((section, index) => {
    const donor =
      donorByType.get(section.type) ||
      target.sections[index % target.sections.length];
    return {
      ...section,
      layout: donor.layout,
      style: clone(donor.style),
      visible: section.visible,
    };
  });
  return source;
}

const designReasons: Record<string, string> = {
  "signal-v2":
    "An experience-led layout for a profile with several roles or placements.",
  "field-notes":
    "An editorial rhythm for a profile with reflective writing and varied entries.",
  "cobalt-v2":
    "A disciplined project index for a profile with two or more projects.",
  portrait:
    "A warm chronological layout that can give a supplied portrait room to breathe.",
  offset:
    "A confident typographic grid for a profile mixing projects and practical experience.",
  ledger: "A rigorous reading-room structure for a detailed, text-led profile.",
  nightfall:
    "A focused dark presentation for profiles with substantial project descriptions.",
  "open-studio":
    "An image-friendly gallery rhythm when several supplied media files are available.",
  "first-light":
    "A welcoming compact starting point when only a few facts are available.",
  colourblock:
    "A modular grid for a profile spanning several different categories.",
};
export function recommendDesigns(
  student: StudentProfile,
): { id: string; reason: string }[] {
  const entries = studentCategories.flatMap((category) =>
    categoryItems(student, category),
  );
  const projects = categoryItems(student, "projects");
  const experience = [
    ...categoryItems(student, "experience"),
    ...categoryItems(student, "volunteering"),
  ];
  const categoriesPresent = studentCategories.filter(
    (category) => categoryItems(student, category).length,
  ).length;
  const imageCount = entries.filter((entry) => Boolean(entry.image)).length;
  const scores = Object.keys(designReasons).map((id) => ({ id, score: 0 }));
  const add = (id: string, value: number) => {
    scores.find((entry) => entry.id === id)!.score += value;
  };
  add("first-light", entries.length <= 2 ? 6 : 0);
  add("open-studio", imageCount >= 2 ? 6 : 0);
  add("portrait", text(student.photo) ? 5 : 0);
  add("signal-v2", experience.length >= 2 ? 4 : 0);
  add("cobalt-v2", projects.length >= 2 ? 4 : 0);
  add(
    "field-notes",
    text(student.bio).length > 220 && categoriesPresent >= 2 ? 3 : 0,
  );
  add("ledger", entries.length >= 5 && imageCount === 0 ? 4 : 0);
  add(
    "nightfall",
    projects.length >= 2 &&
      projects.every((entry) => text(entry.description).length >= 80)
      ? 4
      : 0,
  );
  add("offset", projects.length >= 2 && experience.length >= 1 ? 3 : 0);
  add("colourblock", categoriesPresent >= 4 ? 4 : 0);
  return scores
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map(({ id, score }) => ({
      id,
      reason:
        score > 0
          ? designReasons[id]
          : "Another way to present your information, with the same editable content.",
    }));
}

export function mergeStudentProfile(
  document: PortfolioDocument,
  nextStudent: StudentProfile,
): { document: PortfolioDocument; conflicts: string[] } {
  const current = clone(document) as PersonalisedDocument;
  const previous = current.student;
  const nextProfile = profileFor(nextStudent);
  const conflicts: string[] = [];
  const fields = [
    "name",
    "headline",
    "bio",
    "location",
    "email",
    "photo",
  ] as const;
  fields.forEach((field) => {
    const before = previous
      ? text(previous[field])
      : text(current.profile[field]);
    const now = text(current.profile[field]);
    const incoming = text(nextProfile[field]);
    if ((previous && now === before) || !now)
      (current.profile as unknown as Record<string, string>)[field] = incoming;
    else if (incoming && incoming !== now)
      conflicts.push(
        `Profile ${field} has been edited; kept the existing text.`,
      );
  });
  if (
    (previous &&
      JSON.stringify(current.profile.links) ===
        JSON.stringify(previous.links)) ||
    current.profile.links.length === 0
  )
    current.profile.links = nextProfile.links;
  else if (
    JSON.stringify(nextProfile.links) !== JSON.stringify(current.profile.links)
  )
    conflicts.push("Profile links have been edited; kept the existing links.");
  const categories = Object.fromEntries(
    studentCategories.map((category) => [
      category,
      categoryItems(nextStudent, category),
    ]),
  ) as StudentCategories;
  const mergedSections = current.sections.map((section) => {
    if (section.type === "hero") {
      const previousProfile = previous ? profileFor(previous) : null;
      if (!previousProfile) return section;
      const edited =
        section.title !== previousProfile.headline &&
        section.title !== previousProfile.name &&
        section.title.trim() !== "";
      if (
        edited &&
        text(nextProfile.headline) &&
        section.title !== nextProfile.headline
      )
        conflicts.push(
          "Hero heading has been edited; kept the existing heading.",
        );
      return {
        ...section,
        title: edited
          ? section.title
          : section.title === previousProfile.name
            ? nextProfile.name
            : nextProfile.headline || nextProfile.name,
        subtitle:
          section.subtitle === previousProfile.name
            ? nextProfile.name
            : section.subtitle === previousProfile.headline
              ? nextProfile.headline
              : section.subtitle,
        body:
          section.body === previousProfile.bio || !section.body
            ? nextProfile.bio
            : section.body,
        image:
          section.image === previousProfile.photo || !section.image
            ? nextProfile.photo
            : section.image,
        imageAlt:
          section.imageAlt === previousProfile.name || !section.imageAlt
            ? nextProfile.name
            : section.imageAlt,
      };
    }
    if (section.type === "about") {
      if (!previous) return section;
      const previousBio = text(previous.bio);
      if (
        section.body &&
        section.body !== previousBio &&
        section.body !== nextProfile.bio
      )
        conflicts.push("About text has been edited; kept the existing text.");
      return section.body === previousBio || !section.body
        ? {
            ...section,
            body: nextProfile.bio,
            visible:
              section.visible || (!previousBio && Boolean(nextProfile.bio)),
          }
        : section;
    }
    if (section.type === "contact") {
      if (!previous) return section;
      const oldContact = [
        previous.email || "",
        ...previous.links.map((link) => link.label),
      ]
        .filter(Boolean)
        .join(" · ");
      const newContact = [
        nextProfile.email,
        ...nextProfile.links.map((link) => link.label),
      ]
        .filter(Boolean)
        .join(" · ");
      if (
        section.body &&
        section.body !== oldContact &&
        section.body !== newContact
      )
        conflicts.push("Contact text has been edited; kept the existing text.");
      return section.body === oldContact || !section.body
        ? { ...section, body: newContact }
        : section;
    }
    if (
      ![
        "projects",
        "gallery",
        "experience",
        "education",
        "skills",
        "interests",
        "achievements",
      ].includes(section.type)
    )
      return section;
    const keys: StudentCategory[] = section.sourceCategory
      ? [section.sourceCategory]
      : section.type === "projects" || section.type === "gallery"
        ? ["projects"]
        : section.type === "experience"
          ? [
              /volunt/i.test(section.title) ||
              section.id === "student-volunteering"
                ? "volunteering"
                : "experience",
            ]
          : [section.type as StudentCategory];
    const incoming = keys.flatMap((key) => categories[key]);
    const prior = previous
      ? keys.flatMap((key) => categoryItems(previous, key))
      : [];
    const result = [...section.items];
    let edited = false;
    let added = 0;
    incoming.forEach((nextEntry) => {
      const currentIndex =
        result.findIndex((entry) => entry.id === nextEntry.id) >= 0
          ? result.findIndex((entry) => entry.id === nextEntry.id)
          : result.findIndex(
              (entry) =>
                entryKey(entry) && entryKey(entry) === entryKey(nextEntry),
            );
      if (currentIndex < 0) {
        // An entry removed on the canvas stays removed when updating its source.
        if (
          prior.some(
            (entry) =>
              entry.id === nextEntry.id ||
              entryKey(entry) === entryKey(nextEntry),
          )
        )
          return;
        result.push(nextEntry);
        added += 1;
        return;
      }
      const currentEntry = result[currentIndex];
      const previousEntry =
        prior.find((entry) => entry.id === currentEntry.id) ||
        prior.find((entry) => entryKey(entry) === entryKey(currentEntry));
      if (previousEntry) {
        const merged = { ...currentEntry };
        for (const field of [
          "title",
          "subtitle",
          "description",
          "image",
          "imageAlt",
          "url",
          "date",
          "tags",
        ] as const) {
          if (
            JSON.stringify(currentEntry[field]) ===
            JSON.stringify(previousEntry[field])
          ) {
            if (field === "tags") merged.tags = nextEntry.tags;
            else merged[field] = nextEntry[field];
          } else if (
            JSON.stringify(currentEntry[field]) !==
            JSON.stringify(nextEntry[field])
          )
            edited = true;
        }
        result[currentIndex] = merged;
      } else if (!entryEqual(currentEntry, nextEntry)) edited = true;
    });
    if (edited)
      conflicts.push(
        `Section “${section.title || section.id}” has edited entries; kept those entries.`,
      );
    if (added && edited)
      conflicts.push(
        `Section “${section.title || section.id}” also received ${added} new imported entr${added === 1 ? "y" : "ies"}.`,
      );
    const kept = result.filter((entry) => {
      const old = prior.find(
        (candidate) =>
          candidate.id === entry.id || entryKey(candidate) === entryKey(entry),
      );
      if (
        !old ||
        incoming.some(
          (candidate) =>
            candidate.id === old.id || entryKey(candidate) === entryKey(old),
        )
      )
        return true;
      if (entryEqual(entry, old)) return false;
      conflicts.push(
        `An entry removed from your information has edited writing in “${section.title}”; kept that writing.`,
      );
      return true;
    });
    return {
      ...section,
      sourceCategory: keys[0],
      items: kept,
      visible:
        kept.length > 0 &&
        (section.visible || (!prior.length && !section.items.length)),
    };
  });
  const missing = studentCategories
    .filter((category) => {
      if (!categoryItems(nextStudent, category).length) return false;
      if (category === "volunteering")
        return !mergedSections.some(
          (section) =>
            section.sourceCategory === category ||
            (section.type === "experience" && /volunt/i.test(section.title)),
        );
      const type = factTypes[category];
      return !mergedSections.some(
        (section) =>
          section.sourceCategory === category ||
          (section.type === type &&
            (category !== "experience" ||
              (section.sourceCategory !== "volunteering" &&
                !/volunt/i.test(section.title)))),
      );
    })
    .map((category) =>
      factSection(current, category, categoryItems(nextStudent, category)),
    );
  const contactIndex = mergedSections.findIndex(
    (section) => section.type === "contact",
  );
  if (contactIndex < 0) current.sections = [...mergedSections, ...missing];
  else {
    current.sections = [...mergedSections];
    current.sections.splice(contactIndex, 0, ...missing);
  }
  const previousSeo = previous
    ? {
        title: [previous.name, previous.headline]
          .filter(Boolean)
          .join(" — ")
          .slice(0, 160),
        description: previous.bio.slice(0, 400),
      }
    : null;
  current.seo = {
    title:
      previousSeo && current.seo.title === previousSeo.title
        ? [current.profile.name, current.profile.headline]
            .filter(Boolean)
            .join(" — ")
            .slice(0, 160)
        : current.seo.title,
    description:
      previousSeo && current.seo.description === previousSeo.description
        ? current.profile.bio.slice(0, 400)
        : current.seo.description,
  };
  current.student = clone(nextStudent);
  return { document: current, conflicts };
}
