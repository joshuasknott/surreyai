export interface AITrack {
  id: string;
  title: string;
  explanation: string;
  bullets: string[];
  accentColor: string;
  accentRgb: string;
  icon: string;
  societyBullets: string[];
  prototypeTitle: string;
  meaning: string;
  interactionCue: string;
  aiMode: string;
}

export const aiTracks: AITrack[] = [
  {
    id: "ml",
    title: "Machine Learning",
    explanation:
      "AI systems that learn patterns from data to make predictions and decisions.",
    bullets: [
      "Train models on real datasets",
      "Explore classification and regression",
      "Understand how algorithms improve with data",
    ],
    accentColor: "#06B6D4",
    accentRgb: "6, 182, 212",
    icon: "\u25B2",
    societyBullets: [
      "Weekly model-building sessions",
      "Peer-reviewed prediction challenges",
      "Guest lectures from ML researchers",
    ],
    prototypeTitle: "Pattern Finder",
    meaning:
      "Watch data points cluster into groups as the algorithm discovers hidden structure.",
    interactionCue: "Hover over clusters to reveal class labels",
    aiMode: "Unsupervised Discovery",
  },
  {
    id: "genai",
    title: "Generative AI",
    explanation:
      "AI that creates new content \u2014 text, images, code, music, and ideas.",
    bullets: [
      "Use large language models hands-on",
      "Generate images and explore prompt design",
      "Discuss creative applications and limits",
    ],
    accentColor: "#A78BFA",
    accentRgb: "167, 139, 250",
    icon: "\u2726",
    societyBullets: [
      "Prompt engineering jam sessions",
      "Creative output critique circles",
      "Cross-modal generation showcases",
    ],
    prototypeTitle: "Remix Studio",
    meaning:
      "Transform a rough idea into polished output as the model iteratively refines quality.",
    interactionCue: "Click to re-randomise the input seed",
    aiMode: "Iterative Refinement",
  },
  {
    id: "cv",
    title: "Computer Vision",
    explanation:
      "AI that understands and interprets visual information from images and video.",
    bullets: [
      "Build image classification projects",
      "Explore object detection and facial analysis",
      "Learn how autonomous systems \u2018see\u2019 the world",
    ],
    accentColor: "#38BDF8",
    accentRgb: "56, 189, 248",
    icon: "\u25C9",
    societyBullets: [
      "Camera-first build nights",
      "Edge-detection visual essays",
      "Autonomous vision hackathons",
    ],
    prototypeTitle: "Vision Lens",
    meaning:
      "See how a neural network scans, segments, and labels regions of an image in real time.",
    interactionCue: "Move your cursor to steer the scanning lens",
    aiMode: "Live Perception",
  },
  {
    id: "ethics",
    title: "AI Ethics",
    explanation:
      "Exploring how AI impacts fairness, privacy, accountability, and society.",
    bullets: [
      "Discuss bias in AI systems",
      "Explore regulation and policy debates",
      "Analyse real-world case studies",
    ],
    accentColor: "#60A5FA",
    accentRgb: "96, 165, 250",
    icon: "\u2731",
    societyBullets: [
      "Structured ethics debates",
      "Policy brief writing workshops",
      "Real-incident post-mortems",
    ],
    prototypeTitle: "Impact Compass",
    meaning:
      "Visualise the tension between competing values \u2014 fairness, privacy, safety, accountability.",
    interactionCue: "Click a quadrant to weigh it higher",
    aiMode: "Value Mapping",
  },
  {
    id: "agents",
    title: "Agents & Automation",
    explanation:
      "AI that plans, reasons, and coordinates multi-step tasks autonomously.",
    bullets: [
      "Build AI agents that use tools",
      "Explore workflow automation",
      "Experiment with multi-agent systems",
    ],
    accentColor: "#22D3EE",
    accentRgb: "34, 211, 238",
    icon: "\u26A1",
    societyBullets: [
      "Agent pipeline workshops",
      "Multi-agent collaboration sprints",
      "Tool-integration hackathons",
    ],
    prototypeTitle: "Task Relay",
    meaning:
      "Follow a task as it passes through research, planning, building, testing, and presenting stages.",
    interactionCue: "Click a stage to inject a delay and watch the relay adapt",
    aiMode: "Sequential Orchestration",
  },
  {
    id: "projects",
    title: "Projects & Hackathons",
    explanation:
      "Turn ideas into working prototypes through team projects and hackathons.",
    bullets: [
      "Join collaborative project teams",
      "Participate in AI hackathons",
      "Present demos and get feedback",
    ],
    accentColor: "#8B5CF6",
    accentRgb: "139, 92, 246",
    icon: "\u2605",
    societyBullets: [
      "Semester-long project cohorts",
      "Inter-society hackathon collabs",
      "Public demo showcases",
    ],
    prototypeTitle: "Build Sprint",
    meaning:
      "Track a project from raw idea to showcase as milestones light up along the pipeline.",
    interactionCue: "Click a milestone to mark it complete",
    aiMode: "Progress Tracking",
  },
];
