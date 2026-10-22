# Surrey AI repository

This repository contains the Surrey AI Society website, private committee planner, resources hub, the imported Portfolio Studio source, and Surrey AI Hack. Keep the applications independently deployable and preserve their existing data, authentication, cookies, domains, and published links.

## Boundaries and commands

The root npm workspace contains `apps/ai` and `packages/*`. The planner frontend and public resources page live in `apps/ai`; its Convex backend and schema live in `convex`. Portfolio Studio at `apps/portfoliostudio` is a separate nested npm project with its own lockfile and Cloudflare Pages, Worker, D1, and Workers AI resources. Do not add it to the root workspace or share its runtime secrets with the planner.

Root commands:

- `npm ci`
- `npm run dev:ai`
- `npm run build:ai`
- `npm run build:vercel`
- `npm run typecheck`
- `npm run backend:check`
- `npm test`
- `npm run test:e2e`
- `npm run test:planner`

Portfolio Studio commands from the root are `npm --prefix apps/portfoliostudio ci`, `npm run dev:portfolio`, `npm run build:portfolio`, `npm run typecheck:portfolio`, `npm run test:portfolio`, and `npm run test:e2e:portfolio`. Its direct scripts and Wrangler setup remain documented in `apps/portfoliostudio/README.md`.

Put Astro and planner server variables in `apps/ai/.env.local`; Astro reads that app-local file. Keep Convex CLI deployment settings in the root `.env.local` when needed. Never commit either file or any provider credentials.

The public resources catalogue is `/resources` and currently links to the existing Portfolio Studio origin. Keep entries factual and do not add placeholder products or invented claims. On non-home AI pages, homepage section links use `/#about`, `/#programme`, and `/#committee`.

## Changes and verification

Preserve the current society visual language, accessible controls, asset identity, member-data privacy, and reduced-motion behavior. Inspect affected desktop and mobile layouts for overflow and focus states. For substantial UI changes, read the applicable frontend design and visual QA guidance before editing.

When changing Convex code, read `convex/_generated/ai/guidelines.md` and the applicable Convex guidance. Keep generated files generated and preserve validators, auth checks, and data ownership.

Local previews, source history, and passing builds do not prove that a production deployment changed. Verify the intended app, preview, deployment, and live route separately. Do not move or recreate existing Convex, D1, Cloudflare, auth, email, Blob, or domain resources as part of a source-layout change.

Surrey AI Hack lives in `apps/hack`, outside the root npm workspace with its own lockfile. Preserve its existing Vercel project, live origin, Blob store, consent checks and email configuration. Use `npm --prefix apps/hack ci --ignore-scripts`, `npm run test:hack`, and `npm run build:hack`. It has its own `/hack` society section; Portfolio Studio remains under `/resources`.
