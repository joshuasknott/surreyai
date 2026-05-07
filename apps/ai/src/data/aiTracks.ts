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
      "Learn how computers find patterns in data to make predictions.",
    bullets: [
      "Train models on real datasets",
      "Understand how algorithms learn",
      "Build your first predictive models",
    ],
    accentColor: "#06B6D4",
    accentRgb: "6, 182, 212",
    icon: "\u25B2",
    societyBullets: [
      "Weekly practical coding sessions",
      "Friendly prediction challenges",
      "Talks from industry experts",
    ],
    prototypeTitle: "Pattern Finder",
    meaning:
      "See how an algorithm naturally groups similar data points together without being told what they are.",
    interactionCue: "Select or hover over clusters to see their labels",
    aiMode: "Finding Patterns",
  },
  {
    id: "genai",
    title: "Generative AI",
    explanation:
      "Explore AI that generates text, images, code, and ideas.",
    bullets: [
      "Get hands-on with large language models",
      "Learn effective prompt engineering",
      "Discuss the limits of generation",
    ],
    accentColor: "#A78BFA",
    accentRgb: "167, 139, 250",
    icon: "\u2726",
    societyBullets: [
      "Prompt engineering workshops",
      "Creative showcase events",
      "Hands-on project building",
    ],
    prototypeTitle: "Remix Studio",
    meaning:
      "Watch a simple idea evolve into a detailed result as the AI refines it step by step.",
    interactionCue: "Activate to try a new random input",
    aiMode: "Creating Content",
  },
  {
    id: "cv",
    title: "Computer Vision",
    explanation:
      "Understand how computers process and interpret images and video.",
    bullets: [
      "Build image recognition projects",
      "Learn about object detection",
      "Explore how self-driving cars \u2018see\u2019",
    ],
    accentColor: "#38BDF8",
    accentRgb: "56, 189, 248",
    icon: "\u25C9",
    societyBullets: [
      "Camera-based build nights",
      "Interactive visual projects",
      "Computer vision hackathons",
    ],
    prototypeTitle: "Vision Lens",
    meaning:
      "See how a model identifies and labels different parts of an image as it looks around.",
    interactionCue: "Use your pointer or keyboard to move the scanning lens",
    aiMode: "Analysing Images",
  },
  {
    id: "ethics",
    title: "AI Ethics",
    explanation:
      "Discuss how AI impacts fairness, privacy, and society.",
    bullets: [
      "Identify bias in AI systems",
      "Debate policy and regulation",
      "Review real-world case studies",
    ],
    accentColor: "#60A5FA",
    accentRgb: "96, 165, 250",
    icon: "\u2731",
    societyBullets: [
      "Structured discussion groups",
      "Case study workshops",
      "Debates on AI policy",
    ],
    prototypeTitle: "Impact Compass",
    meaning:
      "Explore how focusing on one ethical priority can sometimes affect another.",
    interactionCue: "Select a quadrant to increase its importance",
    aiMode: "Weighing Choices",
  },
  {
    id: "agents",
    title: "Agents & Automation",
    explanation:
      "Build AI systems that can plan tasks and use tools automatically.",
    bullets: [
      "Create AI agents that solve problems",
      "Automate complex workflows",
      "Connect different AI tools together",
    ],
    accentColor: "#22D3EE",
    accentRgb: "34, 211, 238",
    icon: "\u26A1",
    societyBullets: [
      "Agent building workshops",
      "Workflow automation sprints",
      "Tool integration challenges",
    ],
    prototypeTitle: "Task Relay",
    meaning:
      "Follow a request as it automatically moves from planning to execution.",
    interactionCue: "Select a stage to interrupt the process and see it adapt",
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
    accentColor: "#8B5CF6",
    accentRgb: "139, 92, 246",
    icon: "\u2605",
    societyBullets: [
      "Semester-long team projects",
      "Weekend coding hackathons",
      "Demo days to show off your work",
    ],
    prototypeTitle: "Build Sprint",
    meaning:
      "Watch the journey of a project from the initial idea to the final presentation.",
    interactionCue: "Select a milestone to update the project's progress",
    aiMode: "Building Together",
  },
];
