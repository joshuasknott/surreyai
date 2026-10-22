import { z } from "zod";

export const sectionTypes = [
  "hero",
  "projects",
  "about",
  "experience",
  "education",
  "skills",
  "achievements",
  "interests",
  "contact",
  "text",
  "gallery",
  "links",
] as const;
export const sectionLayouts = [
  "split",
  "centered",
  "editorial",
  "grid",
  "list",
  "timeline",
  "bento",
  "full",
  "columns",
  "statement",
] as const;
export const fontNames = [
  "inter",
  "fraunces",
  "space-grotesk",
  "plex-mono",
] as const;
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const safeUrl = z
  .string()
  .max(2048)
  .refine((value) => {
    if (!value) return true;
    if (/^#[A-Za-z][A-Za-z0-9_-]*$/.test(value)) return true;
    if (value.startsWith("/") && !value.startsWith("//"))
      return !/[\r\n<>]/.test(value);
    try {
      const url = new URL(value);
      return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol);
    } catch {
      return false;
    }
  }, "Use a valid https://, mailto: or tel: link.");
export const imageUrl = z
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
  }, "Use an image URL or upload a supported image.");
export const linkSchema = z.object({
  id: z.string().max(80),
  label: z.string().max(80),
  url: safeUrl,
});
export const itemSchema = z.object({
  id: z.string().max(80),
  title: z.string().max(240),
  subtitle: z.string().max(240).default(""),
  description: z.string().max(4000).default(""),
  image: imageUrl.default(""),
  imageAlt: z.string().max(240).default(""),
  url: safeUrl.default(""),
  tags: z.array(z.string().max(60)).max(20).default([]),
  date: z.string().max(100).default(""),
});
export const sectionStyleSchema = z.object({
  background: color.optional(),
  color: color.optional(),
  accent: color.optional(),
  paddingTop: z.number().min(0).max(240).default(80),
  paddingBottom: z.number().min(0).max(240).default(80),
  textAlign: z.enum(["left", "center", "right"]).default("left"),
  columns: z.number().int().min(1).max(4).default(2),
  imagePosition: z
    .enum(["left", "right", "background", "none"])
    .default("right"),
  imageWidth: z.number().min(20).max(80).default(50),
  headingSize: z.number().min(24).max(160).optional(),
});
export const sectionSchema = z.object({
  id: z.string().max(80),
  type: z.enum(sectionTypes),
  title: z.string().max(400),
  subtitle: z.string().max(500).default(""),
  body: z.string().max(12000).default(""),
  image: imageUrl.default(""),
  imageAlt: z.string().max(240).default(""),
  layout: z.enum(sectionLayouts).default("split"),
  visible: z.boolean().default(true),
  style: sectionStyleSchema,
  items: z.array(itemSchema).max(40).default([]),
  buttonLabel: z.string().max(80).default(""),
  buttonUrl: safeUrl.default(""),
});
export const themeSchema = z.object({
  background: color,
  surface: color,
  color: color,
  muted: color,
  accent: color,
  border: color,
  headingFont: z.enum(fontNames),
  bodyFont: z.enum(fontNames),
  headingWeight: z.number().int().min(300).max(800).default(500),
  radius: z.number().min(0).max(40).default(0),
  maxWidth: z.number().min(720).max(1600).default(1200),
  fontSize: z.number().min(14).max(22).default(16),
  navigation: z
    .enum(["minimal", "centered", "split", "sidebar"])
    .default("minimal"),
});
export const portfolioSchema = z.object({
  version: z.literal(1),
  name: z.string().min(1).max(120),
  templateId: z.string().max(80),
  profile: z.object({
    name: z.string().max(120),
    headline: z.string().max(240),
    bio: z.string().max(6000),
    location: z.string().max(120).default(""),
    email: z.string().max(254).default(""),
    photo: imageUrl.default(""),
    links: z.array(linkSchema).max(20).default([]),
  }),
  theme: themeSchema,
  sections: z.array(sectionSchema).min(1).max(30),
  seo: z.object({
    title: z.string().max(160),
    description: z.string().max(400),
  }),
});
export type PortfolioDocument = z.infer<typeof portfolioSchema>;
export type PortfolioSection = z.infer<typeof sectionSchema>;
export type PortfolioItem = z.infer<typeof itemSchema>;
export type PortfolioTheme = z.infer<typeof themeSchema>;
export type SectionType = (typeof sectionTypes)[number];
export type SectionLayout = (typeof sectionLayouts)[number];
export interface PortfolioTemplate {
  id: string;
  name: string;
  discipline: string;
  description: string;
  category: "Creative" | "Technical" | "Academic" | "Professional";
  document: PortfolioDocument;
}
export interface SelectedElement {
  sectionId: string;
  field: "title" | "subtitle" | "body" | "image" | "section" | "item";
  itemId?: string;
  itemField?: "title" | "subtitle" | "description" | "image";
}
export type AiMode = "society" | "account" | "key";
export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}
export interface Project {
  id: string;
  name: string;
  document: PortfolioDocument;
  updatedAt: string;
  createdAt: string;
  publishedAt: string | null;
  slug: string | null;
  revision: number;
  aiMode: AiMode;
  archived: boolean;
}
export interface ProjectVersion {
  id: string;
  label: string;
  createdAt: string;
  document?: PortfolioDocument;
}
export function newId(prefix = "id"): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
