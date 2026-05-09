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
      "Start with the core idea: models learn patterns from examples, then use those patterns to make predictions.",
    bullets: [
      "Train models on real datasets",
      "Understand how algorithms learn",
      "Build your first predictive models",
    ],
    accentColor: "#00A7C7",
    accentRgb: "0, 167, 199",
    icon: "\u25B2",
    societyBullets: [
      "Weekly practical coding sessions",
      "Friendly prediction challenges",
      "Talks from industry experts",
    ],
    prototypeTitle: "Pattern Finder",
    meaning:
      "See how an algorithm naturally groups similar data points together without being told what they are.",
    interactionCue: "Pick this track to see the lab focus on patterns, features, and predictions.",
    aiMode: "Finding Patterns",
  },
  {
    id: "genai",
    title: "Generative AI",
    explanation:
      "Understand systems that turn prompts, context, and examples into text, images, code, and structured ideas.",
    bullets: [
      "Get hands-on with large language models",
      "Learn effective prompt engineering",
      "Discuss the limits of generation",
    ],
    accentColor: "#9B7CFF",
    accentRgb: "155, 124, 255",
    icon: "\u2726",
    societyBullets: [
      "Prompt engineering workshops",
      "Creative showcase events",
      "Hands-on project building",
    ],
    prototypeTitle: "Remix Studio",
    meaning:
      "Watch a simple idea evolve into a detailed result as the AI refines it step by step.",
    interactionCue: "Pick this track to see the lab focus on prompts, refinement, and useful outputs.",
    aiMode: "Creating Content",
  },
  {
    id: "cv",
    title: "Computer Vision",
    explanation:
      "See how models turn pixels into signals: edges, objects, labels, confidence, and decisions.",
    bullets: [
      "Build image recognition projects",
      "Learn about object detection",
      "Explore how self-driving cars \u2018see\u2019",
    ],
    accentColor: "#2AB8FF",
    accentRgb: "42, 184, 255",
    icon: "\u25C9",
    societyBullets: [
      "Camera-based build nights",
      "Interactive visual projects",
      "Computer vision hackathons",
    ],
    prototypeTitle: "Vision Lens",
    meaning:
      "See how a model identifies and labels different parts of an image as it looks around.",
    interactionCue: "Pick this track to see the lab focus on scanning, detection, and visual understanding.",
    aiMode: "Analysing Images",
  },
  {
    id: "ethics",
    title: "AI Ethics",
    explanation:
      "Learn to evaluate AI systems through fairness, privacy, safety, accountability, and social impact.",
    bullets: [
      "Identify bias in AI systems",
      "Debate policy and regulation",
      "Review real-world case studies",
    ],
    accentColor: "#6C8CFF",
    accentRgb: "108, 140, 255",
    icon: "\u2731",
    societyBullets: [
      "Structured discussion groups",
      "Case study workshops",
      "Debates on AI policy",
    ],
    prototypeTitle: "Impact Compass",
    meaning:
      "Explore how focusing on one ethical priority can sometimes affect another.",
    interactionCue: "Pick this track to see the lab focus on tradeoffs, safeguards, and responsible choices.",
    aiMode: "Weighing Choices",
  },
  {
    id: "agents",
    title: "Agents & Automation",
    explanation:
      "Explore AI systems that break goals into steps, use tools, and coordinate work across a workflow.",
    bullets: [
      "Create AI agents that solve problems",
      "Automate complex workflows",
      "Connect different AI tools together",
    ],
    accentColor: "#29D8FF",
    accentRgb: "41, 216, 255",
    icon: "\u26A1",
    societyBullets: [
      "Agent building workshops",
      "Workflow automation sprints",
      "Tool integration challenges",
    ],
    prototypeTitle: "Task Relay",
    meaning:
      "Follow a request as it automatically moves from planning to execution.",
    interactionCue: "Pick this track to see the lab focus on planning, tool use, and workflow handoffs.",
    aiMode: "Automating Workflows",
  },
  {
    id: "projects",
    title: "Projects & Hackathons",
    explanation:
      "Turn your ideas into working software with a team.",
    bullets: [
      "Join collaborative student teams",
      "Compete in society hackathons",
      "Get feedback on your work",
    ],
    accentColor: "#7C5CFF",
    accentRgb: "124, 92, 255",
    icon: "\u2605",
    societyBullets: [
      "Semester-long team projects",
      "Weekend coding hackathons",
      "Demo days to show off your work",
    ],
    prototypeTitle: "Build Sprint",
    meaning:
      "Watch the journey of a project from the initial idea to the final presentation.",
    interactionCue: "Pick this track to see the lab focus on turning an idea into a working demo.",
    aiMode: "Building Together",
  },
];
