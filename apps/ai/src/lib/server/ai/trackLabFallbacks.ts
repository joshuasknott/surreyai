const GOAL_OUTPUTS: Record<string, string[]> = {
  "plan-event": [
    "Scope: social mixer, 50\u201380 students, \u00A3200 budget, 3 weeks",
    "3 venues found. Similar events: 65 avg attendance. 2 caterers quoted",
    "Wk 1: book venue + poster \u2192 Wk 2: promote \u2192 Wk 3: finalise + run",
    "Poster done. Campaign scheduled. Venue booked. RSVP form live",
    "On schedule. Budget OK. Added day-5 nudge for low RSVP risk",
    "Plan packaged with timeline visual. Ready for committee approval",
  ],
  research: [
    "Topic scoped. Key question identified. Information gaps mapped",
    "12 sources found: 4 papers, 3 blogs, 5 docs. Ranked by relevance",
    "Structure: intro \u2192 findings \u2192 analysis \u2192 conclusion. Sources prioritised",
    "Draft compiled with 8 citations. Counterarguments addressed",
    "3 claims fact-checked. 2 arguments strengthened. Context gaps filled",
    "Summary polished. Key insights highlighted. Ready to share",
  ],
  build: [
    "Scope: web component. Core feature mapped. Constraints noted",
    "3 frameworks evaluated. Existing solutions analysed. Architecture planned",
    "Modular design chosen. Tech stack set. Build phases defined",
    "Core module shipped. API wired. UI rendered. Tests green",
    "Perf benchmarked. 2 edge cases fixed. A11y audit passed",
    "Demo ready. Docs written. Staged. Ready for showcase",
  ],
  organise: [
    "47 notes scanned. 4 topics, 12 sub-topics. 3 priority areas",
    "Tag taxonomy designed. Cross-refs mapped. Orphans flagged",
    "Folders: topic-based. Tags: hierarchical. Flow: capture \u2192 process \u2192 archive",
    "All 47 notes sorted. Tags applied. Cross-references linked",
    "12 re-categorised. 3 duplicates merged. Dead links pruned",
    "Notebook exported. Quick-ref guide generated. Search indexed",
  ],
  launch: [
    "Team 4\u20136. Project: AI tool. Timeline: 8 weeks. 4 skill areas",
    "4 candidates matched. 3 past projects studied. Roles templated",
    "Roles assigned. Sprints planned. Channels opened. Kick-off drafted",
    "Repo created. Board configured. Docs written. Sprint 1 queued",
    "Alignment confirmed. Dependencies mapped. Risk register live",
    "Charter signed. Roadmap visualised. Kick-off scheduled",
  ],
};

const GENERIC_OUTPUTS: string[] = [
  "Goal decomposed. Key requirements surfaced. Constraints noted",
  "Background research complete. 5 relevant sources catalogued",
  "Action plan: 4 phases, clear milestones, dependencies mapped",
  "Core deliverables produced. Components assembled and verified",
  "Output reviewed against spec. 2 refinements applied",
  "Package finalised. Results documented. Ready for delivery",
];

const SPRINT_STAGES: Record<string, string[]> = {
  campus: [
    "An AI-powered helper that answers student questions about campus services and facilities",
    "Assembled a 3-person squad \u2014 designer, backend developer, and content strategist",
    "Working chat interface connected to a campus knowledge base with natural language queries",
    "Presented live to 30 students at the society meetup \u2014 answered real questions in real time",
    "Published to the society website, now helping students navigate campus every day",
  ],
  study: [
    "Smart flashcard generator that transforms lecture notes into interactive study decks",
    "Formed a 4-person crew \u2014 ML engineer, full-stack dev, UX designer, and QA tester",
    "Web app that parses PDFs, extracts key concepts, and generates spaced-repetition flashcards",
    "Presented to faculty and students \u2014 processed a real Machine Learning lecture live",
    "Open-sourced the project \u2014 adopted by students across multiple modules",
  ],
  creative: [
    "A collaborative art tool where students and AI co-create original visual compositions",
    "Gathered a 3-person collective \u2014 creative coder, digital artist, and interaction designer",
    "Canvas-based app with style transfer, generative patterns, and real-time collaboration",
    "Interactive gallery at the end-of-semester exhibition \u2014 200 visitors tried it",
    "Featured in the university\u2019s digital arts showcase alongside professional work",
  ],
  vision: [
    "A real-time object recognition app to improve accessibility and navigation on campus",
    "Recruited a 4-person team \u2014 CV specialist, mobile dev, accessibility lead, and tester",
    "Camera-based app that identifies and describes objects and text in the surroundings",
    "Live demo with student volunteers testing real-world recognition accuracy on campus",
    "Submitted to the university\u2019s accessibility innovation challenge and won recognition",
  ],
  automation: [
    "An automated system to handle the entire lifecycle of society events from planning to feedback",
    "Built a 3-person ops team \u2014 automation dev, event planner, and integrations specialist",
    "Automated pipeline: RSVP collection, reminder scheduling, attendance tracking, and feedback forms",
    "Ran a real society event end-to-end through the system \u2014 80 attendees, zero manual overhead",
    "Adopted by three other societies for their own event management workflows",
  ],
  ethics: [
    "A platform that presents AI ethics dilemmas with structured frameworks for debate and analysis",
    "Convened a 4-person panel \u2014 ethicist, full-stack dev, UX researcher, and content lead",
    "Web app with timed debate rounds, argument mapping, stakeholder analysis, and scoring rubrics",
    "Hosted a live debate night with 40 participants tackling real AI ethics case studies",
    "Integrated into the society\u2019s regular ethics workshop series as a permanent tool",
  ],
};

function hashStr(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) & 0x7fffffff;
  }
  return h;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pick<T>(arr: T[], h: number, offset: number): T {
  return arr[((h >>> 0) + (offset || 0)) % arr.length];
}

const SUFFIXES = [
  "Flow","Pulse","Hub","Scout","Sync","Lens","Forge","Spark","Wave","Kit",
  "Base","Loop","Mind","Craft","Sense","Dash","Stack","Nest","Graph","Arc",
];

const ADJS = [
  "Smart","Adaptive","Intelligent","Seamless","Intuitive","Dynamic",
  "Personalized","Predictive","Elegant","Context-aware","Proactive",
  "Responsive","Effortless","Precise","Collaborative",
];

const VERBS = [
  "analyzes","suggests","adapts to","discovers","predicts","optimizes",
  "personalizes","curates","matches","maps","tracks","generates",
  "connects","learns","surfaces","orchestrates",
];

const NOUNS = [
  "patterns","insights","preferences","trends","habits","goals",
  "routines","connections","progress","behaviors","needs","workflow",
  "context","environment","signals","choices",
];

const BENEFITS = [
  "save time","stay focused","make better decisions","build consistency",
  "reduce friction","gain clarity","stay organized","discover opportunities",
  "build momentum","improve outcomes","work smarter","learn faster",
];

const AUDIENCES = [
  "Students balancing busy schedules",
  "Professionals optimizing productivity",
  "Creators seeking inspiration",
  "Teams collaborating on projects",
  "Researchers exploring new territory",
  "Beginners learning new skills",
  "Hobbyists pursuing their passions",
  "Entrepreneurs building products",
];

const TECH_TAGS = [
  "ML","UX","Data","Mobile","API","Cloud","Real-time","Personal",
  "Analytics","IoT","Responsive","Adaptive","NLP","Automation",
];

const STOP = new Set([
  "a","an","the","that","this","is","are","was","were","it","its","for","to","of",
  "in","on","at","by","with","from","and","or","but","not","your","my","our","their",
  "what","which","who","how","can","will","do","does","did","has","have","had","be",
  "been","am","i","you","he","she","we","they","me","him","her","us","them","up",
  "down","out","into","about","some","any","all","each","every","both","few","more",
  "most","other","than","too","very","just","also","then","so","if","when","while",
  "where","here","there","like","help","make","need","want","use","get","new","own",
]);

function keywords(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function remixSharpen(input: string, kw: string[], h: number) {
  const main = kw[0] || "idea";
  const title = cap(main) + pick(SUFFIXES, h, 0);
  const adj = pick(ADJS, h, 1);
  const verb = pick(VERBS, h, 2);
  const noun = pick(NOUNS, h, 3);
  const tagline = `${adj} system that ${verb} your ${noun}`;
  const features = [
    `${pick(VERBS, h, 4)} ${pick(NOUNS, h, 5)} to ${pick(BENEFITS, h, 6)}`,
    `${cap(pick(VERBS, h, 7).replace(/s$/, ""))}s ${pick(NOUNS, h, 8)} with minimal user input`,
    `${pick(ADJS, h, 9)} ${pick(NOUNS, h, 10)} that evolves over time`,
  ];
  const audience = pick(AUDIENCES, h, 11);
  const tags = [pick(TECH_TAGS, h, 12), pick(TECH_TAGS, h, 13), pick(TECH_TAGS, h, 14)];
  return { badge: "Refined Concept", title, tagline, sections: [{ label: "Key Features", items: features }, { label: "Target", text: audience }], tags };
}

function remixVisual(input: string, h: number) {
  const COLORS = [
    { name: "Slate Blue", hex: "#64748B" }, { name: "Soft Lavender", hex: "#C4B5FD" },
    { name: "Mint Cream", hex: "#D1FAE5" }, { name: "Deep Teal", hex: "#0D9488" },
    { name: "Warm Amber", hex: "#F59E0B" }, { name: "Off-White", hex: "#F1F5F9" },
  ];
  const kw = keywords(input);
  const main = kw[0] || "idea";
  const title = cap(main) + " \u2014 Visual Direction";
  const ci = (h + 1) % (COLORS.length - 2);
  const palette = [COLORS[ci], COLORS[ci + 1], COLORS[ci + 2]];
  const MOODS = ["Calm & Minimalist","Bold & Energetic","Clean & Professional","Warm & Friendly","Dark & Sophisticated"];
  const TYPO = ["Clean Sans-serif","Modern Geometric Sans","Friendly Rounded Sans","Elegant Serif","Technical Monospace"];
  const ELEMS = ["Card-based dashboard","Timeline view","Interactive map","Split-panel workspace","Feed-style list"];
  return {
    badge: "Visual Concept", title,
    sections: [
      { label: "Mood", text: pick(MOODS, h, 0) },
      { label: "Palette", swatches: palette },
      { label: "Typography", text: pick(TYPO, h, 3) },
      { label: "Key Elements", items: [pick(ELEMS, h, 4), pick(ELEMS, h, 5)] },
    ],
  };
}

function remixProject(input: string, h: number) {
  const kw = keywords(input);
  const main = kw[0] || "idea";
  const PHASES = [
    ["Understand users","Sketch core flows","Build working prototype","Ship & iterate"],
    ["Research landscape","Define key features","Develop MVP","Gather feedback"],
  ];
  const STACKS = [["React","Node.js","SQLite"],["Next.js","Python","PostgreSQL"],["Vue","Firebase","Tailwind"]];
  const TIMELINES = ["2\u20133 weeks","3\u20134 weeks","4\u20136 weeks","1\u20132 weeks"];
  const LABELS = ["Research","Design","Build","Launch"];
  const projectName = cap(main) + pick(SUFFIXES, h, 0);
  const phases = pick(PHASES, h, 1).map((p, i) => `${LABELS[i]} \u2014 ${p}`);
  return {
    badge: "Project Brief",
    title: projectName + " \u2014 Project Brief",
    tagline: `Estimated timeline: ${pick(TIMELINES, h, 3)}`,
    sections: [
      { label: "Phases", items: phases },
      { label: "Stack", stackTags: pick(STACKS, h, 2) },
    ],
  };
}

function remixBeginner(input: string, h: number) {
  const kw = keywords(input);
  const main = kw[0] || "idea";
  const ANALOGIES = [
    "a helpful librarian who knows exactly what you need",
    "a fitness tracker, but for your goals and ideas",
    "a GPS that navigates complex decisions",
    "a smart notebook that organizes itself",
  ];
  const STEPS = [
    ["Start with one simple feature","Test it with a real person","Iterate based on what you learn"],
    ["Write down your core idea in one sentence","Sketch the main screen","Build just that one thing"],
  ];
  const LEARNINGS = [
    "How to break complex problems into manageable pieces",
    "The basics of user-centered design thinking",
    "How to iterate quickly and learn from feedback",
  ];
  const BTAGS = ["No-Code","Templates","Guided","Step-by-step","Visual","Interactive"];
  const diff = (h % 3) + 1;
  const labels = ["Beginner","Intermediate","Advanced"];
  return {
    badge: "Simplified",
    title: cap(main) + " \u2014 Simplified",
    sections: [
      { label: "In Simple Terms", text: `${cap(main)} made simple and approachable for anyone starting out.` },
      { label: "Think of it like\u2026", text: `Think of it like ${pick(ANALOGIES, h, 0)}.` },
      { label: "Getting Started", items: pick(STEPS, h, 1).map((s, i) => `${i + 1}. ${s}`) },
      { label: "You\u2019ll Learn", text: pick(LEARNINGS, h, 2) },
      { label: "Level", level: { filled: diff, total: 3, label: labels[diff - 1] } },
    ],
    tags: [pick(BTAGS, h, 3), pick(BTAGS, h, 4), pick(BTAGS, h, 5)],
  };
}

export function getTaskRelayFallback(goal: string, stage: number): string {
  if (goal === "custom") return GENERIC_OUTPUTS[stage] || "";
  const bank = GOAL_OUTPUTS[goal];
  if (bank) return bank[stage] || "";
  return GENERIC_OUTPUTS[stage] || "";
}

export function getBuildSprintFallback(theme: string, stage: number): { description: string } {
  const stages = SPRINT_STAGES[theme];
  return { description: stages ? stages[stage] || "" : "" };
}

export function getRemixStudioFallback(input: string, mode: string): Record<string, unknown> {
  const h = hashStr(input + mode);
  const kw = keywords(input);
  switch (mode) {
    case "visual": return remixVisual(input, h);
    case "project": return remixProject(input, h);
    case "beginner": return remixBeginner(input, h);
    default: return remixSharpen(input, kw, h);
  }
}
