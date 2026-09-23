export type AssistantSocietyKey = "ai" | "business" | "neurotech";

export type AssistantSocietyConfig = {
  societyKey: AssistantSocietyKey;
  societyName: string;
  shortName: string;
  shortDescription: string;
  tone: string;
  greeting: string;
  intro: string;
  starterPrompts: Array<{ label: string; prompt: string }>;
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
    societyName: "Surrey Artificial Intelligence Society",
    shortName: "Surrey Artificial Intelligence Society",
    shortDescription:
      "Ask about joining, upcoming activities, beginner workshops, projects, careers or responsible AI at Surrey.",
    tone: "clear, practical, beginner-friendly, responsible, and curious",
    greeting: "How can I help?",
    intro: "Ask about our society, people, or community.",
    starterPrompts: [
      { label: "About the society", prompt: "What is the AI Society about?" },
      { label: "Our socials", prompt: "Where can I find the AI Society on social media?" },
      { label: "Who leads us?", prompt: "Who leads the AI Society?" },
    ],
    allowedTopics: ["artificial intelligence learning", "events", "committee", "responsible artificial intelligence"],
    primaryCategories: ["Workshops", "Build nights", "Ethics", "Careers"],
    fallbackLinks: [
      { label: "Activities", href: "/#activities" },
      { label: "Committee", href: "/#committee" },
      { label: "Join", href: "/#join" },
    ],
    brand: {
      accent: "#FF4A00",
      accentText: "#111111",
      surface: "#FAF8F3",
      text: "#111111",
      mutedText: "#5B5752",
      border: "#DED8CE",
    },
  },
  business: {
    societyKey: "business",
    societyName: "Surrey Business Society",
    shortName: "Business Society",
    shortDescription:
      "A student-led professional network for careers, enterprise, commercial awareness, networking, and practical workplace skills.",
    tone: "professional, concise, supportive, commercially aware, and accessible",
    greeting: "How can we help?",
    intro: "Explore the people and purpose behind our society.",
    starterPrompts: [
      { label: "About the society", prompt: "What is Surrey Business Society about?" },
      { label: "Find our socials", prompt: "Where are Surrey Business Society's social media links?" },
      { label: "Meet the committee", prompt: "Who leads Surrey Business Society?" },
    ],
    allowedTopics: ["careers", "enterprise", "startups", "networking", "events", "committee"],
    primaryCategories: ["Careers", "Enterprise", "Networking", "Skills", "Commercial awareness"],
    fallbackLinks: [
      { label: "About", href: "/#about" },
      { label: "Activities", href: "/#activities" },
      { label: "Join", href: "/#join" },
    ],
    brand: {
      accent: "#D7A845",
      accentText: "#0F172A",
      surface: "#FFFCF6",
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
      "A student-led society exploring neuroscience, brain-computer interfaces, signal processing, artificial intelligence, ethics, and human-centred innovation.",
    tone: "friendly, accessible, thoughtful, technically grounded, and ethics-aware",
    greeting: "How can we help?",
    intro: "Meet the society, its community, and its leaders.",
    starterPrompts: [
      { label: "About neurotech", prompt: "What is Surrey Neurotech Society about?" },
      { label: "Our socials", prompt: "Where can I find Surrey Neurotech Society on social media?" },
      { label: "Who leads us?", prompt: "Who leads Surrey Neurotech Society?" },
    ],
    allowedTopics: ["neurotechnology", "BCIs", "neuroscience basics", "signal processing", "ethics"],
    primaryCategories: ["Neuroscience", "Brain-computer interfaces", "Artificial intelligence", "Ethics"],
    fallbackLinks: [
      { label: "About", href: "/#about" },
      { label: "Activities", href: "/#activities" },
      { label: "Join", href: "/#join" },
    ],
    brand: {
      accent: "#D4AF37",
      accentText: "#102856",
      surface: "#FFFFFF",
      text: "#0C2549",
      mutedText: "#455974",
      border: "#D7DFE8",
    },
  },
};
