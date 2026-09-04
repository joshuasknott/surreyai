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
  logo: {
    src: string;
    alt: string;
  };
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
    starterPrompts: [
      "What is Surrey Artificial Intelligence Society about?",
      "What events are coming up?",
      "I am new to artificial intelligence. Where should I start?",
      "How can I get involved?",
    ],
    allowedTopics: ["artificial intelligence learning", "events", "committee", "responsible artificial intelligence"],
    primaryCategories: ["Workshops", "Build nights", "Ethics", "Careers"],
    fallbackLinks: [
      { label: "About", href: "/#about" },
      { label: "Projects", href: "/#projects" },
      { label: "Join", href: "/#join" },
    ],
    logo: {
      src: "/icons/assistant/surrey-ai-terminal-bot.png",
      alt: "Surrey Artificial Intelligence Society",
    },
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
    starterPrompts: [
      "What is Surrey Business Society about?",
      "What events are coming up?",
      "How can I get involved?",
      "I am interested in startups. Where should I start?",
    ],
    allowedTopics: ["careers", "enterprise", "startups", "networking", "events", "committee"],
    primaryCategories: ["Careers", "Enterprise", "Networking", "Skills", "Commercial awareness"],
    fallbackLinks: [
      { label: "About", href: "/#about" },
      { label: "Activities", href: "/#activities" },
      { label: "Join", href: "/#join" },
    ],
    logo: {
      src: "/icons/assistant/business-headset-stag.png",
      alt: "Surrey Business Society headset stag assistant",
    },
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
      "A student-led society exploring neuroscience, brain-computer interfaces, signal processing, artificial intelligence, ethics, and human-centred innovation.",
    tone: "friendly, accessible, thoughtful, technically grounded, and ethics-aware",
    starterPrompts: [
      "What is Surrey Neurotech Society about?",
      "What events are coming up?",
      "I am new to neurotech. Where should I start?",
      "What topics can I explore?",
    ],
    allowedTopics: ["neurotechnology", "BCIs", "neuroscience basics", "signal processing", "ethics"],
    primaryCategories: ["Neuroscience", "Brain-computer interfaces", "Artificial intelligence", "Ethics"],
    fallbackLinks: [
      { label: "What we do", href: "/#activities" },
      { label: "Updates", href: "/#updates" },
      { label: "Join", href: "/#join" },
    ],
    logo: {
      src: "/icons/assistant/neurotech-eeg-sensor-pod.png",
      alt: "Surrey Neurotech Society EEG sensor assistant",
    },
    brand: {
      accent: "#FFCB05",
      accentText: "#082F2A",
      surface: "#FFFDF8",
      text: "#082F2A",
      mutedText: "#5D625A",
      border: "#D8D2C7",
    },
  },
};
