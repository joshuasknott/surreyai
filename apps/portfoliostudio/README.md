# Portfolio Studio

A portfolio builder by **Surrey AI Society**. Start with a considered design or a blank canvas, make it your own, and publish a website you can take with you.

Portfolio Studio is maintained in the [`surreyai`](https://github.com/joshuasknott/surreyai) repository under `apps/portfoliostudio`. Its Cloudflare Pages project, D1 database, authentication and published portfolio addresses remain independent of the society website. Visit the [Surrey AI resources hub](https://surreyaisociety.org/resources) to return to the society’s tools.

[Open Portfolio Studio](https://portfolio-studio-1uu.pages.dev) · [Browse the ten designs](https://portfolio-studio-1uu.pages.dev/designs)

## Features

- Ten editable portfolio designs with independent visual identities.
- Local drafts, account sign-in, cloud saves and saved versions.
- CV text import from PDF, DOCX and TXT, processed in the browser.
- Guided creation from details to design, personalisation and publishing, with session-only onboarding recovery.
- Direct text editing, section reordering, images, typography, colours and responsive previews.
- AI-assisted editing with a review step and changes scoped to a selected element.
- Society AI selected automatically for new portfolios, with optional encrypted personal API keys in settings.
- One-click publishing to an automatically allocated public address, separately published snapshots and downloadable static websites.
- Custom-subdomain verification and connection when the hosting owner configures Pages API access.

Provider account sign-in is intentionally unavailable until an officially supported integration is configured. A consumer AI subscription does not grant API access. Shared AI and hosting have finite allowances; this project does not promise unlimited inference or capacity.

## Run locally

Requires Node.js 22.12 or later and npm.

```sh
npm ci
npm run build
npm run db:migrate
npm run dev:api
```

Open `http://127.0.0.1:8787`. For frontend development, run `npm run dev` in a second terminal; Vite proxies API requests to port 8787. Rebuild the Worker after server changes with `node scripts/build-worker.mjs`.

Local D1 data lives in the ignored `.wrangler/` directory. Copy the relevant settings from `.env.example` to `.dev.vars` for Wrangler. Use the same hostname consistently for cookies and origin checks. The AI binding uses Cloudflare remotely, so AI requests during local development use the configured Cloudflare allowance.

## Checks

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Backend tests cover ownership boundaries, revision conflicts, published snapshot isolation, account recovery, CSRF, domain verification and AI response validation. Export tests check the generated website archive and editable document. Browser tests exercise the creation and editing flow.

The browser suite runs against an isolated local Wrangler/D1 instance without production credentials or an AI binding. It checks cloud sign-up, direct editing, uploaded media, public publishing, republishing, password recovery and an exported website served with external network access blocked. A separate workload uses 70 independent test accounts to read and save concurrently; this is a local concurrency check, not a guarantee of production capacity or unlimited free-tier usage.

## Deploy

The application uses Cloudflare Pages advanced mode, a dedicated D1 database and Workers AI. `wrangler.jsonc` describes the existing project. Do not reuse another application's database.

```sh
npx wrangler login
npx wrangler d1 migrations apply portfolio-studio --remote
npm run build
npm run deploy
```

Configure `APP_ORIGIN` and `PUBLIC_APP_URL` to the production origin. Set `BYOK_ENCRYPTION_KEY` as a random server secret before accepting personal/provider keys. Never put secrets in `VITE_` variables or commit `.dev.vars`.

The initial owner uses a private, one-time `/admin/setup#<token>` invitation. Configure `ADMIN_BOOTSTRAP_HASH` as the base64url SHA-256 digest of a cryptographically random token; only its hash is stored in the deployment. The invitation grants administrator access to the signed-in account once and cannot be reused. Keep the invitation outside the repository. Additional administrators can be selected by immutable account IDs in `ADMIN_USER_IDS`, never by an unverified email address.

Custom domains require a server-only `PAGES_API_TOKEN` with **Pages Write** for the project account, plus `PAGES_ACCOUNT_ID`, `PAGES_PROJECT_NAME` and `PAGES_PROJECT_SUBDOMAIN`. Students add a TXT ownership proof and a CNAME at their domain registrar. They do not need Cloudflare accounts for a supported subdomain. Apex domains and provider-account transfers are not automated; students can export their website to their own host and repoint their domain.

The workshop publishing path needs no domain or DNS setup: students sign in to Portfolio Studio, then publish to an included `/p/name` address. Address customisation, exports and personal domains remain under **Advanced options**. Publishing a local draft saves it to the account first; subsequent changes keep the same live link.

## Ownership and data

Students retain their content and exported websites. The export contains static HTML, styles, fonts, images where download is permitted, and an editable `portfolio.json`. It contains no credentials. Third-party images and fonts retain their own licences. Importing a CV does not upload the original file; extracted text is only sent with an explicitly included AI request.

Uploaded images are compressed in the browser and kept private until included in a published snapshot. Current limits are 400 KB per image, 40 images per portfolio and 5 MB of uploaded media per account. Accounts can keep up to 20 active portfolios; cloud history retains the ten most recent versions. Downloaded `portfolio.json` files can be imported from the dashboard. Public URLs remain managed by this instance until the student exports and moves their website.

Published websites have no compulsory Surrey AI Society branding. The Studio itself uses Society brand assets maintained in the [Surrey AI repository](https://github.com/joshuasknott/surreyai). Fictional gallery profiles illustrate the designs and are not inserted as a student's experience.

## Project structure

- `src/` — React interface, editor, design library and exports
- `shared/` — validated portfolio format
- `server/` — authentication, persistence, AI, domains and published HTML
- `migrations/` — D1 schema
- `public/` — maintained brand, font and portfolio assets
- `tests/` — export, domain and browser coverage

Report problems through [GitHub issues](https://github.com/joshuasknott/surreyai/issues).
