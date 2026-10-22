/**
 * Seed content for the Surrey AI Hack 2027 planning space.
 *
 * This catalog is deliberately free of dates, owners, contact details, and
 * assumptions about approvals. It is a set of prompts for the committee to
 * turn into confirmed decisions in the planner.
 */

export type HackChecklistGroup = {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
};

export type HackChecklistEntry = {
  readonly key: string;
  readonly group: string;
  readonly title: string;
  readonly description: string;
  readonly tasks: readonly string[];
};

export const HACK_CHECKLIST_GROUPS = [
  {
    id: "scope-governance",
    title: "Scope & decisions",
    description: "Agree the event shape, audience, and key committee decisions.",
  },
  {
    id: "venue-union",
    title: "Venue & Union approvals",
    description: "Choose a workable space and capture the approvals and access arrangements still needed.",
  },
  {
    id: "safety-accessibility",
    title: "Safety, access & wellbeing",
    description: "Keep the event inclusive with practical safety, safeguarding, privacy, and incident checks.",
  },
  {
    id: "finance-sponsors",
    title: "Sponsors & finance",
    description: "Build a simple budget and sponsor plan without presuming funding or commitments.",
  },
  {
    id: "programme-challenges",
    title: "Programme & challenges",
    description: "Shape the challenge experience from briefing through team support.",
  },
  {
    id: "tech-data",
    title: "Technical infrastructure & AI policy",
    description: "Prepare dependable event systems and clear decisions about tools, data, IP, and licensing.",
  },
  {
    id: "registration-comms",
    title: "Registration & communications",
    description: "Give participants clear information and collect only what delivery needs.",
  },
  {
    id: "operations-volunteers",
    title: "Delivery, people & closeout",
    description: "Coordinate judges, mentors, catering, volunteers, event-day delivery, and a lightweight closeout.",
  },
] as const satisfies readonly HackChecklistGroup[];

export const HACK_CHECKLIST_TEMPLATE = [
  {
    key: "define-event-purpose",
    group: "scope-governance",
    title: "Define the event purpose and audience",
    description: "Record what Surrey AI Hack 2027 should help participants learn, make, or experience.",
    tasks: [
      "Write a one-paragraph purpose statement",
      "Describe the intended participant audience and experience level",
      "List what the event will explicitly include and exclude",
      "Record the committee decision and questions still open",
    ],
  },
  {
    key: "choose-event-format",
    group: "scope-governance",
    title: "Choose the event format",
    description: "Compare possible formats such as a single-day hack, a longer build period, or a hybrid programme.",
    tasks: [
      "Compare format options against capacity and participant experience",
      "Describe how teams will form and work together",
      "Note the implications for space, staffing, and technology",
      "Record the selected format and rationale",
    ],
  },
  {
    key: "agree-governance",
    group: "scope-governance",
    title: "Agree organising roles and responsibilities",
    description: "Make sure every essential area has an organising lead and someone who can resolve urgent decisions.",
    tasks: [
      "Choose an event lead and deputy",
      "Allocate responsibility for programme, venue, finance, and communications",
      "Agree who can approve spending and final event decisions",
      "Share the organising team contact and escalation route",
    ],
  },
  {
    key: "shortlist-venues",
    group: "venue-union",
    title: "Shortlist suitable venues",
    description: "Compare candidate spaces against capacity, layout, access, power, connectivity, and operating needs.",
    tasks: [
      "List candidate spaces and their available information",
      "Compare capacity, layout, power, Wi-Fi, and quiet areas",
      "Check arrival, departure, storage, and cleaning requirements",
      "Record unknowns that need a venue check",
    ],
  },
  {
    key: "confirm-union-approval-path",
    group: "venue-union",
    title: "Map Students' Union approvals",
    description: "Identify the Union processes and evidence required for the proposed activity.",
    tasks: [
      "List the Union teams or processes that may need to be consulted",
      "Record the information each approval request needs",
      "Capture questions about insurance, room use, and event rules",
      "Store approval decisions and conditions in the event record",
    ],
  },
  {
    key: "plan-venue-layout",
    group: "venue-union",
    title: "Draft the venue layout",
    description: "Create a practical layout and check the venue services needed for teams, judging, catering, and support.",
    tasks: [
      "Sketch participant, organiser, judge, and mentor areas",
      "Mark accessible routes, facilities, and quiet space",
      "Place power, networking, AV, catering, and storage points",
      "Check opening access, setup, clear-down, and service constraints",
    ],
  },
  {
    key: "build-risk-register",
    group: "safety-accessibility",
    title: "Build an event risk register",
    description: "Track foreseeable operational, participant, technical, and reputational risks with proportionate responses.",
    tasks: [
      "List risks across the full event lifecycle",
      "Record likelihood, impact, warning signs, and mitigations",
      "Include safeguarding, conduct, emergency, and escalation checks",
      "Add a review point for changing assumptions",
    ],
  },
  {
    key: "plan-accessibility",
    group: "safety-accessibility",
    title: "Plan accessibility and reasonable adjustments",
    description: "Make it easy for participants to request and receive support throughout the event.",
    tasks: [
      "Review physical, digital, sensory, and communication access",
      "Add an accessible way to request adjustments",
      "Plan how adjustments will be handled confidentially",
      "Check the participant information explains available support",
    ],
  },
  {
    key: "plan-wellbeing",
    group: "safety-accessibility",
    title: "Plan participant wellbeing",
    description: "Build healthy working expectations and practical support into the event design.",
    tasks: [
      "Set break, rest, hydration, and quiet-space expectations",
      "Describe how someone can ask for support during the event",
      "Prepare signposting for relevant University or external support",
      "Include wellbeing prompts in organiser briefings",
    ],
  },
  {
    key: "review-privacy",
    group: "safety-accessibility",
    title: "Review privacy and data handling",
    description: "Decide what participant, team, photo, and submission data is needed and how it will be handled.",
    tasks: [
      "List every data collection and sharing point",
      "Minimise fields and separate optional information",
      "Write clear participant-facing privacy information",
      "Set access, retention, deletion, and incident-handling rules",
    ],
  },
  {
    key: "prepare-incident-route",
    group: "safety-accessibility",
    title: "Prepare the incident response route",
    description: "Give organisers a simple way to recognise, record, escalate, and close incidents.",
    tasks: [
      "Define incident categories and the first response for each",
      "Document who to contact for urgent and non-urgent concerns",
      "Prepare a private incident record template",
      "Add a post-incident review and follow-up step",
    ],
  },
  {
    key: "build-working-budget",
    group: "finance-sponsors",
    title: "Build the working budget",
    description: "Estimate income and costs while clearly marking assumptions and unknowns.",
    tasks: [
      "List cost categories from planning through closeout",
      "Record estimates, quotes, and confidence for each line",
      "Separate committed, proposed, and contingency amounts",
      "Record the approval path for spending changes",
    ],
  },
  {
    key: "plan-sponsor-offer",
    group: "finance-sponsors",
    title: "Create the sponsor offer",
    description: "Describe useful, honest sponsor benefits that fit the event and participant experience.",
    tasks: [
      "Write the event proposition and audience summary",
      "Define sponsor packages or contribution options",
      "List benefits, limits, deliverables, and approval requirements",
      "Prepare a sponsor information pack without unconfirmed claims",
    ],
  },
  {
    key: "track-sponsor-outreach",
    group: "finance-sponsors",
    title: "Track sponsor outreach",
    description: "Keep sponsor conversations, next steps, and evidence in one place.",
    tasks: [
      "Create a prospect list using organisation names only",
      "Record outreach status and agreed next steps",
      "Store proposals, replies, and restrictions",
      "Add a fallback assumption if a contribution does not arrive",
    ],
  },
  {
    key: "set-finance-controls",
    group: "finance-sponsors",
    title: "Set finance controls",
    description: "Make purchasing, reimbursements, receipts, and approvals easy to audit.",
    tasks: [
      "Document the approved purchasing and reimbursement route",
      "Choose where receipts, invoices, and approvals are stored",
      "Record spending limits and exceptions",
      "Define how the final reconciliation will be checked",
    ],
  },
  {
    key: "write-challenge-briefs",
    group: "programme-challenges",
    title: "Write the challenge briefs",
    description: "Give teams clear, realistic prompts with enough context to start building.",
    tasks: [
      "Define the problem, intended users, and useful outcome",
      "List available context, constraints, and success signals",
      "Identify what information is illustrative versus confirmed",
      "Review the briefs for clarity and accessibility",
    ],
  },
  {
    key: "choose-challenge-sources",
    group: "programme-challenges",
    title: "Check challenge sources and permissions",
    description: "Confirm that datasets, APIs, prompts, brands, and other challenge inputs can be used as intended.",
    tasks: [
      "List each external source and its proposed use",
      "Record licence, terms, attribution, and access constraints",
      "Identify a safe substitute for any source that is unavailable",
      "Add source notes to the participant challenge material",
    ],
  },
  {
    key: "design-event-journey",
    group: "programme-challenges",
    title: "Design the participant journey",
    description: "Map the stages from arrival and briefing through build, submission, judging, and close.",
    tasks: [
      "Write the participant journey in plain language",
      "Mark handoffs, decisions, and information needed at each stage",
      "Add rest, support, and accessibility touchpoints",
      "Check the journey works for first-time participants",
    ],
  },
  {
    key: "prepare-participant-guide",
    group: "programme-challenges",
    title: "Prepare the participant guide",
    description: "Give teams one reliable place for rules, support, resources, optional workshops, and submission expectations.",
    tasks: [
      "Add the format, challenge options, and conduct expectations",
      "Explain available tools, support routes, and accessibility help",
      "Add optional workshop topics, prerequisites, and shared resources",
      "Add submission, judging, and prize information",
      "Review the guide for ambiguity and unverified promises",
    ],
  },
  {
    key: "choose-core-platforms",
    group: "tech-data",
    title: "Choose core event platforms",
    description: "Select the smallest dependable set of systems for registration, communication, collaboration, and submissions.",
    tasks: [
      "List required capabilities and candidate tools",
      "Check account, access, cost, and support requirements",
      "Record data flows and admin responsibilities",
      "Document a fallback if a core platform is unavailable",
    ],
  },
  {
    key: "prepare-network-and-power",
    group: "tech-data",
    title: "Prepare network, power, and device needs",
    description: "Make the build environment usable for different teams and reasonable project setups.",
    tasks: [
      "Estimate device, power, charging, and connectivity needs",
      "Check network limits, authentication, and support route",
      "Plan shared equipment and spares without assuming availability",
      "Add an offline or low-bandwidth fallback",
    ],
  },
  {
    key: "set-ai-tool-policy",
    group: "tech-data",
    title: "Set the AI tool, IP, and licensing policy",
    description: "Explain acceptable tools and assistance, plus ownership, reuse, attribution, and third-party licence expectations.",
    tasks: [
      "List allowed, restricted, and unsupported tool categories",
      "Explain account, cost, age, and usage constraints",
      "Set expectations for disclosure of AI assistance",
      "Explain ownership, attribution, and third-party licence evidence",
      "Add a route for teams to ask policy questions",
    ],
  },
  {
    key: "review-data-and-model-safety",
    group: "tech-data",
    title: "Review data and model safety",
    description: "Help teams avoid exposing sensitive data or relying on unsafe, misleading, or unreviewed outputs.",
    tasks: [
      "Describe data that must not be uploaded or shared",
      "Add basic testing and human-review expectations",
      "Explain how to document limitations and known failure modes",
      "Define what to do if unsafe or sensitive output appears",
    ],
  },
  {
    key: "set-registration-fields",
    group: "registration-comms",
    title: "Design participant registration",
    description: "Collect only what is needed to plan a safe and useful event.",
    tasks: [
      "List required, optional, and conditional registration fields",
      "Add team, dietary, accessibility, and communication preferences carefully",
      "Explain how information will be used and retained",
      "Test registration with representative participant journeys",
    ],
  },
  {
    key: "plan-team-formation",
    group: "registration-comms",
    title: "Plan team formation and matching",
    description: "Give people a fair way to form teams while respecting their preferences and privacy.",
    tasks: [
      "Decide whether teams form before or during the event",
      "Define the information participants may share for matching",
      "Prepare a route for people who arrive without a team",
      "Document how changes and opt-outs are handled",
    ],
  },
  {
    key: "build-comms-plan",
    group: "registration-comms",
    title: "Build the communications plan",
    description: "Coordinate promotion, participant messages, accessible assets, organiser updates, and event-day announcements.",
    tasks: [
      "List audiences, channels, messages, and approval needs",
      "Create a single source for current participant information",
      "Plan reminder, change, urgent-update, and accessible asset needs",
      "Review tone, accessibility, and factual accuracy",
    ],
  },
  {
    key: "plan-photo-consent",
    group: "registration-comms",
    title: "Plan photography and media consent",
    description: "Set expectations for event photography, recordings, and participant choice.",
    tasks: [
      "Decide what media will be captured and why",
      "Provide clear consent and opt-out information",
      "Plan visible notices and a way to identify preferences",
      "Define storage, access, retention, and publication checks",
    ],
  },
  {
    key: "define-judge-brief",
    group: "operations-volunteers",
    title: "Create the judge brief",
    description: "Give judges the event context, criteria, process, and boundaries they need.",
    tasks: [
      "Explain the event purpose, challenge context, and schedule shape",
      "Add criteria, scoring guidance, and conflict expectations",
      "Describe the submission and deliberation process",
      "Agree calibration, tie handling, accessibility, and conduct guidance",
    ],
  },
  {
    key: "recruit-judges",
    group: "operations-volunteers",
    title: "Build the judge pool",
    description: "Identify a balanced set of judges and keep invitations and confirmations traceable.",
    tasks: [
      "List desired expertise and perspectives",
      "Record invitation status without storing unnecessary personal data",
      "Capture availability, conflicts, and access needs after confirmation",
      "Keep a contingency shortlist",
    ],
  },
  {
    key: "define-mentor-role",
    group: "operations-volunteers",
    title: "Define the mentor role",
    description: "Set boundaries so mentors support teams without taking over their work or judging them.",
    tasks: [
      "Describe what mentors can and cannot do",
      "List support topics and escalation routes",
      "Explain how mentor interactions will be coordinated",
      "Add conduct, privacy, and accessibility expectations",
    ],
  },
  {
    key: "plan-catering",
    group: "operations-volunteers",
    title: "Plan catering and dietary needs",
    description: "Provide food and drink that fits attendance assumptions and recorded dietary information.",
    tasks: [
      "Estimate meals, snacks, drinks, and service points",
      "Collect and protect dietary and allergen information",
      "Confirm menu, labelling, supplier, delivery, and food-safety requirements",
      "Plan alternatives for changed attendance or supply",
    ],
  },
  {
    key: "prepare-operations-run-sheet",
    group: "operations-volunteers",
    title: "Prepare the operations run sheet",
    description: "Create one operational view of setup, participant flow, programme moments, and close-down.",
    tasks: [
      "List the event phases from access through clear-down",
      "Add dependencies, handoffs, and decision points",
      "Link venue, technical, catering, and safety checks",
      "Keep a readable version for event-day use",
    ],
  },
  {
    key: "define-volunteer-brief",
    group: "operations-volunteers",
    title: "Define the volunteer brief",
    description: "Make support roles understandable and bounded before people arrive.",
    tasks: [
      "List volunteer tasks by event phase",
      "Describe escalation, safeguarding, accessibility, and conduct boundaries",
      "Provide contact and handover information through an approved channel",
      "Prepare a short briefing and acknowledgement check",
    ],
  },
  {
    key: "plan-check-in",
    group: "operations-volunteers",
    title: "Plan check-in and arrivals",
    description: "Make arrival welcoming, private, and resilient to changes in attendance.",
    tasks: [
      "Map the arrival route, queue, welcome, and accessibility needs",
      "Define the minimum information needed to check someone in",
      "Prepare badge, team, dietary, and support workflows",
      "Add a manual fallback if the check-in system is unavailable",
    ],
  },
  {
    key: "prepare-av-plan",
    group: "operations-volunteers",
    title: "Prepare the AV and presentation plan",
    description: "Keep talks, demos, announcements, and judging presentations usable and tested.",
    tasks: [
      "List microphones, screens, adapters, recording, and lighting needs",
      "Define slide, demo, and room-change handoffs",
      "Test the chosen setup and keep compatible spares in mind",
      "Add captions, transcripts, or other access support where needed",
    ],
  },
  {
    key: "write-contingency-plan",
    group: "operations-volunteers",
    title: "Write the contingency plan",
    description: "Prepare practical alternatives for venue, platform, staffing, supplier, and programme disruption.",
    tasks: [
      "List trigger conditions for each fallback",
      "Define the minimum viable participant experience",
      "Prepare alternative rooms, tools, communications, and judging paths",
      "Record who can authorise a change and how it is announced",
    ],
  },
  {
    key: "define-submission-format",
    group: "operations-volunteers",
    title: "Define the submission format",
    description: "Make the evidence required from each team clear and achievable.",
    tasks: [
      "List required project summary, demo, links, and supporting evidence",
      "Set file, repository, account, and access expectations",
      "Explain how to submit safely without exposing private data",
      "Test the submission flow with a sample project",
    ],
  },
  {
    key: "finalise-judging-process",
    group: "operations-volunteers",
    title: "Finalise the judging process",
    description: "Connect the rubric, evidence, presentations, deliberation, and result record.",
    tasks: [
      "Confirm the criteria and weighting or decision method",
      "Define presentation order, time limits, and accessibility options",
      "Set tie, conflict, incomplete-submission, and appeal handling",
      "Prepare a secure results record and review checklist",
    ],
  },
  {
    key: "design-prize-plan",
    group: "operations-volunteers",
    title: "Design the prize plan",
    description: "Specify proposed prizes, eligibility, evidence, and fulfilment without assuming availability.",
    tasks: [
      "List proposed prize categories and selection rules",
      "Record source, value, restrictions, and approval requirements",
      "Define how winners are notified and verified",
      "Prepare a fallback recognition plan",
    ],
  },
  {
    key: "run-participant-feedback",
    group: "operations-volunteers",
    title: "Run participant feedback",
    description: "Collect useful feedback on inclusion, learning, delivery, and the build experience.",
    tasks: [
      "Choose a short survey and optional follow-up routes",
      "Ask about access, wellbeing, support, and event flow",
      "Explain how responses will be used and retained",
      "Record themes without exposing individual responses",
    ],
  },
  {
    key: "complete-finance-closeout",
    group: "operations-volunteers",
    title: "Complete finance closeout",
    description: "Reconcile income, spending, reimbursements, prizes, and outstanding commitments.",
    tasks: [
      "Gather receipts, invoices, approvals, and contribution records",
      "Compare actuals with the working budget",
      "Resolve missing evidence or open supplier items",
      "Record the final review and storage location",
    ],
  },
  {
    key: "send-thanks-and-follow-up",
    group: "operations-volunteers",
    title: "Send thanks and follow-up",
    description: "Close the loop with participants, judges, mentors, sponsors, volunteers, and venue partners.",
    tasks: [
      "List recipient groups and the message each needs",
      "Check consent and communication preferences",
      "Share useful resources, results, or next steps",
      "Record unresolved questions and promised follow-up",
    ],
  },
] as const satisfies readonly HackChecklistEntry[];
