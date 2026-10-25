import { z } from "zod";

export const studentCategories = [
  "education",
  "experience",
  "projects",
  "volunteering",
  "skills",
  "interests",
  "achievements",
] as const;

const safeUrl = z
  .string()
  .max(2048)
  .refine((value) => {
    if (!value) return true;
    if (value.startsWith("/") && !value.startsWith("//"))
      return !/[\r\n<>]/.test(value);
    try {
      return ["https:", "http:", "mailto:", "tel:"].includes(
        new URL(value).protocol,
      );
    } catch {
      return false;
    }
  }, "Use a valid https://, mailto: or tel: link.");

const imageUrl = z
  .string()
  .max(600000)
  .refine((value) => {
    if (!value) return true;
    if (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value))
      return true;
    if (value.startsWith("/") && !value.startsWith("//"))
      return !/[\r\n<>]/.test(value);
    try {
      return ["https:", "http:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "Use an image URL or uploaded image.");

const bounded = (max: number) => z.string().max(max).default("");

export const studentEntrySchema = z.object({
  id: z.string().max(80),
  title: z.string().max(240),
  subtitle: bounded(240),
  description: bounded(4000),
  image: imageUrl.default(""),
  imageAlt: bounded(240),
  url: safeUrl.default(""),
  tags: z.array(z.string().max(60)).max(20).default([]),
  date: z.string().max(100).default(""),
});

export const studentProfileSchema = z.object({
  version: z.literal(1).default(1),
  name: bounded(120),
  headline: bounded(240),
  bio: bounded(6000),
  location: bounded(120),
  email: bounded(254),
  photo: imageUrl.default(""),
  links: z.array(
    z.object({
      id: z.string().max(80),
      label: z.string().max(80),
      url: safeUrl,
    }),
  ).max(20).default([]),
  education: z.array(studentEntrySchema).max(40).default([]),
  experience: z.array(studentEntrySchema).max(40).default([]),
  projects: z.array(studentEntrySchema).max(40).default([]),
  volunteering: z.array(studentEntrySchema).max(40).default([]),
  skills: z.array(studentEntrySchema).max(40).default([]),
  interests: z.array(studentEntrySchema).max(40).default([]),
  achievements: z.array(studentEntrySchema).max(40).default([]),
});

export type StudentEntry = z.infer<typeof studentEntrySchema>;
export type StudentProfile = z.infer<typeof studentProfileSchema>;

const emptyProfile = (): StudentProfile =>
  studentProfileSchema.parse({ version: 1 });

const headingMap: Record<(typeof studentCategories)[number], RegExp> = {
  education: /^(education|academic background|qualifications|study)$/i,
  experience: /^(experience|work experience|employment|work history|placements?)$/i,
  projects: /^(projects?|portfolio|selected work|coursework)$/i,
  volunteering: /^(volunteering|voluntary work|community|leadership|activities)$/i,
  skills: /^(skills?|technical skills|competencies|tools)$/i,
  interests: /^(interests?|hobbies)$/i,
  achievements: /^(achievements?|awards?|certifications?|honours?)$/i,
};

const summaryHeading =
  /^(summary|professional summary|profile|professional profile|about|objective|career objective|personal statement)$/i;
const headingPatterns = [
  summaryHeading,
  ...Object.values(headingMap),
];
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const urlPattern = /(?:https?:\/\/|www\.)[^\s<>]+/gi;
const datePattern = /\b(?:19|20)\d{2}\s*(?:[-–—]\s*(?:(?:19|20)\d{2}|present|current))?\b/i;
const explicitLocationPattern = /^(?:location|based in|currently in)\s*:?\s*(.+)$/i;
const explicitHeadlinePattern = /^(?:headline|role|title|profession)\s*:\s*(.+)$/i;
const sensitiveLabelLine = /^(?:date\s+of\s+birth|dob|birth\s+date|address|home\s+address|full\s+address)(?:\s*[:\-–—]\s*|\s+|$)/i;
const genericDocumentTitle = /^(?:curriculum vitae|résumé|resume|cv)$/i;
const addressLike =
  /^(?:\s*\d+\s+.*\b(?:street|st|road|rd|avenue|ave|lane|ln|close|court|drive|dr|way|gardens?|place|pl|terrace|crescent|square)\b|\s*(?:flat|apartment)\s+\d+)/i;
const postcodeLine = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export function isSensitiveImportedLine(value: string): boolean {
  const line = value.replace(/\s+/g, " ").trim();
  return Boolean(
    line &&
      (sensitiveLabelLine.test(line) ||
        addressLike.test(line) ||
        postcodeLine.test(line)),
  );
}

function sanitizeImportedText(value: string, max: number): string {
  return value
    .split(/\r?\n/)
    .map(clean)
    .filter((line) => !isSensitiveImportedLine(line))
    .join(" ")
    .slice(0, max);
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").replace(/^[-•*–—]+\s*/, "").trim();
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "entry"
  );
}

function uniqueId(category: string, title: string, index: number): string {
  return `${category}-${slug(title)}-${index + 1}`;
}

function isHeading(line: string): boolean {
  const value = clean(line).replace(/:$/, "");
  return headingPatterns.some((pattern) => pattern.test(value));
}

function categoryForHeading(line: string): (typeof studentCategories)[number] | null {
  const value = clean(line).replace(/:$/, "");
  for (const category of studentCategories)
    if (headingMap[category].test(value)) return category;
  return null;
}

function sectionBlocks(lines: string[], start: number): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (isHeading(line)) break;
    if (!line) {
      if (current.length) blocks.push(current);
      current = [];
      continue;
    }
    const startsEntry = /^[-•*–—]\s+/.test(line);
    const hasDate = datePattern.test(line);
    if (
      current.length &&
      (startsEntry || (hasDate && datePattern.test(current[0])))
    ) {
      blocks.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length) blocks.push(current);
  return blocks;
}

function entryFromBlock(
  category: string,
  block: string[],
  index: number,
): StudentEntry | null {
  const lines = block.map(clean).filter(Boolean);
  if (!lines.length) return null;
  const first = lines[0];
  const date = (lines.join(" ").match(datePattern)?.[0] || "").trim();
  const colon = first.indexOf(":");
  const title = clean(colon > 1 ? first.slice(0, colon) : first);
  if (
    !title ||
    isSensitiveImportedLine(title) ||
    /^(?:date of birth|dob|address|home address|full address)$/i.test(title) ||
    /^\d+\s+.*\b(?:street|road|avenue|lane|close|court)\b/i.test(title)
  )
    return null;
  const description = clean(
    [colon > 1 ? first.slice(colon + 1) : "", ...lines.slice(1)]
      .filter(Boolean)
      .join(" "),
  );
  return {
    id: uniqueId(category, title, index),
    title: title.slice(0, 240),
    subtitle: "",
    description: description.slice(0, 4000),
    image: "",
    imageAlt: "",
    url: "",
    tags: [],
    date: date.slice(0, 100),
  };
}

function parseListSection(
  category: (typeof studentCategories)[number],
  lines: string[],
  headingIndex: number,
): StudentEntry[] {
  const blocks = sectionBlocks(lines, headingIndex);
  const source = blocks.length ? blocks : [];
  const entries: StudentEntry[] = [];
  source.forEach((block) => {
    const expanded =
      category === "skills" || category === "interests"
        ? block
            .filter(
              (line) =>
                !isSensitiveImportedLine(line) && !addressLike.test(line),
            )
            .flatMap((line) =>
            line
              .split(/[,;·|]/)
              .map((part) => [part])
              .filter((part) => part[0]?.trim()),
            )
        : [block];
    expanded.forEach((item) => {
      const entry = entryFromBlock(category, item, entries.length);
      if (entry) entries.push(entry);
    });
  });
  return entries;
}

function sectionText(lines: string[], headingIndex: number): string {
  return sectionBlocks(lines, headingIndex)
    .flat()
    .map(clean)
    .filter((line) => !isSensitiveImportedLine(line))
    .join(" ")
    .slice(0, 6000);
}

export function sanitizeImportedStudentProfile(
  profile: StudentProfile,
): StudentProfile {
  const next = structuredClone(profile);
  next.name = sanitizeImportedText(next.name, 120);
  next.headline = sanitizeImportedText(next.headline, 240);
  next.bio = sanitizeImportedText(next.bio, 6000);
  next.location = sanitizeImportedText(next.location, 120);
  for (const category of studentCategories) {
    next[category] = next[category]
      .map((entry) => {
        const title = sanitizeImportedText(entry.title, 240);
        if (!title && isSensitiveImportedLine(entry.title)) return null;
        return {
          ...entry,
          title,
          subtitle: sanitizeImportedText(entry.subtitle, 240),
          description: sanitizeImportedText(entry.description, 4000),
          imageAlt: sanitizeImportedText(entry.imageAlt, 240),
          date: sanitizeImportedText(entry.date, 100),
        };
      })
      .filter((entry): entry is StudentEntry => Boolean(entry));
  }
  return studentProfileSchema.parse(next);
}

function linkFromUrl(raw: string): { id: string; label: string; url: string } | null {
  const normalized = raw.replace(/[),.;]+$/, "");
  const url = normalized.startsWith("www.") ? `https://${normalized}` : normalized;
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    const host = parsed.hostname.replace(/^www\./, "");
    const label = host.split(".")[0] || "Link";
    return { id: slug(`${label}-${parsed.pathname}`), label, url };
  } catch {
    return null;
  }
}

export function extractStudentProfile(input: string): {
  profile: StudentProfile;
  warnings: string[];
  method: "local";
} {
  const warnings: string[] = [];
  const profile = emptyProfile();
  if (typeof input !== "string" || !input.trim()) {
    return {
      profile,
      warnings: ["No CV text was supplied."],
      method: "local",
    };
  }
  const raw = input.slice(0, 40_000);
  if (input.length > raw.length) warnings.push("CV text was truncated at 40,000 characters.");
  const lines = raw.replace(/\r/g, "").split(/\n/).map((line) => line.trim());
  const usable = lines.filter(Boolean);
  const firstLines = usable.slice(0, 12);
  const nameCandidate = firstLines.find(
    (line) =>
      !emailPattern.test(line) &&
      !urlPattern.test(line) &&
      !isHeading(line) &&
      !genericDocumentTitle.test(clean(line)) &&
      !explicitLocationPattern.test(line) &&
      !explicitHeadlinePattern.test(line) &&
      !isSensitiveImportedLine(line) &&
      /^[A-Za-z][A-Za-z .'-]{2,119}$/.test(clean(line)),
  );
  if (nameCandidate) profile.name = clean(nameCandidate).slice(0, 120);
  const email = raw.match(emailPattern)?.[0];
  if (email) profile.email = email.slice(0, 254);
  const links = [...raw.matchAll(urlPattern)]
    .map((match) => linkFromUrl(match[0]))
    .filter((link): link is { id: string; label: string; url: string } => Boolean(link));
  profile.links = links.filter(
    (link, index) => links.findIndex((candidate) => candidate.url === link.url) === index,
  ).slice(0, 20);
  const locationLine = usable.find((line) => explicitLocationPattern.test(line));
  if (locationLine) {
    const location = locationLine.match(explicitLocationPattern)?.[1]?.trim() || "";
    if (!/[\r\n]/.test(location) && !addressLike.test(location))
      profile.location = location.slice(0, 120);
    else warnings.push("A full address was omitted from the imported profile.");
  }
  const headlineLine = usable.find((line) => explicitHeadlinePattern.test(line));
  if (headlineLine)
    profile.headline = (headlineLine.match(explicitHeadlinePattern)?.[1] || "").trim().slice(0, 240);

  const summaryIndex = lines.findIndex((line) => summaryHeading.test(clean(line).replace(/:$/, "")));
  if (summaryIndex >= 0) profile.bio = sectionText(lines, summaryIndex);
  const categoryIndexes = new Map<(typeof studentCategories)[number], number>();
  lines.forEach((line, index) => {
    const category = categoryForHeading(line);
    if (category && !categoryIndexes.has(category)) categoryIndexes.set(category, index);
  });
  for (const category of studentCategories) {
    const index = categoryIndexes.get(category);
    if (index === undefined) continue;
    const entries = parseListSection(category, lines, index);
    if (entries.length > 40)
      warnings.push(`${category} entries were limited to the first 40 items.`);
    profile[category] = entries.slice(0, 40);
  }
  if (!profile.name) warnings.push("Could not identify a name; review the imported details.");
  if (!profile.email && profile.links.length === 0)
    warnings.push("No email or web link was found.");
  if (!profile.bio) warnings.push("No summary/profile section was found.");
  if (!studentCategories.some((category) => profile[category].length > 0))
    warnings.push("No recognised education, experience, project, skills, or activity sections were found.");
  warnings.push("Only explicitly labelled location data is kept; addresses and dates of birth are ignored.");
  return {
    profile: sanitizeImportedStudentProfile(profile),
    warnings: [...new Set(warnings)].slice(0, 20),
    method: "local",
  };
}
