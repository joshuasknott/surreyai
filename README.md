<div align="center">

# surreysocieties

**Three University of Surrey society sites. One monorepo.**

Astro · Convex · Clerk · Tailwind · TypeScript

<p>
  <a href="https://surreyaisociety.org">AI</a> ·
  <a href="https://surreybusinesssociety.org">Business</a> ·
  <a href="https://surreyneurotechsociety.org">Neurotech</a>
</p>

</div>

<p align="center">
  <img src="docs/images/surrey-ai-hero.png" alt="Surrey Artificial Intelligence Society" width="32%" />
  <img src="docs/images/surrey-business-hero.png" alt="Surrey Business Society" width="32%" />
  <img src="docs/images/surrey-neurotech-hero.png" alt="Surrey Neurotech Society" width="32%" />
</p>

## Sites

| Society | App | Domain |
|---------|-----|--------|
| Surrey Artificial Intelligence Society | `apps/ai` | [surreyaisociety.org](https://surreyaisociety.org) |
| Surrey Business Society | `apps/business` | [surreybusinesssociety.org](https://surreybusinesssociety.org) |
| Surrey Neurotech Society | `apps/neurotech` | [surreyneurotechsociety.org](https://surreyneurotechsociety.org) |

Shared Convex backend, Clerk auth, admin tooling, and UI packages. Each society keeps its own brand and production deploy.

## Stack

[Astro](https://astro.build/) (SSR, Node) · [Tailwind CSS v4](https://tailwindcss.com/) · [Convex](https://convex.dev/) · [Clerk](https://clerk.com/) · TypeScript · npm workspaces · [Vercel](https://vercel.com/)

## Setup

Requires Node.js `>= 22.12.0`, plus Convex and Clerk projects.

```bash
npm install
cp .env.example .env   # fill values — see comments in the file
npx convex dev         # link project, generate types, deploy functions
```

In Convex **Settings → Authentication**, add Clerk with your publishable key. Seed societies and protected admins:

```bash
npx convex run seed:seedSocieties
```

| Society | Protected admin email |
|---------|------------------------|
| AI | `ussu.aianddatascience@surrey.ac.uk` |
| Business | `ussu.bizsoc@surrey.ac.uk` |
| Neurotech | `ussu.neurotechsoc@surrey.ac.uk` |

Create matching Clerk users; first sign-in links identity. Never put secrets behind a `PUBLIC_` prefix.

```bash
npm run dev:ai         # :4321
npm run dev:business   # :4322
npm run dev:neurotech  # :4323
npm run build:all
npm test
npm run test:e2e
```

## Layout

```
apps/{ai,business,neurotech}   # society sites
packages/{admin,ui}            # shared admin + UI
convex/                        # schema, functions, permissions, seed
scripts/                       # Vercel build + ops
e2e/                           # Playwright
```

## Admin and deploy

`/admin` is Clerk + Convex membership gated; societies are isolated.

| Role | Access |
|------|--------|
| `protectedAdmin` | Full access; cannot be removed or demoted |
| `admin` | Content, invites, roles |
| `member` | Events and committee |

`npm run provision:admins` needs `CLERK_SECRET_KEY` and `OWNER_ADMIN_INITIAL_PASSWORD` / `AI_ADMIN_INITIAL_PASSWORD` / `BUSINESS_ADMIN_INITIAL_PASSWORD` / `NEUROTECH_ADMIN_INITIAL_PASSWORD`.

Vercel: from repo root run `node scripts/build-vercel.mjs ai|business|neurotech` → `.vercel/output`. Point each domain at its app, deploy Convex to the same project as `CONVEX_URL`, and keep Clerk’s `convex` JWT template (audience `convex`) plus a stable `CSRF_SECRET`.

## Contributing

PRs that improve shared packages, isolation, tests, or deploys are welcome. Don’t invent society content. Prefer `npm test`, `npm run test:e2e`, and the relevant `build:*` before opening a PR.
