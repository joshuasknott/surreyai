# Committee planner

The committee planner is the private board at `/committee/planner` on the AI Society site. It uses the root Convex deployment for authenticated access, planner records, comments, notifications, files and published activity snapshots. Public activity pages read only the explicitly published snapshot.

The planner frontend lives in `apps/ai/src/pages/committee/planner.astro` and its API routes are under `apps/ai/src/pages/api/planner`. Backend functions and validators live in `convex/planner.ts`, `convex/plannerSignIn.ts`, `convex/plannerEmail.ts`, `convex/plannerFiles.ts`, `convex/plannerModel.ts` and `convex/schema.ts`.

Committee access is granted by email. The owner can add or revoke committee addresses from the planner settings; other members need an active grant. The sign-in form checks access before requesting a Clerk email code. Access checks and mention-email relays use server-only signing secrets. Do not add credentials, tokens or hosted member data to fixtures.

Planner cards move through Ideas, Planning and Ready before an explicit publish action creates a public activity snapshot. Draft details, private notes, comments, collaborators, checklists and audit history remain private. Archiving dated events and hackathons is handled by the existing Europe/London scheduled job; projects and undated ideas remain active.

Publishing requires a public description. Events and hackathons also need a date, start time and location; booking and registration links are optional. Any supplied link must use HTTPS. Public activity pages show a registration button only when a link is provided.

Mentions are canonicalised to committee email addresses, notify recipients in the private planner inbox and can queue a delayed email. Self-mentions do not notify. Email delivery rechecks access, the comment, the mention and the recipient preference before sending. Planner comments and notifications never enter public snapshots.

Run the focused regression suite with:

```sh
npm run test:planner
```

The suite uses temporary test data and Convex test utilities. It does not prove production inbox delivery or an authenticated production committee session; verify those separately when a release requires them.

## Planning areas

The sidebar opens independent planning pages at `/committee/planner/events`, `/committee/planner/outreach` and `/committee/planner/hack2027`. The original `/committee/planner` URL still opens Events. Existing cards and list layouts without a workspace field remain in Events; no cards are reclassified from their title or team.

Events retains Ideas, In progress and Ready. Outreach uses the same private card workflow with To approach, Waiting for reply and In conversation, plus editable relationship type and next action. Its cards cannot publish to the society website. Calendar and Archive remain shared views across the planning areas. Card options include Change planning area for deliberately moving unpublished cards.

Surrey AI Hack 2027 uses a grouped readiness checklist. The editable starter catalogue in `convex/plannerHackTemplate.ts` contains 42 essential tasks across eight groups, with detailed steps inside each card. First opening the page seeds this checklist once for the society, using an authenticated transaction and durable setup marker. Reopening or concurrent visits cannot duplicate the preset or recreate intentionally archived/deleted tasks. Every preset card starts private, incomplete, unassigned and without a fabricated deadline, venue, budget or sponsorship commitment. The committee can change titles, descriptions, groups, leads, dates and checklists, add comments/files, complete tasks, or add its own cards.

The preset covers scope and organising roles; venue and Union approvals; safety, access and wellbeing; sponsors and finance; programme, submissions and judging; technical infrastructure and AI policy; registration and communications; and delivery, people and closeout. Smaller checks are substeps of the relevant task.

## Local review preview

With the Astro dev server already running on loopback port 4321, run `node scripts/preview-planner.mjs`, then open `http://127.0.0.1:4333/committee/planner/hack2027`. `ASTRO_ORIGIN` and `PLANNER_PREVIEW_PORT` may override the loopback addresses.

This local proxy serves the real planner frontend and real planner functions against an isolated `convex-test` database. It injects its fixture authentication only into locally proxied planner HTML; the deployed application contains no preview authentication bypass. Events and Outreach use sample cards, and the Hack page uses the real starter catalogue. All edits stay in memory and reset when the preview process stops. The harness does not deploy Convex, send provider emails or change hosted committee records. Production release still requires deploying the matching Convex schema/functions and frontend together after approval.
