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
   | AI Society | ussu.aianddatascience@surrey.ac.uk |
   | Business Society | ussu.bizsoc@surrey.ac.uk |
   | Neurotech Society | ussu.neurotechsoc@surrey.ac.uk |

6. **Set environment variables** (in each app or root `.env`):

   ```
   CONVEX_URL=https://your-project.convex.cloud
   PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

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
| AI Society | ussu.aianddatascience@surrey.ac.uk |
| Business Society | ussu.bizsoc@surrey.ac.uk |
| Neurotech Society | ussu.neurotechsoc@surrey.ac.uk |

### Society Isolation

Each dashboard is completely isolated. A user for one society cannot access another society's admin area. This is enforced in Convex functions via `ctx.auth.getUserIdentity()` and membership lookups, and in Astro middleware via Convex `memberships:getMyMembership`.

## Shared Code

- **`packages/admin`** — Society config, validation helpers, Convex client factory, TypeScript types
- **`packages/ui`** — Shared Astro components (e.g., `BaseLayout`)
- **`convex/`** — Shared backend: schema, permissions, events, committee, memberships, audit logs, settings, seed
