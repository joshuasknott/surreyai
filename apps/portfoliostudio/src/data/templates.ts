import type {
  PortfolioDocument,
  PortfolioItem,
  PortfolioSection,
  PortfolioTemplate,
  PortfolioTheme,
} from "../../shared/portfolio";

const image = {
  sculpture: "/images/template-cobalt-sculpture.webp",
  studio:
    "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1200&q=85",
  architecture: "/images/template-desert-concrete.webp",
  model:
    "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=85",
  field:
    "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1500&q=85",
  neural: "/images/template-neural-branch.webp",
  forest:
    "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1500&q=85",
  data: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=85",
  product:
    "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1400&q=85",
  film: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1500&q=85",
  paper:
    "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1400&q=85",
  fashion:
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1400&q=85",
  city: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1500&q=85",
};

const profile: PortfolioDocument["profile"] = {
  name: "Amina Patel",
  headline: "Computer Science student & creative developer",
  bio: "I turn complex problems into clear, useful digital experiences. I care about thoughtful details, accessible systems and work that helps people move forward.",
  location: "Guildford, UK",
  email: "hello@example.com",
  photo: "",
  links: [
    { id: "github", label: "GitHub", url: "https://github.com/" },
    { id: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/" },
  ],
};

type ThemeColors = Pick<
  PortfolioTheme,
  | "background"
  | "surface"
  | "color"
  | "muted"
  | "accent"
  | "border"
  | "headingFont"
  | "bodyFont"
> &
  Partial<
    Pick<
      PortfolioTheme,
      "headingWeight" | "radius" | "maxWidth" | "fontSize" | "navigation"
    >
  >;
function theme(value: ThemeColors): PortfolioTheme {
  return {
    headingWeight: 600,
    radius: 8,
    maxWidth: 1200,
    fontSize: 16,
    navigation: "minimal",
    ...value,
  };
}
function style(
  themeValue: PortfolioTheme,
  overrides: Partial<PortfolioSection["style"]> = {},
): PortfolioSection["style"] {
  return {
    background: themeValue.background,
    color: themeValue.color,
    accent: themeValue.accent,
    paddingTop: 88,
    paddingBottom: 88,
    textAlign: "left",
    columns: 2,
    imagePosition: "right",
    imageWidth: 50,
    ...overrides,
  };
}
function item(
  id: string,
  title: string,
  description: string,
  imageUrl: string,
  tags: string[] = [],
  date = "",
): PortfolioItem {
  return {
    id,
    title,
    subtitle: "",
    description,
    image: imageUrl,
    imageAlt: title,
    url: "",
    tags,
    date,
  };
}
function section(
  themeValue: PortfolioTheme,
  id: string,
  type: PortfolioSection["type"],
  title: string,
  body: string,
  options: Partial<PortfolioSection> = {},
): PortfolioSection {
  return {
    id,
    type,
    title,
    subtitle: "",
    body,
    image: "",
    imageAlt: "",
    layout: "split",
    visible: true,
    style: style(themeValue),
    items: [],
    buttonLabel: "",
    buttonUrl: "",
    ...options,
  };
}
function makeDocument(
  id: string,
  name: string,
  themeValue: PortfolioTheme,
  sections: PortfolioSection[],
  person: PortfolioDocument["profile"] = profile,
): PortfolioDocument {
  return {
    version: 1,
    name,
    templateId: id,
    profile: person,
    theme: themeValue,
    sections,
    seo: {
      title: person.name + " — " + person.headline,
      description: person.bio,
    },
  };
}
const namedProfile = (
  name: string,
  headline: string,
  bio: string,
): PortfolioDocument["profile"] => ({
  ...profile,
  name,
  headline,
  bio,
  photo: "",
  links: [],
});

const cobalt = theme({
  background: "#f7f4ec",
  surface: "#ffffff",
  color: "#253149",
  muted: "#667085",
  accent: "#173ed8",
  border: "#dce1eb",
  headingFont: "inter",
  bodyFont: "inter",
  headingWeight: 500,
  radius: 6,
  maxWidth: 1400,
});
const form = theme({
  background: "#ece6da",
  surface: "#f7f3eb",
  color: "#292622",
  muted: "#777067",
  accent: "#b95532",
  border: "#cec4b6",
  headingFont: "fraunces",
  bodyFont: "inter",
  headingWeight: 500,
  radius: 0,
  maxWidth: 1360,
  navigation: "split",
});
const fieldnotes = theme({
  background: "#0d2b2a",
  surface: "#173a38",
  color: "#f7f1e8",
  muted: "#b9c8bf",
  accent: "#e9cf67",
  border: "#44625d",
  headingFont: "fraunces",
  bodyFont: "inter",
  headingWeight: 500,
  radius: 2,
  maxWidth: 1320,
  navigation: "split",
});
const signal = theme({
  background: "#eef2f4",
  surface: "#ffffff",
  color: "#123247",
  muted: "#5d737e",
  accent: "#18a8b4",
  border: "#ccdae0",
  headingFont: "space-grotesk",
  bodyFont: "plex-mono",
  headingWeight: 600,
  radius: 10,
  maxWidth: 1240,
  fontSize: 15,
  navigation: "centered",
});
const studio = theme({
  background: "#f4f1ea",
  surface: "#fffdf8",
  color: "#121212",
  muted: "#6c6964",
  accent: "#ef4b2f",
  border: "#d9d3c9",
  headingFont: "space-grotesk",
  bodyFont: "inter",
  headingWeight: 600,
  radius: 18,
  maxWidth: 1320,
  navigation: "split",
});
const bloom = theme({
  background: "#f4eedf",
  surface: "#fffaf0",
  color: "#1f3a2f",
  muted: "#66756a",
  accent: "#e27b5f",
  border: "#d7d7bf",
  headingFont: "fraunces",
  bodyFont: "inter",
  headingWeight: 500,
  radius: 18,
  maxWidth: 1260,
});
const frame = theme({
  background: "#17171a",
  surface: "#242429",
  color: "#f1eee7",
  muted: "#a19e97",
  accent: "#f06a35",
  border: "#47464c",
  headingFont: "space-grotesk",
  bodyFont: "inter",
  headingWeight: 600,
  radius: 3,
  maxWidth: 1360,
  navigation: "split",
});
const archive = theme({
  background: "#f4f0e8",
  surface: "#fffdf8",
  color: "#201e1d",
  muted: "#746e68",
  accent: "#6e2635",
  border: "#d7d0c7",
  headingFont: "fraunces",
  bodyFont: "inter",
  headingWeight: 500,
  radius: 0,
  maxWidth: 1080,
  navigation: "centered",
});
const patch = theme({
  background: "#f1e9de",
  surface: "#fffaf4",
  color: "#492c45",
  muted: "#806d79",
  accent: "#c5da74",
  border: "#ddcfc5",
  headingFont: "fraunces",
  bodyFont: "inter",
  headingWeight: 500,
  radius: 4,
  maxWidth: 1360,
  navigation: "split",
});
const current = theme({
  background: "#dcecf0",
  surface: "#f8fcfb",
  color: "#123b52",
  muted: "#557180",
  accent: "#c66a4b",
  border: "#b9d0d8",
  headingFont: "fraunces",
  bodyFont: "inter",
  headingWeight: 500,
  radius: 10,
  maxWidth: 1320,
  navigation: "split",
});

const twoProjects = (a: PortfolioItem, b: PortfolioItem) => [a, b];

const legacyTemplates: PortfolioTemplate[] = [
  {
    id: "cobalt",
    name: "Cobalt",
    discipline: "Creative development",
    description: "An airy split layout for thoughtful digital work.",
    category: "Creative",
    document: makeDocument("cobalt", "Amina’s portfolio", cobalt, [
      section(
        cobalt,
        "hero",
        "hero",
        "Useful ideas. Thoughtfully built.",
        profile.bio,
        {
          subtitle: profile.headline,
          image: image.sculpture,
          imageAlt: "Abstract cobalt and chrome sculpture",
          layout: "split",
          style: style(cobalt, {
            paddingTop: 112,
            paddingBottom: 108,
            imageWidth: 52,
            headingSize: 86,
          }),
        },
      ),
      section(
        cobalt,
        "work",
        "projects",
        "Selected work",
        "A few projects at the intersection of technology, design and everyday life.",
        {
          items: twoProjects(
            item(
              "campus-compass",
              "Campus Compass",
              "Accessible wayfinding for complex places.",
              image.architecture,
              ["Product design", "React"],
              "2026",
            ),
            item(
              "open-library",
              "Open Library",
              "A calmer way to discover what to read.",
              image.paper,
              ["Research", "Interface"],
              "2025",
            ),
          ),
          layout: "grid",
          style: style(cobalt, { columns: 2 }),
        },
      ),
      section(cobalt, "about", "about", "A little about me", profile.bio, {
        layout: "columns",
      }),
      section(
        cobalt,
        "contact",
        "contact",
        "Let’s make something useful.",
        "Have a project, question or kind thought? I’d love to hear from you.",
        {
          buttonLabel: "Get in touch",
          layout: "centered",
          style: style(cobalt, {
            background: cobalt.accent,
            color: "#ffffff",
            accent: "#ffffff",
            textAlign: "center",
          }),
        },
      ),
    ]),
  },
  {
    id: "form",
    name: "Form",
    discipline: "Architecture",
    description: "A calm, image-led canvas for spatial thinkers.",
    category: "Creative",
    document: makeDocument(
      "form",
      "Theo Okafor — Architecture",
      form,
      [
        section(
          form,
          "hero",
          "hero",
          "Spaces for everyday life.",
          "I study how light, material and movement make shared places feel like home.",
          {
            subtitle: "Theo Okafor · Architecture student",
            image: image.architecture,
            imageAlt: "Warm modern pavilion",
            layout: "editorial",
            style: style(form, {
              paddingTop: 96,
              paddingBottom: 100,
              imageWidth: 64,
              headingSize: 94,
            }),
          },
        ),
        section(
          form,
          "work",
          "gallery",
          "Selected work",
          "Small buildings, generous thresholds and the details between them.",
          {
            items: twoProjects(
              item(
                "common-ground",
                "Common Ground",
                "A community pavilion for shared life.",
                image.model,
                ["Pavilion", "Community"],
                "2026",
              ),
              item(
                "tidal-house",
                "Tidal House",
                "An adaptive coastal dwelling.",
                image.city,
                ["Housing", "Coast"],
                "2025",
              ),
            ),
            layout: "editorial",
            style: style(form, { columns: 1 }),
          },
        ),
        section(
          form,
          "about",
          "text",
          "Material, memory, movement.",
          "I’m interested in architecture that is clear without being cold — spaces that let people gather, pause and belong.",
          {
            layout: "statement",
            style: style(form, {
              textAlign: "center",
              columns: 1,
              headingSize: 54,
            }),
          },
        ),
        section(
          form,
          "contact",
          "contact",
          "Start a conversation.",
          "For studio collaborations, placements or a good conversation about public space.",
          {
            buttonLabel: "Email Theo",
            layout: "centered",
            style: style(form, {
              background: form.accent,
              color: "#fff8f0",
              accent: "#fff8f0",
              textAlign: "center",
            }),
          },
        ),
      ],
      {
        ...profile,
        name: "Theo Okafor",
        headline: "Architecture student",
        bio: "I study how light, material and movement make shared places feel like home.",
      },
    ),
  },
  {
    id: "fieldnotes",
    name: "Fieldnotes",
    discipline: "Research & neuroscience",
    description: "A considered editorial system for questions in progress.",
    category: "Academic",
    document: makeDocument(
      "fieldnotes",
      "Maya Chen — Research",
      fieldnotes,
      [
        section(
          fieldnotes,
          "hero",
          "hero",
          "Making sense of how we think.",
          "I’m a neuroscience student interested in how the brain turns information into perception, memory and action.",
          {
            subtitle: "Maya Chen · Neuroscience student",
            image: image.neural,
            imageAlt:
              "Electric neural branches in a dark research visualization",
            layout: "split",
            style: style(fieldnotes, { imageWidth: 54, headingSize: 82 }),
          },
        ),
        section(
          fieldnotes,
          "research",
          "projects",
          "Selected research",
          "Notes, reading and small experiments as I learn more about the mind and the methods we use to study it.",
          {
            items: twoProjects(
              item(
                "attention",
                "Attention, interrupted",
                "How context changes what we notice.",
                image.data,
                ["Cognition", "Reading note"],
              ),
              item(
                "sleep-memory",
                "Sleep & memory",
                "A visual essay on consolidation.",
                image.field,
                ["Memory", "Essay"],
              ),
            ),
            layout: "columns",
            style: style(fieldnotes, {
              background: fieldnotes.surface,
              columns: 2,
            }),
          },
        ),
        section(
          fieldnotes,
          "notes",
          "text",
          "More notes coming soon.",
          "This portfolio is a record of questions in progress. Sources and reflections are added as I go.",
          {
            layout: "statement",
            style: style(fieldnotes, { textAlign: "center", columns: 1 }),
          },
        ),
        section(
          fieldnotes,
          "contact",
          "contact",
          "Let’s compare notes.",
          "For a conversation about research, learning or a thoughtful collaboration.",
          {
            buttonLabel: "Get in touch",
            layout: "centered",
            style: style(fieldnotes, {
              background: fieldnotes.accent,
              color: fieldnotes.background,
              accent: fieldnotes.background,
              textAlign: "center",
            }),
          },
        ),
      ],
      {
        ...profile,
        name: "Maya Chen",
        headline: "Neuroscience student",
        bio: "I’m interested in how the brain turns information into perception, memory and action.",
      },
    ),
  },
  {
    id: "signal",
    name: "Signal",
    discipline: "Data science",
    description: "A precise, modular home for systems and evidence.",
    category: "Technical",
    document: makeDocument(
      "signal",
      "Signal — Data portfolio",
      signal,
      [
        section(
          signal,
          "hero",
          "hero",
          "Designing systems people can trust.",
          "I translate messy questions into clear models, useful tools and decisions people can explain.",
          {
            subtitle: "Data science · analysis · visualisation",
            image: image.data,
            imageAlt: "Data visualisation on a screen",
            layout: "split",
            style: style(signal, {
              background: signal.color,
              color: signal.background,
              imageWidth: 48,
              headingSize: 68,
            }),
          },
        ),
        section(
          signal,
          "work",
          "projects",
          "Case studies",
          "Selected work with transparent assumptions and useful outcomes.",
          {
            items: twoProjects(
              item(
                "transit-signal",
                "Transit Signal",
                "A clearer way to understand a city network.",
                image.city,
                ["Data product", "Python"],
              ),
              item(
                "open-model",
                "Open Model",
                "Making model decisions easier to inspect.",
                image.data,
                ["Research", "Visualisation"],
              ),
            ),
            layout: "bento",
            style: style(signal, { columns: 2 }),
          },
        ),
        section(
          signal,
          "skills",
          "skills",
          "Tools I use",
          "Python · SQL · TypeScript · Observable · user research",
          {
            layout: "list",
            style: style(signal, { background: signal.surface, columns: 1 }),
          },
        ),
        section(
          signal,
          "contact",
          "contact",
          "Have a question worth measuring?",
          "I’m open to thoughtful technical projects, research and placements.",
          {
            buttonLabel: "Say hello",
            layout: "centered",
            style: style(signal, {
              background: signal.accent,
              color: "#ffffff",
              accent: signal.color,
              textAlign: "center",
            }),
          },
        ),
      ],
      {
        ...profile,
        name: "Noah Williams",
        headline: "Data science student & analyst",
        bio: "I translate messy questions into clear models, useful tools and decisions people can explain.",
      },
    ),
  },
  {
    id: "studio",
    name: "Studio",
    discipline: "Product design",
    description: "A confident, tactile portfolio for making and prototyping.",
    category: "Creative",
    document: makeDocument(
      "studio",
      "Studio — Product design",
      studio,
      [
        section(
          studio,
          "hero",
          "hero",
          "Objects with a point of view.",
          "I design products that are clear to use, satisfying to hold and honest about what they do.",
          {
            subtitle: "Ravi Singh · Product design student",
            image: image.product,
            imageAlt: "Minimal chair in a quiet studio",
            layout: "full",
            style: style(studio, {
              imagePosition: "background",
              imageWidth: 80,
              headingSize: 88,
            }),
          },
        ),
        section(
          studio,
          "work",
          "projects",
          "Made, tested, refined.",
          "A small selection of objects, interfaces and the thinking behind them.",
          {
            items: twoProjects(
              item(
                "quiet-kettle",
                "Quiet Kettle",
                "A warmer everyday ritual.",
                image.product,
                ["Industrial", "Prototype"],
              ),
              item(
                "carry-light",
                "Carry Light",
                "A modular light for small spaces.",
                image.studio,
                ["Object", "Material"],
              ),
            ),
            layout: "grid",
            style: style(studio, { background: studio.surface, columns: 2 }),
          },
        ),
        section(
          studio,
          "process",
          "experience",
          "My process is a conversation.",
          "Research first, prototypes early, and enough room for the useful surprise.",
          { layout: "timeline", style: style(studio, { columns: 1 }) },
        ),
        section(
          studio,
          "contact",
          "contact",
          "Let’s make the next version.",
          "Available for product placements, studio collaborations and good problems.",
          {
            buttonLabel: "Start a conversation",
            layout: "centered",
            style: style(studio, {
              background: studio.accent,
              color: studio.surface,
              accent: studio.surface,
              textAlign: "center",
            }),
          },
        ),
      ],
      {
        ...profile,
        name: "Ravi Singh",
        headline: "Product design student",
        bio: "I design products that are clear to use, satisfying to hold and honest about what they do.",
      },
    ),
  },
  {
    id: "bloom",
    name: "Bloom",
    discipline: "Biology & environment",
    description: "An organic field journal for patient, evidence-led work.",
    category: "Academic",
    document: makeDocument(
      "bloom",
      "Bloom — Field journal",
      bloom,
      [
        section(
          bloom,
          "hero",
          "hero",
          "Carefully made, in public.",
          "A field journal for learning how living systems change, and how we can pay better attention.",
          {
            subtitle: "Ivy Morgan · Biology student",
            image: image.forest,
            imageAlt: "Sunlight through a green forest",
            layout: "split",
            style: style(bloom, {
              background: bloom.color,
              color: bloom.background,
              imageWidth: 52,
              headingSize: 80,
            }),
          },
        ),
        section(
          bloom,
          "work",
          "gallery",
          "Field notes",
          "Small observations, careful methods and work that leaves room for uncertainty.",
          {
            items: twoProjects(
              item(
                "river-watch",
                "River Watch",
                "A student-led water quality study.",
                image.forest,
                ["Fieldwork", "Water"],
              ),
              item(
                "seed-library",
                "Seed Library",
                "A visual guide to local growing stories.",
                image.field,
                ["Community", "Ecology"],
              ),
            ),
            layout: "columns",
            style: style(bloom, { columns: 2 }),
          },
        ),
        section(
          bloom,
          "about",
          "about",
          "Learning out loud.",
          "I’m interested in the careful, collaborative work between a question and an answer.",
          {
            layout: "statement",
            style: style(bloom, {
              background: bloom.surface,
              textAlign: "center",
              columns: 1,
            }),
          },
        ),
        section(
          bloom,
          "contact",
          "contact",
          "Come and look closer.",
          "For fieldwork, projects or a slow conversation about living systems.",
          {
            buttonLabel: "Get in touch",
            layout: "centered",
            style: style(bloom, {
              background: bloom.accent,
              color: bloom.surface,
              accent: bloom.surface,
              textAlign: "center",
            }),
          },
        ),
      ],
      {
        ...profile,
        name: "Ivy Morgan",
        headline: "Biology student & field researcher",
        bio: "A field journal for learning how living systems change, and how we can pay better attention.",
      },
    ),
  },
  {
    id: "frame",
    name: "Frame",
    discipline: "Film & media",
    description: "A cinematic reel with a crisp, readable credits system.",
    category: "Creative",
    document: makeDocument(
      "frame",
      "Frame — Film portfolio",
      frame,
      [
        section(
          frame,
          "hero",
          "hero",
          "Stories, cut with intention.",
          "Director, editor and curious collaborator. I make room for the quiet moment before the cut.",
          {
            subtitle: "Leila Ahmed · Film & media student",
            image: image.film,
            imageAlt: "Cinema seats in a dark theatre",
            layout: "full",
            style: style(frame, {
              imagePosition: "background",
              imageWidth: 80,
              headingSize: 88,
            }),
          },
        ),
        section(
          frame,
          "work",
          "gallery",
          "Selected frames",
          "Short films, branded stories and the work between takes.",
          {
            items: twoProjects(
              item(
                "after-rain",
                "After the Rain",
                "A short film about the walk home.",
                image.film,
                ["Director", "Editor"],
                "2026",
              ),
              item(
                "small-hours",
                "Small Hours",
                "A portrait of a city before breakfast.",
                image.city,
                ["Documentary", "Camera"],
                "2025",
              ),
            ),
            layout: "grid",
            style: style(frame, { background: frame.surface, columns: 2 }),
          },
        ),
        section(
          frame,
          "credits",
          "experience",
          "Credits",
          "Direction · Editing · Camera · Sound · Production",
          { layout: "list", style: style(frame, { columns: 1 }) },
        ),
        section(
          frame,
          "contact",
          "contact",
          "Roll camera.",
          "Open to kind teams, brave ideas and projects with a point of view.",
          {
            buttonLabel: "Get in touch",
            layout: "centered",
            style: style(frame, {
              background: frame.accent,
              color: frame.background,
              accent: frame.background,
              textAlign: "center",
            }),
          },
        ),
      ],
      {
        ...profile,
        name: "Leila Ahmed",
        headline: "Film & media student",
        bio: "Director, editor and curious collaborator. I make room for the quiet moment before the cut.",
      },
    ),
  },
  {
    id: "archive",
    name: "Archive",
    discipline: "History & writing",
    description: "A reading-room layout for essays, research and references.",
    category: "Academic",
    document: makeDocument(
      "archive",
      "Archive — Writing portfolio",
      archive,
      [
        section(
          archive,
          "hero",
          "hero",
          "A practice in progress.",
          "Essays, archives and questions about the stories we keep — and the ones we leave out.",
          {
            subtitle: "Jon Bell · History & English student",
            image: image.paper,
            imageAlt: "Open notebook and handwritten notes",
            layout: "editorial",
            style: style(archive, { imageWidth: 46, headingSize: 84 }),
          },
        ),
        section(
          archive,
          "work",
          "projects",
          "Recent writing",
          "A catalogue of essays, close readings and research in public.",
          {
            items: twoProjects(
              item(
                "ordinary-archives",
                "The ordinary archive",
                "What everyday objects remember.",
                image.paper,
                ["Essay", "History"],
                "2026",
              ),
              item(
                "margin-notes",
                "Margin notes",
                "Reading beside the canon.",
                image.studio,
                ["Criticism", "Culture"],
                "2025",
              ),
            ),
            layout: "list",
            style: style(archive, { background: archive.surface, columns: 1 }),
          },
        ),
        section(
          archive,
          "about",
          "text",
          "Read slowly. Make connections.",
          "I’m interested in accessible scholarship, generous citations and the texture of a well-made sentence.",
          {
            layout: "statement",
            style: style(archive, {
              background: archive.accent,
              color: archive.background,
              accent: archive.background,
              textAlign: "center",
              columns: 1,
              headingSize: 54,
            }),
          },
        ),
        section(
          archive,
          "contact",
          "contact",
          "Let’s continue the footnote.",
          "For collaborations, reading groups or a thoughtful exchange.",
          {
            buttonLabel: "Write to Jon",
            layout: "centered",
            style: style(archive, { textAlign: "center" }),
          },
        ),
      ],
      {
        ...profile,
        name: "Jon Bell",
        headline: "History & English student",
        bio: "Essays, archives and questions about the stories we keep — and the ones we leave out.",
      },
    ),
  },
  {
    id: "patch",
    name: "Patch",
    discipline: "Fashion & textiles",
    description: "An editorial lookbook for material, colour and craft.",
    category: "Creative",
    document: makeDocument(
      "patch",
      "Patch — Textile portfolio",
      patch,
      [
        section(
          patch,
          "hero",
          "hero",
          "Clothes that move with people.",
          "Material experiments and wearable stories made with patience, curiosity and a little bit of play.",
          {
            subtitle: "Samira Khan · Fashion & textiles student",
            image: image.fashion,
            imageAlt: "Editorial fashion detail",
            layout: "split",
            style: style(patch, {
              background: patch.color,
              color: patch.background,
              imageWidth: 50,
              headingSize: 80,
            }),
          },
        ),
        section(
          patch,
          "work",
          "gallery",
          "The lookbook",
          "Selected collections, studies and the details that make a piece feel alive.",
          {
            items: twoProjects(
              item(
                "soft-structure",
                "Soft structure",
                "Draping with room to breathe.",
                image.fashion,
                ["Collection", "Draping"],
                "2026",
              ),
              item(
                "repair-club",
                "Repair club",
                "A community toolkit for mending.",
                image.studio,
                ["Textile", "Community"],
                "2025",
              ),
            ),
            layout: "grid",
            style: style(patch, { columns: 2 }),
          },
        ),
        section(
          patch,
          "process",
          "experience",
          "Cut, pin, repeat.",
          "I start with material, test without fear and keep the useful accidents.",
          {
            layout: "timeline",
            style: style(patch, { background: patch.surface, columns: 1 }),
          },
        ),
        section(
          patch,
          "contact",
          "contact",
          "Let’s make something tactile.",
          "Available for studio work, collaborations and thoughtful making.",
          {
            buttonLabel: "Say hello",
            layout: "centered",
            style: style(patch, {
              background: patch.accent,
              color: patch.color,
              accent: patch.color,
              textAlign: "center",
            }),
          },
        ),
      ],
      {
        ...profile,
        name: "Samira Khan",
        headline: "Fashion & textiles student",
        bio: "Material experiments and wearable stories made with patience, curiosity and a little bit of play.",
      },
    ),
  },
  {
    id: "current",
    name: "Current",
    discipline: "Geography & urban studies",
    description: "A route-led portfolio for places shaped by change.",
    category: "Professional",
    document: makeDocument(
      "current",
      "Current — Urban studies",
      current,
      [
        section(
          current,
          "hero",
          "hero",
          "Places shaped by change.",
          "I study the everyday systems that make a city feel open, connected and worth staying in.",
          {
            subtitle: "Elliot Green · Geography & urban studies",
            image: image.city,
            imageAlt: "City buildings and street grid",
            layout: "split",
            style: style(current, {
              background: current.color,
              color: current.background,
              imageWidth: 54,
              headingSize: 80,
            }),
          },
        ),
        section(
          current,
          "work",
          "projects",
          "On the ground",
          "Case studies from streets, maps and conversations.",
          {
            items: twoProjects(
              item(
                "night-bus",
                "Night bus stories",
                "What a route reveals after dark.",
                image.city,
                ["Mobility", "Interview"],
                "2026",
              ),
              item(
                "common-ground",
                "Common ground",
                "A map of small public spaces.",
                image.architecture,
                ["Public space", "Mapping"],
                "2025",
              ),
            ),
            layout: "timeline",
            style: style(current, { columns: 1 }),
          },
        ),
        section(
          current,
          "about",
          "about",
          "Start with the walk.",
          "I’m interested in the gap between a plan and the way a place is actually used.",
          {
            layout: "columns",
            style: style(current, { background: current.surface, columns: 2 }),
          },
        ),
        section(
          current,
          "contact",
          "contact",
          "Let’s trace a route.",
          "For fieldwork, urban projects or a question about the places we share.",
          {
            buttonLabel: "Get in touch",
            layout: "centered",
            style: style(current, {
              background: current.accent,
              color: current.surface,
              accent: current.surface,
              textAlign: "center",
            }),
          },
        ),
      ],
      {
        ...profile,
        name: "Elliot Green",
        headline: "Geography & urban studies student",
        bio: "I study the everyday systems that make a city feel open, connected and worth staying in.",
      },
    ),
  },
];

/* The final ten concept directions are kept as separate IDs so saved legacy
 * documents continue to render exactly as they did. Their copy is intentionally
 * ordinary CV text: personalization replaces it before a student's page opens. */
const signalV2 = theme({
  background: "#ffffff",
  surface: "#f5f5f2",
  color: "#111111",
  muted: "#555555",
  accent: "#ff4818",
  border: "#111111",
  headingFont: "space-grotesk",
  bodyFont: "inter",
  headingWeight: 650,
  fontSize: 18,
  radius: 0,
  maxWidth: 1400,
  navigation: "split",
});
const fieldNotesV2 = theme({
  background: "#f6f3e8",
  surface: "#ede8d8",
  color: "#203b2c",
  muted: "#617064",
  accent: "#203b2c",
  border: "#9ba697",
  headingFont: "fraunces",
  bodyFont: "inter",
  headingWeight: 600,
  fontSize: 18,
  radius: 0,
  maxWidth: 1320,
  navigation: "centered",
});
const cobaltV2 = theme({
  background: "#ffffff",
  surface: "#eaf0ff",
  color: "#151a2a",
  muted: "#586071",
  accent: "#2344f5",
  border: "#17213f",
  headingFont: "space-grotesk",
  bodyFont: "inter",
  headingWeight: 650,
  fontSize: 18,
  radius: 0,
  maxWidth: 1400,
  navigation: "sidebar",
});
const portrait = theme({
  background: "#fbf7f0",
  surface: "#f2dedc",
  color: "#512333",
  muted: "#7b6269",
  accent: "#512333",
  border: "#d7bfc0",
  headingFont: "fraunces",
  bodyFont: "inter",
  headingWeight: 600,
  fontSize: 18,
  radius: 18,
  maxWidth: 1320,
  navigation: "split",
});
const offset = theme({
  background: "#f7f3ff",
  surface: "#d8c6ff",
  color: "#17131f",
  muted: "#645d70",
  accent: "#e5fb58",
  border: "#17131f",
  headingFont: "space-grotesk",
  bodyFont: "inter",
  headingWeight: 650,
  fontSize: 18,
  radius: 0,
  maxWidth: 1400,
  navigation: "split",
});
const ledger = theme({
  background: "#f7f3ee",
  surface: "#ffffff",
  color: "#211c1a",
  muted: "#726a66",
  accent: "#191919",
  border: "#211c1a",
  headingFont: "fraunces",
  bodyFont: "inter",
  headingWeight: 600,
  fontSize: 18,
  radius: 0,
  maxWidth: 1240,
  navigation: "split",
});
const nightfall = theme({
  background: "#10191c",
  surface: "#1d2a2c",
  color: "#f3f7f3",
  muted: "#a9b8b2",
  accent: "#a8edcf",
  border: "#455d58",
  headingFont: "space-grotesk",
  bodyFont: "inter",
  headingWeight: 650,
  fontSize: 18,
  radius: 0,
  maxWidth: 1280,
  navigation: "split",
});
const openStudio = theme({
  background: "#fffdfa",
  surface: "#f8dfd7",
  color: "#161515",
  muted: "#6b625d",
  accent: "#bd513b",
  border: "#161515",
  headingFont: "space-grotesk",
  bodyFont: "inter",
  headingWeight: 650,
  fontSize: 18,
  radius: 0,
  maxWidth: 1400,
  navigation: "split",
});
const firstLight = theme({
  background: "#fffdf5",
  surface: "#f6de67",
  color: "#163f42",
  muted: "#5b7474",
  accent: "#163f42",
  border: "#163f42",
  headingFont: "inter",
  bodyFont: "inter",
  headingWeight: 650,
  fontSize: 18,
  radius: 24,
  maxWidth: 1280,
  navigation: "split",
});
const colourblock = theme({
  background: "#fffafa",
  surface: "#f0b9c5",
  color: "#341725",
  muted: "#795b66",
  accent: "#cf2645",
  border: "#341725",
  headingFont: "space-grotesk",
  bodyFont: "inter",
  headingWeight: 650,
  fontSize: 18,
  radius: 0,
  maxWidth: 1400,
  navigation: "split",
});

const noImage = (
  id: string,
  title: string,
  description: string,
  tags: string[] = [],
  date = "",
) => item(id, title, description, "", tags, date);
const newTenTemplates: PortfolioTemplate[] = [
  {
    id: "signal-v2",
    name: "Signal",
    discipline: "Bold typography · No images needed",
    description: "Assertive Swiss typography with experience-first CV rows.",
    category: "Professional",
    document: makeDocument(
      "signal-v2",
      "Maya Shah — portfolio",
      signalV2,
      [
        section(
          signalV2,
          "hero",
          "hero",
          "Maya Shah.",
          "People, ideas, and the work between.",
          {
            subtitle: "Business management student",
            body: "Interested in how good teams work.",
            layout: "split",
            style: style(signalV2, {
              columns: 1,
              headingSize: 96,
              paddingTop: 120,
              paddingBottom: 120,
            }),
          },
        ),
        section(
          signalV2,
          "experience",
          "experience",
          "Experience, in practice.",
          "",
          {
            layout: "list",
            style: style(signalV2, {
              background: signalV2.accent,
              color: "#ffffff",
              accent: "#ffffff",
              columns: 1,
            }),
            items: [
              noImage(
                "ambassador",
                "Student ambassador",
                "Welcoming visitors and answering questions about student life.",
              ),
              noImage(
                "retail",
                "Retail assistant",
                "Keeping the shop organised and helping customers find what they need.",
              ),
              noImage(
                "events",
                "Events volunteer",
                "Supporting speaker sessions and keeping event plans on track.",
              ),
            ],
          },
        ),
        section(
          signalV2,
          "education",
          "education",
          "What I’m learning.",
          "BSc Business Management · Second year · Organisational behaviour, marketing and business research.",
          {
            layout: "columns",
            style: style(signalV2, { columns: 1 }),
            items: [
              noImage(
                "coursework",
                "Understanding a student-run enterprise",
                "A group report exploring roles, budgeting and day-to-day decisions.",
              ),
            ],
          },
        ),
        section(
          signalV2,
          "contribution",
          "skills",
          "How I contribute.",
          "Clear communication · Careful organisation · A practical mindset.",
          {
            layout: "statement",
            style: style(signalV2, {
              background: "#111111",
              color: "#ffffff",
              accent: "#ff4818",
              columns: 1,
              headingSize: 62,
            }),
          },
        ),
        section(
          signalV2,
          "contact",
          "contact",
          "Let’s get to work.",
          "Email Maya or connect on LinkedIn.",
          {
            layout: "centered",
            style: style(signalV2, {
              textAlign: "left",
              columns: 1,
              paddingTop: 110,
              paddingBottom: 110,
            }),
          },
        ),
      ],
      namedProfile(
        "Maya Shah",
        "Business management student",
        "Interested in how good teams work.",
      ),
    ),
  },
  {
    id: "field-notes",
    name: "Field Notes",
    discipline: "Editorial · Optional images",
    description: "An editorial field journal with optional landscape media.",
    category: "Academic",
    document: makeDocument(
      "field-notes",
      "Aisha Bennett — field notes",
      fieldNotesV2,
      [
        section(
          fieldNotesV2,
          "hero",
          "hero",
          "Curious about the world we share.",
          "Geography student exploring landscapes, people and environmental change.",
          {
            subtitle: "Aisha Bennett",
            image: image.forest,
            imageAlt: "Landscape fieldwork photograph",
            layout: "centered",
            style: style(fieldNotesV2, {
              textAlign: "center",
              columns: 1,
              headingSize: 88,
              imagePosition: "right",
            }),
          },
        ),
        section(
          fieldNotesV2,
          "learning",
          "projects",
          "Recent learning",
          "Study, observe, understand.",
          {
            layout: "list",
            style: style(fieldNotesV2, { columns: 1 }),
            items: [
              noImage(
                "river-catchment",
                "River catchment study",
                "Mapping land use and comparing water samples as part of a fieldwork group.",
              ),
              noImage(
                "high-street",
                "A changing high street",
                "A coursework essay on how retail and public space shape town centres.",
              ),
            ],
          },
        ),
        section(
          fieldNotesV2,
          "fieldwork",
          "experience",
          "Beyond the lecture hall",
          "",
          {
            layout: "columns",
            style: style(fieldNotesV2, {
              background: fieldNotesV2.color,
              color: fieldNotesV2.background,
              columns: 2,
            }),
            items: [
              noImage(
                "conservation",
                "Conservation volunteer",
                "Helping with habitat maintenance and recording seasonal changes.",
              ),
              noImage(
                "cafe",
                "Café team member",
                "Working calmly with others during busy shifts.",
              ),
            ],
          },
        ),
        section(
          fieldNotesV2,
          "about",
          "about",
          "What I bring",
          "Field observation · GIS basics · Research · Clear writing · Teamwork",
          {
            layout: "statement",
            style: style(fieldNotesV2, { textAlign: "center", columns: 1 }),
          },
        ),
        section(
          fieldNotesV2,
          "contact",
          "contact",
          "Let’s start a conversation.",
          "aisha.bennett@example.com · LinkedIn · Download CV",
          {
            layout: "centered",
            style: style(fieldNotesV2, { textAlign: "center", columns: 1 }),
          },
        ),
      ],
      namedProfile(
        "Aisha Bennett",
        "Geography student",
        "Exploring landscapes, people and environmental change.",
      ),
    ),
  },
  {
    id: "cobalt-v2",
    name: "Cobalt",
    discipline: "Sidebar layout · No images needed",
    description: "A strong vertical identity rail for projects and education.",
    category: "Technical",
    document: makeDocument(
      "cobalt-v2",
      "Leo Park — computer science",
      cobaltV2,
      [
        section(
          cobaltV2,
          "hero",
          "hero",
          "Small tools. Thoughtful systems.",
          "I’m learning to build software that makes everyday tasks a little easier.",
          {
            subtitle: "Leo Park · Computer science student",
            layout: "split",
            style: style(cobaltV2, { columns: 1, headingSize: 86 }),
          },
        ),
        section(cobaltV2, "projects", "projects", "Selected builds", "", {
          layout: "list",
          style: style(cobaltV2, { columns: 1 }),
          items: [
            noImage(
              "reading-list",
              "Reading list organiser",
              "A personal web app for saving books, sorting reading lists and keeping short notes.",
              ["JavaScript", "HTML", "CSS"],
            ),
            noImage(
              "revision-timer",
              "Revision timer",
              "A simple study timer built to practise state, keyboard controls and local storage.",
            ),
          ],
        }),
        section(
          cobaltV2,
          "experience",
          "experience",
          "Alongside my studies",
          "",
          {
            layout: "list",
            style: style(cobaltV2, {
              background: cobaltV2.surface,
              columns: 1,
            }),
            items: [
              noImage(
                "helpdesk",
                "IT helpdesk volunteer",
                "Helping students with everyday laptop and account issues.",
              ),
              noImage(
                "coding-society",
                "Coding Society member",
                "Joining weekly challenges and sharing ideas with other students.",
              ),
            ],
          },
        ),
        section(
          cobaltV2,
          "education",
          "education",
          "Education & toolkit",
          "BSc Computer Science · Second year · Algorithms, databases and human–computer interaction.\nUsing now · JavaScript · Python · Git\nDeveloping · Testing · SQL · Interface design",
          { layout: "columns", style: style(cobaltV2, { columns: 1 }) },
        ),
        section(
          cobaltV2,
          "contact",
          "contact",
          "Have something worth building?",
          "Email Leo · GitHub · LinkedIn · Download CV",
          {
            layout: "centered",
            style: style(cobaltV2, {
              background: cobaltV2.accent,
              color: "#ffffff",
              accent: "#ffffff",
              columns: 1,
            }),
          },
        ),
      ],
      namedProfile(
        "Leo Park",
        "Computer science student",
        "I’m learning to build software that makes everyday tasks a little easier.",
      ),
    ),
  },
  {
    id: "portrait",
    name: "Portrait",
    discipline: "Warm minimalism · Optional portrait",
    description: "A warm portrait-led CV with a calm chronological rhythm.",
    category: "Academic",
    document: makeDocument(
      "portrait",
      "Hannah Collins — psychology",
      portrait,
      [
        section(
          portrait,
          "hero",
          "hero",
          "Hannah Collins",
          "Psychology student. Interested in people, learning and care.",
          {
            subtitle: "A little about me",
            image: "",
            imageAlt: "",
            layout: "split",
            style: style(portrait, { imageWidth: 34, headingSize: 88 }),
          },
        ),
        section(
          portrait,
          "about",
          "about",
          "A thoughtful start.",
          "I’m in my second year of a psychology degree, building research skills and gaining experience in community settings.",
          { layout: "columns", style: style(portrait, { columns: 1 }) },
        ),
        section(portrait, "experience", "experience", "Experience", "", {
          layout: "list",
          style: style(portrait, { columns: 1 }),
          items: [
            noImage(
              "peer-mentor",
              "Peer mentor",
              "Helping first-year students settle into university life.",
              [],
              "2025–present",
            ),
            noImage(
              "bookshop",
              "Bookshop assistant",
              "Listening to customers and keeping a busy shop organised.",
              [],
              "2024–present",
            ),
            noImage(
              "community",
              "Community centre volunteer",
              "Supporting weekly activities and welcoming visitors.",
              [],
              "2025",
            ),
          ],
        }),
        section(
          portrait,
          "study",
          "education",
          "Currently studying",
          "BSc Psychology · Second year · Cognition, development and research methods.",
          {
            layout: "columns",
            style: style(portrait, {
              background: portrait.surface,
              columns: 1,
            }),
            items: [
              noImage(
                "sleep-attention",
                "Sleep and attention",
                "A coursework review comparing how research studies measure concentration.",
              ),
            ],
          },
        ),
        section(
          portrait,
          "skills",
          "skills",
          "Skills I’m developing",
          "Research reading · SPSS basics · Reflective writing · Careful listening",
          { layout: "list", style: style(portrait, { columns: 1 }) },
        ),
        section(
          portrait,
          "contact",
          "contact",
          "Get in touch",
          "hannah.collins@example.com · LinkedIn · Download CV",
          {
            layout: "centered",
            style: style(portrait, {
              background: portrait.color,
              color: "#fff8f0",
              accent: "#fff8f0",
              columns: 1,
            }),
          },
        ),
      ],
      namedProfile(
        "Hannah Collins",
        "Psychology student",
        "Interested in people, learning and care.",
      ),
    ),
  },
  {
    id: "offset",
    name: "Offset",
    discipline: "Graphic grid · No images needed",
    description: "A modular typographic grid for creative communications work.",
    category: "Creative",
    document: makeDocument(
      "offset",
      "Rory James — media portfolio",
      offset,
      [
        section(
          offset,
          "hero",
          "hero",
          "WORDS. IDEAS. PEOPLE.",
          "I enjoy finding the clear idea in a complicated story.",
          {
            subtitle: "Rory James · Media & communications student",
            layout: "split",
            style: style(offset, {
              columns: 1,
              background: offset.surface,
              headingSize: 90,
            }),
          },
        ),
        section(offset, "work", "projects", "Selected work", "", {
          layout: "grid",
          style: style(offset, { columns: 2 }),
          items: [
            noImage(
              "community-campaign",
              "Community campaign",
              "A clear communications concept for a student community.",
              ["Writing", "Strategy"],
            ),
            noImage(
              "story-package",
              "Story package",
              "An editorial exercise in finding the human angle.",
              ["Editing", "Research"],
            ),
            noImage(
              "campaign-notes",
              "Campaign notes",
              "A short reflection on tone, audience and timing.",
              ["Planning"],
            ),
          ],
        }),
        section(
          offset,
          "experience",
          "experience",
          "Practical experience",
          "",
          {
            layout: "list",
            style: style(offset, {
              columns: 1,
              background: offset.color,
              color: "#ffffff",
              accent: offset.accent,
            }),
            items: [
              noImage(
                "advice-centre",
                "Advice centre volunteer",
                "Welcoming visitors, preparing information packs and observing how support is organised.",
              ),
              noImage(
                "hospitality",
                "Hospitality team member",
                "Working with a busy team and communicating clearly with customers.",
              ),
            ],
          },
        ),
        section(
          offset,
          "contact",
          "contact",
          "Keep the idea moving.",
          "rory.james@example.com · LinkedIn · Download CV",
          {
            layout: "centered",
            style: style(offset, {
              background: offset.surface,
              textAlign: "left",
              columns: 1,
            }),
          },
        ),
      ],
      namedProfile(
        "Rory James",
        "Media & communications student",
        "I enjoy finding the clear idea in a complicated story.",
      ),
    ),
  },
  {
    id: "ledger",
    name: "Ledger",
    discipline: "Classic typography · No images needed",
    description: "A rigorous two-column record for study, writing and service.",
    category: "Professional",
    document: makeDocument(
      "ledger",
      "Daniel Okafor — law portfolio",
      ledger,
      [
        section(
          ledger,
          "hero",
          "hero",
          "Learning to make a clear case.",
          "Law student interested in public life, careful research and the people behind policy.",
          {
            subtitle: "Daniel Okafor",
            layout: "split",
            style: style(ledger, { columns: 1, headingSize: 86 }),
          },
        ),
        section(
          ledger,
          "experience",
          "experience",
          "Practical experience",
          "",
          {
            layout: "list",
            style: style(ledger, { columns: 1 }),
            items: [
              noImage(
                "advice",
                "Advice centre volunteer",
                "Welcoming visitors, preparing information packs and observing how support is organised.",
              ),
              noImage(
                "hospitality",
                "Hospitality team member",
                "Working with a busy team and communicating clearly with customers.",
              ),
            ],
          },
        ),
        section(ledger, "writing", "projects", "Selected writing", "", {
          layout: "list",
          style: style(ledger, { columns: 1 }),
          items: [
            noImage(
              "heard",
              "Who gets heard?",
              "A coursework essay on public consultation and access to decision-making.",
            ),
            noImage(
              "judgment",
              "Reading a judgment",
              "A case note examining how a court explains its reasoning.",
            ),
          ],
        }),
        section(
          ledger,
          "skills",
          "skills",
          "Skills",
          "Research & synthesis · Structured writing · Presenting arguments · Team organisation",
          { layout: "columns", style: style(ledger, { columns: 1 }) },
        ),
        section(
          ledger,
          "activities",
          "interests",
          "Activities",
          "Mooting Society · History · Public policy · Long-distance walking",
          { layout: "columns", style: style(ledger, { columns: 1 }) },
        ),
        section(
          ledger,
          "contact",
          "contact",
          "Open to learning opportunities.",
          "daniel.okafor@example.com · LinkedIn · Download CV",
          {
            layout: "centered",
            style: style(ledger, { background: ledger.surface, columns: 1 }),
          },
        ),
      ],
      namedProfile(
        "Daniel Okafor",
        "Law student",
        "Research, writing and public service.",
      ),
    ),
  },
  {
    id: "nightfall",
    name: "Nightfall",
    discipline: "Dark theme · No images needed",
    description: "A sophisticated dark page centred on one featured project.",
    category: "Technical",
    document: makeDocument(
      "nightfall",
      "Priya Nair — mathematics",
      nightfall,
      [
        section(
          nightfall,
          "hero",
          "hero",
          "Finding clarity in complexity.",
          "I enjoy working through messy questions, checking assumptions and explaining what the numbers mean.",
          {
            subtitle: "Priya Nair · Mathematics & statistics student",
            layout: "centered",
            style: style(nightfall, {
              background: nightfall.background,
              color: nightfall.color,
              textAlign: "center",
              columns: 1,
              headingSize: 86,
            }),
          },
        ),
        section(
          nightfall,
          "featured",
          "projects",
          "Featured coursework",
          "What makes a journey reliable?",
          {
            layout: "split",
            style: style(nightfall, {
              background: nightfall.surface,
              columns: 1,
            }),
            items: [
              noImage(
                "commuting",
                "Commuting patterns",
                "A statistics project exploring variation in everyday travel times. Cleaning the dataset, comparing distributions and writing up the limitations.",
              ),
            ],
          },
        ),
        section(nightfall, "work", "projects", "More from my studies", "", {
          layout: "list",
          style: style(nightfall, { columns: 1 }),
          items: [
            noImage(
              "probability",
              "A probability notebook",
              "Worked examples explaining uncertainty in plain language.",
            ),
            noImage(
              "optimisation",
              "Optimisation in practice",
              "A group exercise comparing approaches to a scheduling problem.",
            ),
          ],
        }),
        section(
          nightfall,
          "background",
          "education",
          "Background",
          "BSc Mathematics & Statistics · Second year · Python · R · Statistical reasoning · Clear reporting",
          { layout: "columns", style: style(nightfall, { columns: 1 }) },
        ),
        section(
          nightfall,
          "contact",
          "contact",
          "Open to a summer placement.",
          "priya.nair@example.com · LinkedIn · Download CV",
          {
            layout: "centered",
            style: style(nightfall, {
              background: nightfall.accent,
              color: "#10191c",
              accent: "#10191c",
              columns: 1,
            }),
          },
        ),
      ],
      namedProfile(
        "Priya Nair",
        "Mathematics & statistics student",
        "I enjoy working through messy questions, checking assumptions and explaining what the numbers mean.",
      ),
    ),
  },
  {
    id: "open-studio",
    name: "Open Studio",
    discipline: "Gallery layout · Optional images",
    description: "An art-school rhythm with optional project photography.",
    category: "Creative",
    document: makeDocument(
      "open-studio",
      "Jamie Santos — fine art",
      openStudio,
      [
        section(
          openStudio,
          "hero",
          "hero",
          "JAMIE SANTOS",
          "Fine art student exploring materials, observation and the things we overlook.",
          {
            subtitle: "BA Fine Art · Second year",
            layout: "split",
            style: style(openStudio, { columns: 1, headingSize: 88 }),
          },
        ),
        section(openStudio, "work", "gallery", "Selected explorations", "", {
          layout: "grid",
          style: style(openStudio, { columns: 2 }),
          items: [
            item(
              "forms-clay",
              "Forms in clay",
              "A series of small hand-built objects exploring balance, texture and repetition.",
              image.studio,
              ["Making", "Material"],
            ),
            item(
              "looking-closer",
              "Looking closer",
              "An observational drawing exercise based on ordinary objects and changing light.",
              image.paper,
              ["Drawing", "Process"],
            ),
            noImage(
              "material-notes",
              "Notes on material",
              "A short written reflection on how everyday materials change the way an object feels.",
            ),
          ],
        }),
        section(
          openStudio,
          "background",
          "experience",
          "Practice & background",
          "",
          {
            layout: "columns",
            style: style(openStudio, { columns: 2 }),
            items: [
              noImage("education", "Education", "BA Fine Art · Second year"),
              noImage(
                "gallery",
                "Gallery volunteer",
                "Helping prepare spaces and welcome visitors.",
              ),
              noImage(
                "approach",
                "Approach",
                "Drawing, making, documenting and learning through feedback.",
              ),
            ],
          },
        ),
        section(
          openStudio,
          "contact",
          "contact",
          "Let’s talk.",
          "jamie.santos@example.com · Instagram · Download CV",
          {
            layout: "centered",
            style: style(openStudio, {
              background: openStudio.surface,
              columns: 1,
            }),
          },
        ),
      ],
      namedProfile(
        "Jamie Santos",
        "Fine art student",
        "Exploring materials, observation and the things we overlook.",
      ),
    ),
  },
  {
    id: "first-light",
    name: "First Light",
    discipline: "Compact layout · No images needed",
    description: "A welcoming, compact portfolio for early-stage students.",
    category: "Professional",
    document: makeDocument(
      "first-light",
      "Nia Williams — education",
      firstLight,
      [
        section(
          firstLight,
          "hero",
          "hero",
          "Nia Williams.",
          "First-year education student, curious about how people learn.",
          {
            subtitle: "Hello, I’m",
            layout: "split",
            style: style(firstLight, {
              background: firstLight.surface,
              columns: 1,
              headingSize: 92,
            }),
          },
        ),
        section(
          firstLight,
          "learning",
          "education",
          "What I’m learning",
          "BA Education Studies · First year · Child development, inclusive learning and education in society.",
          {
            layout: "columns",
            style: style(firstLight, {
              background: firstLight.color,
              color: "#fffdf5",
              accent: firstLight.surface,
              columns: 1,
            }),
          },
        ),
        section(
          firstLight,
          "experience",
          "experience",
          "Experience comes in different forms.",
          "",
          {
            layout: "timeline",
            style: style(firstLight, { columns: 1 }),
            items: [
              noImage(
                "library",
                "Library volunteer",
                "Helping visitors find books and preparing materials for children’s activities.",
              ),
              noImage(
                "cafe",
                "Weekend café work",
                "Listening carefully, working with a team and staying organised on busy days.",
              ),
            ],
          },
        ),
        section(
          firstLight,
          "about",
          "about",
          "What I bring",
          "Patience, clear communication and a willingness to learn.",
          {
            layout: "columns",
            style: style(firstLight, {
              background: firstLight.surface,
              columns: 2,
            }),
          },
        ),
        section(
          firstLight,
          "interests",
          "interests",
          "Beyond university",
          "Reading · Baking · Netball",
          { layout: "columns", style: style(firstLight, { columns: 1 }) },
        ),
        section(
          firstLight,
          "contact",
          "contact",
          "Let’s connect.",
          "nia.williams@example.com · LinkedIn · Download CV",
          {
            layout: "centered",
            style: style(firstLight, {
              background: firstLight.surface,
              color: firstLight.color,
              columns: 1,
            }),
          },
        ),
      ],
      namedProfile(
        "Nia Williams",
        "First-year education student",
        "Curious about how people learn.",
      ),
    ),
  },
  {
    id: "colourblock",
    name: "Colourblock",
    discipline: "Colour panels · No images needed",
    description: "A modular editorial grid for a lively, disciplined CV.",
    category: "Professional",
    document: makeDocument(
      "colourblock",
      "Zara Ahmed — economics",
      colourblock,
      [
        section(
          colourblock,
          "hero",
          "hero",
          "Zara Ahmed.",
          "Interested in the decisions that shape everyday life.",
          {
            subtitle: "Economics student",
            layout: "split",
            style: style(colourblock, {
              background: colourblock.surface,
              columns: 1,
              headingSize: 90,
            }),
          },
        ),
        section(
          colourblock,
          "study",
          "education",
          "Now",
          "BSc Economics · Second year · Microeconomics, econometrics and public policy.",
          { layout: "columns", style: style(colourblock, { columns: 1 }) },
        ),
        section(colourblock, "experience", "experience", "Experience", "", {
          layout: "list",
          style: style(colourblock, { columns: 1, background: "#fffafa" }),
          items: [
            noImage(
              "treasurer",
              "Society treasurer",
              "Keeping records, planning event budgets and working with the committee.",
            ),
            noImage(
              "supermarket",
              "Supermarket team member",
              "Supporting customers and balancing tasks during busy shifts.",
            ),
          ],
        }),
        section(
          colourblock,
          "question",
          "projects",
          "A question I’ve explored",
          "Why do food prices vary? A coursework comparison of pricing, competition and household choices. My part: gathering sources, checking assumptions and presenting the argument.",
          {
            layout: "statement",
            style: style(colourblock, {
              background: colourblock.accent,
              color: "#ffffff",
              accent: "#ffffff",
              columns: 1,
              headingSize: 62,
            }),
            items: [
              noImage("food-prices", "Read summary", "Coursework feature."),
            ],
          },
        ),
        section(
          colourblock,
          "working",
          "skills",
          "Working style",
          "Ask useful questions. · Make the reasoning clear. · Keep the details organised.",
          { layout: "list", style: style(colourblock, { columns: 1 }) },
        ),
        section(
          colourblock,
          "beyond",
          "interests",
          "Beyond the degree",
          "Debating Society · Running · Volunteering at a local food bank.",
          {
            layout: "columns",
            style: style(colourblock, {
              background: colourblock.surface,
              columns: 1,
            }),
          },
        ),
        section(
          colourblock,
          "contact",
          "contact",
          "Get in touch.",
          "zara.ahmed@example.com · LinkedIn · Download CV",
          {
            layout: "centered",
            style: style(colourblock, {
              background: colourblock.color,
              color: "#ffffff",
              accent: "#ffffff",
              columns: 1,
            }),
          },
        ),
      ],
      namedProfile(
        "Zara Ahmed",
        "Economics student",
        "Interested in the decisions that shape everyday life.",
      ),
    ),
  },
];

export const templates: PortfolioTemplate[] = newTenTemplates;
const allTemplates: PortfolioTemplate[] = [
  ...legacyTemplates,
  ...newTenTemplates,
];

export function getTemplate(id: string): PortfolioTemplate {
  return (
    allTemplates.find((candidate) => candidate.id === id) ?? legacyTemplates[0]
  );
}

export function createFromTemplate(
  id: string,
  profileOverride: Partial<PortfolioDocument["profile"]> = {},
): PortfolioDocument {
  const cloned = JSON.parse(
    JSON.stringify(getTemplate(id).document),
  ) as PortfolioDocument;
  const mergedProfile = {
    ...cloned.profile,
    ...profileOverride,
    links: profileOverride.links ?? cloned.profile.links,
  };
  cloned.profile = mergedProfile;
  cloned.name = profileOverride.name
    ? profileOverride.name + "’s portfolio"
    : cloned.name;
  cloned.seo = {
    title: mergedProfile.name + " — " + mergedProfile.headline,
    description: mergedProfile.bio,
  };
  return cloned;
}

export function blankPortfolio(
  profileOverride: Partial<PortfolioDocument["profile"]> = {},
): PortfolioDocument {
  const base = createFromTemplate("cobalt", profileOverride);
  return {
    ...base,
    name: profileOverride.name
      ? profileOverride.name + "’s portfolio"
      : "Untitled portfolio",
    templateId: "blank",
    sections: [
      section(
        cobalt,
        "hero",
        "hero",
        "Your headline goes here.",
        profileOverride.bio ||
          "Tell people what you care about and what you are learning.",
        {
          subtitle: profileOverride.name || "Your name",
          layout: "centered",
          style: style(cobalt, {
            background: "#ffffff",
            color: "#171717",
            accent: "#ff4a00",
            paddingTop: 128,
            paddingBottom: 128,
            textAlign: "center",
            columns: 1,
            headingSize: 76,
          }),
        },
      ),
      section(
        cobalt,
        "work",
        "projects",
        "Selected work",
        "Add a project, case study or experience you are proud of.",
        {
          layout: "grid",
          style: style(cobalt, {
            background: "#fafaf8",
            color: "#171717",
            columns: 2,
          }),
        },
      ),
      section(
        cobalt,
        "about",
        "about",
        "About you",
        "Add a short introduction in your own words.",
        {
          layout: "columns",
          style: style(cobalt, {
            background: "#ffffff",
            color: "#171717",
            columns: 2,
          }),
        },
      ),
      section(
        cobalt,
        "contact",
        "contact",
        "Let’s connect.",
        "Add an email or link so people can find you.",
        {
          buttonLabel: "Get in touch",
          layout: "centered",
          style: style(cobalt, {
            background: "#171717",
            color: "#ffffff",
            accent: "#ff4a00",
            textAlign: "center",
          }),
        },
      ),
    ],
  };
}
