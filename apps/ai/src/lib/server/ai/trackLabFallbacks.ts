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

export type TaskRelayStructuredOutput = {
  stageName: string;
  action: string;
  artifact: string;
  nextStep: string;
  risk: string;
};

export type BuildSprintOutput = {
  description: string;
  backlog?: string[];
  roles?: string[];
  milestones?: string[];
  demoChecklist?: string[];
  risks?: string[];
};

export type MlExplainOutput = {
  title: string;
  summary: string;
  pattern: string;
  examples: string[];
  nextSteps: string[];
  tags: string[];
};

export type CvExplainOutput = {
  label: string;
  confidence: number;
  explanation: string;
  signals: string[];
  limitation: string;
  nextStep: string;
};

export type EthicsDimension =
  | "fairness"
  | "privacy"
  | "accountability"
  | "safety"
  | "bias"
  | "usefulness";

export type EthicsScoreMap = Record<EthicsDimension, number>;

export type EthicsAssessOutput = {
  scenario: string;
  summary: string;
  scores: EthicsScoreMap;
  tradeoffs: string[];
  safeguards: string[];
  discussionQuestion: string;
};

type TaskRelayFallbackOptions = {
  structured?: boolean;
  customGoal?: string;
};

type BuildSprintFallbackOptions = {
  structured?: boolean;
};

const TASK_STAGE_NAMES = ["Understand", "Research", "Plan", "Draft", "Review", "Finalise"];

const GOAL_LABELS: Record<string, string> = {
  "plan-event": "society event plan",
  research: "research topic",
  build: "group project",
  organise: "study notes",
  launch: "project team launch",
};

const SPRINT_STAGE_LABELS = ["Idea", "Team", "Prototype", "Demo", "Showcase"];

const SPRINT_THEME_LABELS: Record<string, string> = {
  campus: "campus assistant",
  study: "revision tool",
  creative: "creative AI tool",
  vision: "computer vision demo",
  automation: "automation helper",
  ethics: "ethics debate tool",
};

const SPRINT_ROLES: Record<string, string[]> = {
  campus: ["UX researcher", "full-stack developer", "campus content lead"],
  study: ["ML engineer", "learning designer", "QA tester"],
  creative: ["creative coder", "digital artist", "interaction designer"],
  vision: ["CV specialist", "mobile developer", "accessibility tester"],
  automation: ["automation developer", "event planner", "integrations lead"],
  ethics: ["ethics facilitator", "full-stack developer", "workshop designer"],
};

const ML_DOMAIN_LABELS: Record<string, string> = {
  creative: "media and arts",
  coding: "software engineering",
  research: "research",
  societies: "student societies",
  business: "business and startups",
  games: "game development",
  design: "UX/UI design",
  science: "natural sciences",
};

const CV_OBJECTS: Record<string, Omit<CvExplainOutput, "confidence">> = {
  whiteboard: {
    label: "Whiteboard",
    explanation: "The detector groups a large bright rectangle with marker-like strokes, then treats the text lines as classroom context.",
    signals: ["rectangular surface", "high contrast writing", "wall-mounted position"],
    limitation: "Glare or faint marker ink can reduce text recognition even when the board itself is detected.",
    nextStep: "Run OCR on the detected board region and summarize the key points.",
  },
  laptop: {
    label: "Laptop",
    explanation: "The detector combines the screen rectangle, keyboard base, and desk placement into a laptop object hypothesis.",
    signals: ["screen aspect ratio", "hinge/base shape", "near-table location"],
    limitation: "Closed laptops or tablets with keyboards can look similar from this angle.",
    nextStep: "Classify whether the screen is active before extracting app context.",
  },
  poster: {
    label: "Poster",
    explanation: "The detector sees a tall flat region with repeated text blocks, matching event-poster layout patterns.",
    signals: ["vertical layout", "stacked text blocks", "wall attachment"],
    limitation: "Small print is hard to read unless the crop is high resolution.",
    nextStep: "Crop the poster area and extract dates, location, and call-to-action text.",
  },
  notebook: {
    label: "Notebook",
    explanation: "The detector uses the small paper-like rectangle and line markings to identify a notebook on the desk.",
    signals: ["paper rectangle", "ruled line texture", "desk-level placement"],
    limitation: "Loose sheets and notebooks may need extra context to separate reliably.",
    nextStep: "Detect handwriting regions and ask for permission before transcription.",
  },
};

const ETHICS_DIMENSIONS: EthicsDimension[] = [
  "fairness",
  "privacy",
  "accountability",
  "safety",
  "bias",
  "usefulness",
];

const ETHICS_SCENARIOS: Record<string, { label: string; summary: string; scores: EthicsScoreMap }> = {
  marking: {
    label: "AI Marking",
    summary: "Automated grading can speed up feedback, but it must prove consistency, appeal routes, and fairness across writing styles.",
    scores: { fairness: 3, privacy: 2, accountability: 3, safety: 1, bias: 3, usefulness: 3 },
  },
  transcription: {
    label: "Lecture Transcription",
    summary: "Real-time captions improve access, but accents, consent, and storage rules need explicit handling.",
    scores: { fairness: 1, privacy: 1, accountability: 1, safety: 1, bias: 2, usefulness: 3 },
  },
  internships: {
    label: "Hiring Internships",
    summary: "AI CV screening can scale shortlisting, but historical hiring data can reproduce bias against students.",
    scores: { fairness: 3, privacy: 3, accountability: 2, safety: 1, bias: 3, usefulness: 2 },
  },
  triage: {
    label: "Healthcare Triage",
    summary: "Clinical triage needs strong safety checks because a wrong priority score can create direct harm.",
    scores: { fairness: 2, privacy: 3, accountability: 3, safety: 3, bias: 2, usefulness: 3 },
  },
  coursework: {
    label: "Creative Coursework",
    summary: "Generative tools can support creativity, but attribution and academic integrity need clear boundaries.",
    scores: { fairness: 2, privacy: 1, accountability: 2, safety: 1, bias: 2, usefulness: 3 },
  },
  safety: {
    label: "Campus Safety",
    summary: "Predictive monitoring may improve response times, but surveillance and profiling risks are high.",
    scores: { fairness: 3, privacy: 3, accountability: 3, safety: 3, bias: 3, usefulness: 2 },
  },
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

function clampIndex(index: number, max: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(max, Math.floor(index)));
}

function cleanText(input: string, fallback: string): string {
  const text = input.replace(/\s+/g, " ").trim();
  return text || fallback;
}

function readableGoal(goal: string, customGoal?: string): string {
  const custom = cleanText(customGoal || "", "");
  if (custom) return custom;
  if (goal !== "custom" && GOAL_LABELS[goal]) return GOAL_LABELS[goal];
  if (goal !== "custom") return cleanText(goal, "student goal");
  return "student goal";
}

function customTaskLine(goalText: string, stage: number): string {
  const h = hashStr(goalText);
  const kw = keywords(goalText);
  const main = kw[0] || "goal";
  const second = kw[1] || pick(["audience", "timeline", "resources", "scope"], h, 1);
  const owner = pick(["student", "team", "society", "project"], h, 2);

  switch (stage) {
    case 0:
      return `Scoped ${main}: outcome, ${second}, constraints, and first deliverable`;
    case 1:
      return `Found examples for ${main}. Strongest signal: ${second} needs clear evidence`;
    case 2:
      return `Plan set: 4 steps, owner ${owner}, milestone focused on ${main}`;
    case 3:
      return `Drafted ${main} artifact with ${second} notes and handoff checklist`;
    case 4:
      return `Reviewed ${main} output. Tightened ${second} and flagged delivery risk`;
    default:
      return `Packaged ${main} workflow with summary, next action, and owner notes`;
  }
}

function getTaskRelayLine(goal: string, stage: number, customGoal?: string): string {
  const stageIndex = clampIndex(stage, TASK_STAGE_NAMES.length - 1);
  const bank = GOAL_OUTPUTS[goal];
  if (bank) return bank[stageIndex] || "";

  const goalText = readableGoal(goal, customGoal);
  if (goalText !== "student goal") return customTaskLine(goalText, stageIndex);

  return GENERIC_OUTPUTS[stageIndex] || "";
}

function getTaskRelayStructuredFallback(
  goal: string,
  stage: number,
  customGoal?: string
): TaskRelayStructuredOutput {
  const stageIndex = clampIndex(stage, TASK_STAGE_NAMES.length - 1);
  const goalText = readableGoal(goal, customGoal);
  const h = hashStr(goalText + stageIndex);
  const kw = keywords(goalText);
  const main = kw[0] || "goal";
  const second = kw[1] || pick(["audience", "timeline", "scope", "evidence"], h, 1);
  const line = getTaskRelayLine(goal, stageIndex, customGoal);
  const artifacts = [
    `${cap(main)} scope note`,
    `${cap(main)} research brief`,
    `${cap(main)} action plan`,
    `${cap(main)} draft artifact`,
    `${cap(main)} review log`,
    `${cap(main)} delivery pack`,
  ];
  const nextSteps = [
    `Gather examples for ${second}`,
    `Turn findings into a staged plan`,
    `Draft the first ${main} deliverable`,
    `Review the artifact against constraints`,
    `Prepare final handoff notes`,
    "Share the package with stakeholders",
  ];
  const risks = [
    `Scope around ${second} may drift`,
    `Evidence for ${main} may be too thin`,
    "Dependencies may be underestimated",
    "Draft may miss one user need",
    "Review may find late edge cases",
    "Handoff may need clearer ownership",
  ];

  return {
    stageName: TASK_STAGE_NAMES[stageIndex],
    action: line,
    artifact: artifacts[stageIndex],
    nextStep: nextSteps[stageIndex],
    risk: risks[stageIndex],
  };
}

function getSprintDescription(theme: string, stage: number): string {
  const stageIndex = clampIndex(stage, SPRINT_STAGE_LABELS.length - 1);
  const stages = SPRINT_STAGES[theme];
  if (stages) return stages[stageIndex] || "";

  const themeText = readableSprintTheme(theme);
  const kw = keywords(themeText);
  const main = kw[0] || "project";
  const h = hashStr(themeText);
  const audience = pick(["students", "societies", "project teams", "new members"], h, 0);

  switch (stageIndex) {
    case 0:
      return `A focused ${main} concept for ${audience}, scoped around one clear user problem`;
    case 1:
      return `Formed a balanced team for ${main}: product, build, design, and testing roles`;
    case 2:
      return `Prototype built for ${main} with the core flow working end to end`;
    case 3:
      return `Demo rehearsed with realistic ${audience} feedback and a clear success metric`;
    default:
      return `${cap(main)} packaged for showcase with lessons learned and next iteration notes`;
  }
}

function readableSprintTheme(theme: string): string {
  return SPRINT_THEME_LABELS[theme] || cleanText(theme, "student project");
}

function getBuildSprintStructuredFallback(theme: string, stage: number): BuildSprintOutput {
  const stageIndex = clampIndex(stage, SPRINT_STAGE_LABELS.length - 1);
  const themeText = readableSprintTheme(theme);
  const h = hashStr(themeText + stageIndex);
  const kw = keywords(themeText);
  const main = kw[0] || "project";
  const roles = SPRINT_ROLES[theme] || [
    `${cap(main)} lead`,
    "prototype developer",
    "user tester",
  ];

  return {
    description: getSprintDescription(theme, stageIndex),
    backlog: [
      `Define the smallest useful ${main} workflow`,
      `Create a clickable prototype for the ${SPRINT_STAGE_LABELS[stageIndex].toLowerCase()} stage`,
      "Collect feedback from at least three students",
      "Document assumptions before the next sprint",
    ],
    roles,
    milestones: [
      `${SPRINT_STAGE_LABELS[stageIndex]} evidence captured`,
      `Prototype decision logged for ${main}`,
      "Demo script drafted with fallback path",
    ],
    demoChecklist: [
      "Open with the user problem",
      "Show the core interaction in under one minute",
      "Explain what AI adds and what remains human-reviewed",
      "Close with the next measurable improvement",
    ],
    risks: [
      pick(["Scope creep", "Weak user evidence", "Integration delay", "Unclear ownership"], h, 0),
      pick(["Demo data may be too perfect", "Accessibility needs another pass", "Feedback sample may be narrow"], h, 1),
    ],
  };
}

function normalizeDomain(domain: string): string {
  return ML_DOMAIN_LABELS[domain] || cleanText(domain, "AI");
}

function scoreFromHash(hash: number, offset: number): number {
  return 72 + ((hash + offset * 11) % 24);
}

function scenarioFromText(scenario: string): { label: string; summary: string; scores: EthicsScoreMap } {
  const key = cleanText(scenario, "student AI scenario").toLowerCase();
  const known = ETHICS_SCENARIOS[key];
  if (known) return known;

  const h = hashStr(key);
  const scores = ETHICS_DIMENSIONS.reduce((acc, dim, index) => {
    acc[dim] = 1 + ((h + index) % 3);
    return acc;
  }, {} as EthicsScoreMap);

  return {
    label: cap(keywords(key)[0] || "Scenario") + " Assessment",
    summary: `${cleanText(scenario, "This AI scenario")} needs a balanced review of benefits, harms, oversight, and student consent.`,
    scores,
  };
}

function mergeEthicsScores(
  base: EthicsScoreMap,
  overrides?: Partial<Record<EthicsDimension, number>>
): EthicsScoreMap {
  return ETHICS_DIMENSIONS.reduce((acc, dim) => {
    const value = overrides?.[dim];
    acc[dim] = typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, Math.min(3, Math.round(value)))
      : base[dim];
    return acc;
  }, {} as EthicsScoreMap);
}

export function getTaskRelayFallback(goal: string, stage: number): string;
export function getTaskRelayFallback(
  goal: string,
  stage: number,
  options: TaskRelayFallbackOptions & { structured: true }
): TaskRelayStructuredOutput;
export function getTaskRelayFallback(
  goal: string,
  stage: number,
  options: TaskRelayFallbackOptions
): string | TaskRelayStructuredOutput;
export function getTaskRelayFallback(
  goal: string,
  stage: number,
  options: TaskRelayFallbackOptions = {}
): string | TaskRelayStructuredOutput {
  if (options.structured) {
    return getTaskRelayStructuredFallback(goal, stage, options.customGoal);
  }

  return getTaskRelayLine(goal, stage, options.customGoal);
}

export function getBuildSprintFallback(
  theme: string,
  stage: number,
  options: BuildSprintFallbackOptions = {}
): BuildSprintOutput {
  if (options.structured) return getBuildSprintStructuredFallback(theme, stage);
  return { description: getSprintDescription(theme, stage) };
}

export function getMlExplainFallback(input: string, domains: string[] = []): MlExplainOutput {
  const topic = cleanText(input || domains.join(" "), "machine learning use case");
  const h = hashStr(topic + domains.join(","));
  const kw = keywords(topic);
  const main = kw[0] || "pattern";
  const domainLabels = domains.length > 0 ? domains.map(normalizeDomain) : [pick(Object.values(ML_DOMAIN_LABELS), h, 0)];
  const tagSource = [...domainLabels, "classification", "features", "prototype"];

  return {
    title: `${cap(main)} Pattern Finder`,
    summary: `Machine learning can compare examples in ${domainLabels.join(" and ")} to spot repeatable signals, then turn those signals into a prediction or recommendation.`,
    pattern: `Start with labelled examples, extract features around ${main}, train a small model, then test it on cases the model has not seen before.`,
    examples: [
      `Cluster similar ${main} examples before deciding categories`,
      `Rank the strongest signals for ${domainLabels[0]}`,
      "Keep a human review step for uncertain predictions",
    ],
    nextSteps: [
      "Collect 20 representative examples",
      "Write down the target label before training",
      "Compare model output against a simple rules baseline",
    ],
    tags: tagSource.slice(0, 4).map((tag) => cap(tag.split(" ")[0])),
  };
}

export function getCvExplainFallback(target: string): CvExplainOutput {
  const key = cleanText(target, "object").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const known = CV_OBJECTS[key];
  const h = hashStr(key);

  if (known) {
    return { ...known, confidence: scoreFromHash(h, 0) };
  }

  const label = cap(keywords(target)[0] || "Object");
  return {
    label,
    confidence: scoreFromHash(h, 1),
    explanation: `The vision model would look for shape, texture, position, and nearby context before labelling this as ${label.toLowerCase()}.`,
    signals: [
      pick(["outline shape", "surface texture", "text regions", "object scale"], h, 0),
      pick(["scene position", "contrast boundary", "repeated pattern", "nearby objects"], h, 1),
      pick(["edge density", "aspect ratio", "colour grouping", "shadow cues"], h, 2),
    ],
    limitation: "Confidence can drop when lighting, occlusion, or unusual viewing angles hide the strongest signals.",
    nextStep: "Ask for a second frame or crop the region before taking action.",
  };
}

export function getEthicsAssessFallback(
  scenario: string,
  scores?: Partial<Record<EthicsDimension, number>>
): EthicsAssessOutput {
  const base = scenarioFromText(scenario);
  const mergedScores = mergeEthicsScores(base.scores, scores);
  const ranked = [...ETHICS_DIMENSIONS].sort((a, b) => mergedScores[b] - mergedScores[a]);
  const top = ranked[0];
  const second = ranked[1];

  return {
    scenario: base.label,
    summary: base.summary,
    scores: mergedScores,
    tradeoffs: [
      `${cap(top)} is the highest-pressure dimension and needs explicit evidence before launch.`,
      `${cap(second)} should be reviewed with affected students, not just the delivery team.`,
      "Benefits should be measured alongside harms, appeals, and opt-out paths.",
    ],
    safeguards: [
      `Add a human review checkpoint for ${top}.`,
      "Publish clear data retention and escalation rules.",
      "Test the system with edge cases before using it in a real decision.",
    ],
    discussionQuestion: `Who is accountable if the ${base.label.toLowerCase()} system helps most students but harms a small group?`,
  };
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
