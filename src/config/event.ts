export interface EventConfig {
  name: string;
  shortName: string;
  tagline: string;
  subTagline: string;
  academicYear: string;
  edition: string;
  organizer: {
    name: string;
    shortName: string;
    parentBrand: string;
    statusNote: string;
  };
  timing: {
    season: string;
    duration: string;
    academicYear: string;
    status: string;
  };
  venue: {
    preferred: string;
    city: string;
    county: string;
    status: string;
    note: string;
  };
  scale: {
    targetHackersMin: number;
    targetHackersMax: number;
    scope: string;
    status: string;
  };
  namingVariants: {
    id: string;
    title: string;
    description: string;
    suitability: string;
  }[];
  buildPhilosophy: {
    title: string;
    description: string;
    tools: {
      category: string;
      examples: string[];
      note: string;
    }[];
  };
  judgingCriteria: {
    category: string;
    weight: string;
    description: string;
  }[];
  statusModes: {
    current: "pre_launch" | "announced" | "registration_open" | "live" | "archive";
    label: string;
    bannerText: string;
  };
}

export const EVENT_CONFIG: EventConfig = {
  name: "SURREY AI HACK",
  shortName: "SAIH",
  tagline: "The UK National Student AI Hackathon",
  subTagline: "Founded and hosted from Surrey. Built for ambitious student creators nationwide.",
  academicYear: "2026/27",
  edition: "Inaugural National Edition",
  organizer: {
    name: "Surrey Artificial Intelligence Society",
    shortName: "Surrey AI Society",
    parentBrand: "Surrey AI",
    statusNote: "An initiative founded and organised through Surrey Artificial Intelligence Society.",
  },
  timing: {
    season: "Later Academic Year 2026/27",
    duration: "48-Hour Weekend Event",
    academicYear: "2026/27",
    status: "Planning / Pre-Launch (Specific dates to be announced)",
  },
  venue: {
    preferred: "University of Surrey / Stag Hill Campus",
    city: "Guildford",
    county: "Surrey, UK",
    status: "Preferred Host Location (Formal arrangements pending)",
    note: "Positioned to leverage top-tier university facilities while retaining flexibility for prime regional partner venues.",
  },
  scale: {
    targetHackersMin: 300,
    targetHackersMax: 500,
    scope: "National (England, Scotland, Wales, Northern Ireland)",
    status: "Capacity engineered for several hundred active builders",
  },
  namingVariants: [
    {
      id: "surrey-ai-hack",
      title: "Surrey AI Hack",
      description: "Direct, authoritative, clean. Fits naturally into UK hackathon vocabulary alongside flagship national events.",
      suitability: "Recommended Flagship",
    },
    {
      id: "surrey-ai-hackathon",
      title: "Surrey AI Hackathon",
      description: "Traditional and immediately descriptive for academic and university administration stakeholders.",
      suitability: "Institutional Alignment",
    },
    {
      id: "surrey-build",
      title: "SURREY // BUILD",
      description: "Action-oriented, modern AI-native lab feel. Emphasizes production utility over hacky prototypes.",
      suitability: "Builder-Forward",
    },
    {
      id: "hack-surrey-ai",
      title: "Hack Surrey AI",
      description: "Community-led format, active verb phrasing.",
      suitability: "Alternative Community Model",
    },
  ],
  buildPhilosophy: {
    title: "Use Whatever Helps You Ship",
    description: "Modern AI products are not built the way software was built in 2020. We judge the utility, craft, and ambition of what you build—not whether you hand-wrote every line of boilerplate.",
    tools: [
      {
        category: "Autonomous AI Agents",
        examples: ["Claude Code", "Cursor", "Windsurf", "Devin", "Custom ReAct loops"],
        note: "AI agentic pairs are first-class citizens. Ship faster.",
      },
      {
        category: "Foundational & Multimodal Models",
        examples: ["Gemini 2.5/Flash", "Claude 3.7", "OpenAI o3/o4", "DeepSeek", "Llama 3"],
        note: "Direct inference, local models, or proprietary APIs.",
      },
      {
        category: "Visual & Low-Code Platforms",
        examples: ["v0", "Lovable", "Bolt.new", "Supabase Studio", "n8n"],
        note: "A great no-code product beats a broken full-stack repository.",
      },
      {
        category: "Hardware & Physical AI",
        examples: ["Raspberry Pi", "Jetson Orin", "ESP32", "Robotics kits", "Sensors"],
        note: "Robotics and sensory computing are actively celebrated.",
      },
      {
        category: "Traditional Core Engineering",
        examples: ["Rust", "Python", "TypeScript", "C++", "PyTorch"],
        note: "Deep algorithmic infrastructure and model architectures welcome.",
      },
    ],
  },
  judgingCriteria: [
    {
      category: "Originality & Vision",
      weight: "25%",
      description: "Is this a fresh perspective or solving an under-addressed problem? Novel framing stands out.",
    },
    {
      category: "Product Thinking & Polish",
      weight: "25%",
      description: "How cohesive and thoughtful is the user experience? Does it solve real human friction?",
    },
    {
      category: "Technical Ambition & AI Execution",
      weight: "25%",
      description: "Effective utilization of modern AI capabilities, agent workflows, or algorithmic depth.",
    },
    {
      category: "Live Demonstration Craft",
      weight: "25%",
      description: "A working, demonstrable artifact on the expo floor and final stage. No pitch-deck-only vaporware.",
    },
  ],
  statusModes: {
    current: "pre_launch",
    label: "Concept & Pre-Launch Phase",
    bannerText: "Pre-Launch Status: Event concept in development for 2026/27. Dates, venue & partner confirmations will open soon.",
  },
};
