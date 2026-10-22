# Surrey AI

Surrey AI Society’s website, private committee planner, resources hub, Portfolio Studio and Surrey AI Hack source live in this repository. Each application keeps its own runtime and data boundary so the source can be maintained together without moving accounts, databases or published sites.

Live surfaces:

- [Surrey AI Society](https://surreyaisociety.org) — the public Astro site and private `/committee/planner` route.
- [Surrey AI Hack](https://surreyaisociety.org/hack) — dedicated event section; the event website remains at [its existing origin](https://surrey-ai-hack-2027.vercel.app).
- [Resources](https://surreyaisociety.org/resources) — the public catalogue of Society tools.
- [Portfolio Studio](https://portfolio-studio-1uu.pages.dev) — the independently hosted portfolio builder.

The existing production origins, planner Convex data, Portfolio Studio D1 database, authentication sessions and published portfolio addresses remain owned by their respective deployments. A source import does not recreate or migrate those services.

## Repository map

| Area | Location | Runtime boundary |
| --- | --- | --- |
| AI Society website, planner frontend and resources | `apps/ai` | Astro/Vercel, connected to the root Convex deployment |
| Planner backend and shared society data | `convex` | Convex; private planner access and mutations live here |
| Shared site foundations | `packages/ui`, `packages/admin`, `packages/assistant` | Root npm workspace |
| Surrey AI Hack | `apps/hack` | Independent static site + Vercel waitlist function and private Blob storage |
| Portfolio Studio | `apps/portfoliostudio` | Separate Vite/React + Cloudflare Pages Worker, D1 and Workers AI |

Portfolio Studio is deliberately outside the root npm workspace. Its toolchain and lockfile are independent, and its Wrangler configuration must continue to point at the existing Portfolio Studio resources.

## Local setup

Use Node.js 22.12 or newer.

Install the root workspace and create the AI app environment. Astro reads the app-local file, so keep site variables in `apps/ai/.env.local`; use `.env.example` as the variable-name reference and never commit real values.

```sh
npm ci
cp .env.example apps/ai/.env.local
npm run dev:ai
```

This starts the site against its configured endpoint without starting or deploying the shared backend. For backend development, use a personal Convex development deployment and keep its `CONVEX_DEPLOYMENT`, `CONVEX_URL` and `CONVEX_SITE_URL` in the private root `.env.local`. Do not point local Convex commands at the shared production deployment or deploy it automatically from local setup. Astro reads the app-local `apps/ai/.env.local` file; root CLI configuration is separate.

Install Portfolio Studio separately:

```sh
npm --prefix apps/portfoliostudio ci
```

Its local flow is documented in [`apps/portfoliostudio/README.md`](apps/portfoliostudio/README.md) and uses Wrangler’s local Pages/D1 runtime. Keep its `.dev.vars`, D1 migrations, Wrangler project name and production origin in that app’s boundary.

## Checks

Root checks:

```sh
npm run typecheck
npm run backend:check
npm test
npm run build:ai
npm run test:e2e
npm run test:planner
```

Portfolio Studio wrappers:

```sh
npm run typecheck:portfolio
npm run test:portfolio
npm run build:portfolio
npm run test:e2e:portfolio
```

The root release wrapper for Portfolio Studio is `npm run deploy:portfolio`; use it only for an authorized Cloudflare Pages release.

The resources browser check covers navigation from the AI homepage, the real Portfolio Studio link, correct homepage section anchors on `/resources`, and horizontal overflow at desktop and mobile sizes. Planner-specific access and Convex checks are described in [`docs/planner.md`](docs/planner.md).

## Deployment boundaries

The AI website and planner frontend deploy as the `apps/ai` Astro application. Its Vercel project uses the repository root as its Root Directory, `npm ci` as the install command, `npm run build:vercel` as the build command, and `.vercel/output` as the output directory, matching [`vercel.json`](vercel.json). That wrapper builds only `apps/ai` and copies Astro’s Vercel bundle to the repository root.

The planner’s `convex/` directory is the single source of truth for its functions, schema and access rules. Deploy those Convex changes together through the root Convex project when changing planner behavior. Portfolio Studio deploys separately with its own root wrappers and `npm run deploy`/Wrangler Pages flow. Do not combine its D1 database, Worker bindings, cookies or domain configuration with the planner.

Keep `CLERK_SECRET_KEY`, provider API keys, Resend credentials, Blob tokens, Convex secrets, signing keys and deployment tokens in hosting or local environment configuration. Never put them in `PUBLIC_` variables, source, tests or documentation.

For planner ownership, access grants, notifications and the required environment names, read [`docs/planner.md`](docs/planner.md). For Portfolio Studio’s auth, publishing, D1 migrations and Cloudflare settings, read [`apps/portfoliostudio/README.md`](apps/portfoliostudio/README.md).

## Surrey AI Hack

The event is a separate section at `/hack`; Portfolio Studio stays in `/resources`. The production event source is in `apps/hack`, outside the root npm workspace, with its own lockfile. Run `npm --prefix apps/hack ci --ignore-scripts`, `npm run test:hack`, and `npm run build:hack`. See [its README](apps/hack/README.md) for deployment and waitlist operations.

The existing Vercel project `surrey-ai-hack-2027` uses this repository with Root Directory `apps/hack`, install `npm ci --ignore-scripts`, build `npm run build`, and output `dist`. Retain its existing Blob store and server environment variables. Do not create a new store or move signup records. Original hackathon repository history is preserved; the active source is the verified production implementation, replacing the earlier prototype.
