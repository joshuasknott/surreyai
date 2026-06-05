export type AssistantSocietyKey = "ai" | "business" | "neurotech";

export type AssistantSocietyConfig = {
  societyKey: AssistantSocietyKey;
  societyName: string;
  shortName: string;
  shortDescription: string;
  tone: string;
  starterPrompts: string[];
  allowedTopics: string[];
  primaryCategories: string[];
  fallbackLinks: Array<{ label: string; href: string }>;
  brand: {
    accent: string;
    accentText: string;
    surface: string;
    text: string;
    mutedText: string;
    border: string;
  };
};

export const ASSISTANT_CONFIGS: Record<AssistantSocietyKey, AssistantSocietyConfig> = {
  ai: {
    societyKey: "ai",
    societyName: "Surrey Artificial Intelligence and Data Science Society",
    shortName: "Surrey AI and DS",
    shortDescription:
      "A student-led community for learning, building, and discussing artificial intelligence and data science at the University of Surrey.",
    tone: "clear, practical, beginner-friendly, responsible, and curious",
    starterPrompts: [
      "What is Surrey AI and DS about?",
      "What events are coming up?",
      "I am new to AI. Where should I start?",
      "How can I get involved in projects?",
    ],
    allowedTopics: ["AI learning", "student projects", "events", "committee", "responsible AI"],
    primaryCategories: ["Workshops", "Projects", "Build nights", "Ethics", "Careers"],
    fallbackLinks: [
      { label: "Join", href: "/join" },
      { label: "Events", href: "/events" },
      { label: "Committee", href: "/committee" },
    ],
    brand: {
      accent: "#4F46E5",
      accentText: "#FFFFFF",
      surface: "#FFFFFF",
      text: "#0F172A",
      mutedText: "#475569",
      border: "#E2E8F0",
    },
  },
  business: {
    societyKey: "business",
    societyName: "Surrey Business Society",
    shortName: "Business Society",
    shortDescription:
      "A student-led professional network for careers, enterprise, commercial awareness, networking, and practical workplace skills.",
    tone: "professional, concise, supportive, commercially aware, and accessible",
    starterPrompts: [
      "What is Surrey Business Society about?",
      "What events are coming up?",
      "How can I get involved?",
      "I am interested in startups. Where should I start?",
    ],
    allowedTopics: ["careers", "enterprise", "startups", "networking", "events", "committee"],
    primaryCategories: ["Careers", "Enterprise", "Networking", "Skills", "Commercial awareness"],
    fallbackLinks: [
      { label: "Join", href: "/join" },
      { label: "Events", href: "/events" },
      { label: "Committee", href: "/committee" },
    ],
    brand: {
      accent: "#C9A84C",
      accentText: "#0F172A",
      surface: "#FFFFFF",
      text: "#0F172A",
      mutedText: "#475569",
      border: "#DDD9D1",
    },
  },
  neurotech: {
    societyKey: "neurotech",
    societyName: "Surrey Neurotech Society",
    shortName: "Neurotech Society",
    shortDescription:
      "A student-led society exploring neuroscience, brain-computer interfaces, signal processing, AI, ethics, and human-centred innovation.",
    tone: "friendly, accessible, thoughtful, technically grounded, and ethics-aware",
    starterPrompts: [
      "What is Surrey Neurotech Society about?",
      "What events are coming up?",
      "I am new to neurotech. Where should I start?",
      "What projects or topics can I explore?",
    ],
    allowedTopics: ["neurotechnology", "BCIs", "neuroscience basics", "signal processing", "ethics"],
    primaryCategories: ["Neuroscience", "Brain-computer interfaces", "AI", "Ethics", "Projects"],
    fallbackLinks: [
      { label: "Join", href: "/join" },
      { label: "Events", href: "/events" },
      { label: "Committee", href: "/committee" },
    ],
    brand: {
      accent: "#E5C158",
      accentText: "#040A18",
      surface: "#0A142C",
      text: "#FAFAFA",
      mutedText: "#94A3B8",
      border: "#1E2E4E",
    },
  },
};
