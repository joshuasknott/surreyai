export type EventPhase =
  | "pre_launch"
  | "internal_development"
  | "teaser"
  | "announced"
  | "registration_open"
  | "registration_closed"
  | "pre_event"
  | "live"
  | "archive";

export type ExperienceLevel = "first_timer" | "intermediate" | "experienced_builder";
export type TeamStatus = "individual_looking" | "have_team" | "solo_hacker";

export interface InterestRegistration {
  id: string;
  fullName: string;
  email: string;
  university: string;
  fieldOfStudy: string;
  studyLevel: "undergraduate" | "postgraduate" | "phd" | "recent_grad";
  experienceLevel: ExperienceLevel;
  teamStatus: TeamStatus;
  primaryTooling: string;
  wantsUpdates: boolean;
  createdAt: string;
}

export interface PartnerInquiry {
  id: string;
  companyName: string;
  contactName: string;
  workEmail: string;
  involvementInterests: string[];
  proposedChallengeIdea?: string;
  message?: string;
  createdAt: string;
}

export interface ScheduleEvent {
  id: string;
  time: string;
  day: "Day 1 (Saturday)" | "Day 2 (Sunday)";
  title: string;
  category: "ceremony" | "hacking" | "workshop" | "food" | "judging" | "milestone";
  location: string;
  description: string;
  isMilestone?: boolean;
}

export interface LiveAnnouncement {
  id: string;
  timestamp: string;
  title: string;
  content: string;
  level: "info" | "warning" | "urgent" | "food";
}
