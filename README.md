# surreysocieties monorepo

A monorepo containing three University of Surrey society websites, built with Astro, Convex, and Clerk.

## Sites

| Society | App | Domain | Dev Port |
|---------|-----|--------|----------|
| Surrey Artificial Intelligence Society | `apps/ai` | surreyaisociety.org | 4321 |
| Surrey Business Society | `apps/business` | surreybusinesssociety.org | 4322 |
| Surrey Neurotech Society | `apps/neurotech` | surreyneurotechsociety.org | 4323 |

## Tech Stack

- **Framework:** [Astro](https://astro.build/) (SSR with Node adapter)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend:** [Convex](https://convex.dev/) (database, queries, mutations)
- **Auth:** [Clerk](https://clerk.com/) (sign-in, sign-out, JWT tokens)
- **Language:** TypeScript
- **Monorepo:** npm workspaces

## Getting Started

### Prerequisites

- Node.js >= 22.12.0
- A [Convex](https://convex.dev/) account and project
- A [Clerk](https://clerk.com/) account and application

### Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up Convex:**

   ```bash
   npx convex dev
   ```

   This links to your Convex project, generates `_generated/` types, and deploys functions.

3. **Configure Clerk as auth provider in Convex:**

   In the Convex dashboard, go to Settings > Authentication and add Clerk. Enter your Clerk publishable key.

4. **Seed the database:**

   ```bash
   npx convex run seed:seedSocieties
   ```

   This creates the three societies and their protected admin membership records.

5. **Create Clerk accounts for protected admins:**

   Create Clerk accounts with these emails. On first sign-in, Convex will link the Clerk identity to the existing user record:

   | Society | Email |
   |---------|-------|
   | Surrey AI Society | ussu.aianddatascience@surrey.ac.uk |
   | Business Society | ussu.bizsoc@surrey.ac.uk |
   | Neurotech Society | ussu.neurotechsoc@surrey.ac.uk |

6. **Set environment variables** (in each app or root `.env`):

   ```bash
   CONVEX_URL=https://your-project.convex.cloud
   PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   CLERK_JWT_ISSUER_DOMAIN=https://your-clerk-domain.clerk.accounts.dev
   CSRF_SECRET=replace-with-a-stable-random-secret
   ```

   Optional AI assistant variables:

   ```bash
   GEMINI_API_KEY=...
   AI_FEATURES_ENABLED=true
   AI_MODEL=gemini-3.1-flash-lite
  AI_FALLBACK_MODEL=gemini-3.1-flash-lite
  ASSISTANT_RATE_LIMIT_SECRET=replace-with-a-second-stable-random-secret
   ```

   `GEMINI_API_KEY`, `CLERK_SECRET_KEY`, and `ASSISTANT_RATE_LIMIT_SECRET` must stay server-side only. Set the same assistant rate-limit secret in the Astro deployment and Convex so generative requests use the shared durable limiter. If `GEMINI_API_KEY` is missing, the assistant falls back to non-generative responses.

### Development

```bash
npm run dev:ai         # http://localhost:4321
npm run dev:business   # http://localhost:4322
npm run dev:neurotech  # http://localhost:4323
```

### Build

```bash
npm run build:ai
npm run build:business
npm run build:neurotech
npm run build:all
```

### E2E

```bash
npm run test:e2e
```

Playwright starts the three dev servers on ports 4321, 4322, and 4323. The E2E suite checks public routes, mobile navigation, membership links, assistant placement, 404 states, and blocked admin access.

### Unit tests

```bash
npm test
```

Vitest covers public Convex reads, admin authorization, invitation/content mutations, assistant request validation, fallback behavior, and rate limiting.

## Deployment

- Deploy each Astro app as a Node SSR app using its workspace build output in `apps/<site>/dist`.
- Configure the production domains listed above to route to the matching app and keep each app's environment variables in its deployment environment.
- Deploy Convex functions with the same Convex project referenced by `CONVEX_URL`.
- Configure Clerk's Convex JWT template named `convex` with audience `convex`; `npm run provision:admins` creates or updates that template when run with `CLERK_SECRET_KEY`.
- Keep `CSRF_SECRET` stable between deploys so existing admin form tokens remain valid during a rollout.

## Project Structure

```
surreysocieties/
├── apps/
│   ├── ai/              # Surrey AI Society website
│   ├── business/        # Surrey Business Society website
│   └── neurotech/       # Surrey Neurotech Society website
├── packages/
│   ├── admin/           # Shared admin config, validation, Convex client
│   └── ui/              # Shared Astro components
├── convex/              # Convex backend (schema, functions, permissions)
└── package.json         # Workspace root
```

## Admin Dashboard

Each site has its own admin dashboard at `/admin`, protected by Clerk authentication and Convex membership checks.

### Role Model

| Role | Permissions |
|------|-------------|
| `protectedAdmin` | Society inbox admin. Full access, cannot be removed or demoted. |
| `admin` | Can manage content, invite/remove users, change roles. |
| `member` | Can manage events and committee. Cannot manage users. |

### Protected Admin Emails

These are the society signatory emails with permanent `protectedAdmin` access:

| Society | Email |
|---------|-------|
| Surrey AI Society | ussu.aianddatascience@surrey.ac.uk |
| Business Society | ussu.bizsoc@surrey.ac.uk |
| Neurotech Society | ussu.neurotechsoc@surrey.ac.uk |

### Admin Provisioning

```bash
npm run provision:admins
```

This script requires `CLERK_SECRET_KEY` plus `OWNER_ADMIN_INITIAL_PASSWORD`, `AI_ADMIN_INITIAL_PASSWORD`, `BUSINESS_ADMIN_INITIAL_PASSWORD`, and `NEUROTECH_ADMIN_INITIAL_PASSWORD`. It creates the protected Clerk accounts if they do not already exist and updates the Clerk JWT template used by Convex.

### Invite Flow

1. A `protectedAdmin` or `admin` signs in at `/admin` and opens `/admin/admins`.
2. Use `Invite Admin` to invite the new committee member by email and role.
3. Email delivery is not configured in the app, so copy the generated invite link from `/admin/admins` and share it manually with the invitee.
4. The invitee opens `/admin/invite/accept?token=...` and signs in with the same email address that was invited.
5. Invitations expire after 7 days and can be revoked from `/admin/admins` while pending.

### Annual Committee Handover

1. Confirm the protected society inbox account still works before outgoing admins leave.
2. Invite incoming admins from `/admin/admins`, then ask them to accept before removing outgoing non-protected admins.
3. Update current committee records in `/admin/committee` and archive previous years in `/admin/past-committee` only with verified names, roles, years, and images.
4. Review `/admin/events` and remove, update, or archive stale event information.
5. Check `/admin/settings` for society contact, socials, and membership links before the new academic year.
6. Run `npm run build:all` and `npm run test:e2e` after handover edits.

### Society Isolation

Each dashboard is completely isolated. A user for one society cannot access another society's admin area. This is enforced in Convex functions via `ctx.auth.getUserIdentity()` and membership lookups, and in Astro middleware via Convex `memberships:getMyMembership`.

## Shared Code

- **`packages/admin`** — Society config, validation helpers, Convex client factory, TypeScript types
- **`packages/ui`** — Shared Astro components (e.g., `BaseLayout`)
- **`convex/`** — Shared backend: schema, permissions, events, committee, memberships, audit logs, settings, seed
