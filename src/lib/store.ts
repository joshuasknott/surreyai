import { InterestRegistration, PartnerInquiry, EventPhase } from "./types";

// Seeded realistic starter aggregate data for pre-launch demonstration
export const INITIAL_REGISTRATIONS: InterestRegistration[] = [
  {
    id: "reg-001",
    fullName: "Kiran Patel",
    email: "kiran.p@surrey.ac.uk",
    university: "University of Surrey",
    fieldOfStudy: "Computer Science",
    studyLevel: "undergraduate",
    experienceLevel: "first_timer",
    teamStatus: "individual_looking",
    primaryTooling: "Python & Cursor",
    wantsUpdates: true,
    createdAt: "2026-09-01T10:14:00Z",
  },
  {
    id: "reg-002",
    fullName: "Alex Rivera",
    email: "a.rivera@imperial.ac.uk",
    university: "Imperial College London",
    fieldOfStudy: "Electronic & Information Engineering",
    studyLevel: "undergraduate",
    experienceLevel: "experienced_builder",
    teamStatus: "have_team",
    primaryTooling: "Rust, PyTorch & Gemini API",
    wantsUpdates: true,
    createdAt: "2026-09-01T11:42:00Z",
  },
  {
    id: "reg-003",
    fullName: "Sophia Davies",
    email: "sd912@cam.ac.uk",
    university: "University of Cambridge",
    fieldOfStudy: "Natural Sciences & Computation",
    studyLevel: "postgraduate",
    experienceLevel: "intermediate",
    teamStatus: "individual_looking",
    primaryTooling: "Claude 3.7 & Next.js",
    wantsUpdates: true,
    createdAt: "2026-09-01T14:20:00Z",
  },
  {
    id: "reg-004",
    fullName: "Ebele Okonkwo",
    email: "e.okonkwo@southampton.ac.uk",
    university: "University of Southampton",
    fieldOfStudy: "Robotics & AI",
    studyLevel: "undergraduate",
    experienceLevel: "experienced_builder",
    teamStatus: "have_team",
    primaryTooling: "ROS2 & Jetson",
    wantsUpdates: true,
    createdAt: "2026-09-02T09:15:00Z",
  },
  {
    id: "reg-005",
    fullName: "Maya Lin",
    email: "m.lin@ucl.ac.uk",
    university: "University College London",
    fieldOfStudy: "Design & Technology",
    studyLevel: "undergraduate",
    experienceLevel: "first_timer",
    teamStatus: "individual_looking",
    primaryTooling: "v0, Lovable & Figma",
    wantsUpdates: true,
    createdAt: "2026-09-02T12:05:00Z",
  },
];

export const INITIAL_INQUIRIES: PartnerInquiry[] = [
  {
    id: "inq-001",
    companyName: "Frontier Compute Labs",
    contactName: "Marcus Vance",
    workEmail: "m.vance@frontiercompute.io",
    involvementInterests: ["API & Model Credits", "Setting a Partner Challenge", "Mentorship on the Floor"],
    proposedChallengeIdea: "Autonomous multi-agent verification tool for scientific literature",
    message: "Interested in providing GPU compute vouchers and sending two senior researchers as mentors.",
    createdAt: "2026-09-01T15:30:00Z",
  },
];

const LOCAL_STORAGE_KEY_REGS = "surrey_ai_hack_regs_v1";
const LOCAL_STORAGE_KEY_INQS = "surrey_ai_hack_inqs_v1";
const LOCAL_STORAGE_KEY_PHASE = "surrey_ai_hack_phase_v1";

export function getStoredRegistrations(): InterestRegistration[] {
  if (typeof window === "undefined") return INITIAL_REGISTRATIONS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_REGS);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY_REGS, JSON.stringify(INITIAL_REGISTRATIONS));
      return INITIAL_REGISTRATIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_REGISTRATIONS;
  }
}

export function saveRegistration(reg: Omit<InterestRegistration, "id" | "createdAt">): InterestRegistration {
  const current = getStoredRegistrations();
  const newEntry: InterestRegistration = {
    ...reg,
    id: `reg-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [newEntry, ...current];
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_REGS, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
  return newEntry;
}

export function getStoredInquiries(): PartnerInquiry[] {
  if (typeof window === "undefined") return INITIAL_INQUIRIES;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_INQS);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY_INQS, JSON.stringify(INITIAL_INQUIRIES));
      return INITIAL_INQUIRIES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_INQUIRIES;
  }
}

export function savePartnerInquiry(inq: Omit<PartnerInquiry, "id" | "createdAt">): PartnerInquiry {
  const current = getStoredInquiries();
  const newEntry: PartnerInquiry = {
    ...inq,
    id: `inq-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [newEntry, ...current];
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_INQS, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
  return newEntry;
}

export function getEventPhase(): EventPhase {
  if (typeof window === "undefined") return "pre_launch";
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PHASE) as EventPhase;
    return raw || "pre_launch";
  } catch {
    return "pre_launch";
  }
}

export function setEventPhase(phase: EventPhase): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_PHASE, phase);
    } catch {
      // ignore
    }
  }
}
