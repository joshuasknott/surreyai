# Committee planner

The committee planner is the private board at `/committee/planner` on the AI Society site. It uses the root Convex deployment for authenticated access, planner records, comments, notifications, files and published activity snapshots. Public activity pages read only the explicitly published snapshot.

The planner frontend lives in `apps/ai/src/pages/committee/planner.astro` and its API routes are under `apps/ai/src/pages/api/planner`. Backend functions and validators live in `convex/planner.ts`, `convex/plannerSignIn.ts`, `convex/plannerEmail.ts`, `convex/plannerFiles.ts`, `convex/plannerModel.ts` and `convex/schema.ts`.

Committee access is granted by email. The owner can add or revoke committee addresses from the planner settings; other members need an active grant. The sign-in form checks access before requesting a Clerk email code. Access checks and mention-email relays use server-only signing secrets. Do not add credentials, tokens or hosted member data to fixtures.

Planner cards move through Ideas, Planning and Ready before an explicit publish action creates a public activity snapshot. Draft details, private notes, comments, collaborators, checklists and audit history remain private. Archiving dated events and hackathons is handled by the existing Europe/London scheduled job; projects and undated ideas remain active.

Mentions are canonicalised to committee email addresses, notify recipients in the private planner inbox and can queue a delayed email. Self-mentions do not notify. Email delivery rechecks access, the comment, the mention and the recipient preference before sending. Planner comments and notifications never enter public snapshots.

Run the focused regression suite with:

```sh
npm run test:planner
```

The suite uses temporary test data and Convex test utilities. It does not prove production inbox delivery or an authenticated production committee session; verify those separately when a release requires them.
