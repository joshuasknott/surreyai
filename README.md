<div align="center">

# surreysocieties

**Three University of Surrey society sites. One monorepo.**

Astro · Convex · Tailwind · TypeScript

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

Shared Convex backend and UI packages. Each society keeps its own brand and production deploy. Public product surface is the three society websites only (no per-site admin CMS).

## Stack

[Astro](https://astro.build/) (SSR, Node) · [Tailwind CSS v4](https://tailwindcss.com/) · [Convex](https://convex.dev/) · TypeScript · npm workspaces · [Vercel](https://vercel.com/)

## Setup

Requires Node.js `>= 22.12.0` and a Convex project.

```bash
npm install
cp .env.example .env   # fill values — see comments in the file
npx convex dev         # link project, generate types, deploy functions
```

Seed societies if needed:

```bash
npx convex run seed:seedSocieties
```

Never put secrets behind a `PUBLIC_` prefix.

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
packages/{admin,ui,assistant}  # shared public helpers + UI + assistant
convex/                        # schema, functions, permissions, seed
scripts/                       # Vercel build + ops
e2e/                           # Playwright
```

`packages/admin` is a public-safe shared helpers package (society config, contact delivery, Convex client helpers). It no longer ships a CMS.

Each contact form opens a prefilled message in the visitor’s email app with one click. The visitor reviews and sends it there; the website never claims to have sent it. A separate `/api/contact` endpoint supports server-side delivery if needed later, but the public form does not call it. The endpoint requires server-only `RESEND_API_KEY` and `CONTACT_FROM_EMAIL`; never use `PUBLIC_` variables for these secrets.

## Deploy

Vercel: from repo root run `node scripts/build-vercel.mjs ai|business|neurotech` → `.vercel/output`. Point each domain at its app and deploy Convex to the same project as `CONVEX_URL`.

## Contributing

PRs that improve shared packages, isolation, tests, or deploys are welcome. Don’t invent society content. Prefer `npm test`, `npm run test:e2e`, and the relevant `build:*` before opening a PR.
