# Surrey AI Hack 2027

Production source for the selected yellow and ultramarine design. The public page is static; a Vercel Node function saves consented waitlist signups and notifies the society through Resend. Maintained in `surreyai/apps/hack`; the society links here from its dedicated [Hack section](https://surreyaisociety.org/hack).

## Preview

Use Node 24 and run `npm ci`, `npm test`, then `npm run build`. The build copies public HTML, CSS, JavaScript and assets into `dist`. Vercel discovers `api/waitlist.mjs` separately; server code and package files are not public assets. A static HTTP server can preview the design; it cannot save signups. Use a Vercel preview deployment for the complete flow.

## Waitlist and contact

The participant form posts to `/api/waitlist`. It requires an email and explicit consent, validates requests on the server, rejects the honeypot, applies a bounded per-instance burst limit, and returns success only after storage accepts the record (or recognizes an existing record). Failure leaves the form available for retry. The burst limit is not a globally distributed abuse-prevention service.

Records are stored privately in the Vercel Blob store `surrey-ai-hack-2027-waitlist` (`store_zPSFSHbjcH9AdLyT`), connected to this project through encrypted `BLOB_READ_WRITE_TOKEN`. Open the project's Storage tab to access records. Production signups are under `waitlist/`; preview signups are under `preview-waitlist/`. Filenames are SHA-256 hashes of normalized addresses. Each JSON record contains email, timestamp, consent, consent version and source. Duplicate addresses do not create extra records. Release QA uses the synthetic address `surrey-site-qa-20261021@example.com` in both environments; exclude that address and the entire preview prefix from any mailing list.

Each new production signup automatically sends a notification to `ussu.aianddatascience@surrey.ac.uk`, from `Surrey AI Hack 2027 <waitlist@surreyaisociety.org>`. It includes the signup address, original timestamp and source, with the signup address as Reply-To. `RESEND_API_KEY` is a sensitive production secret using a dedicated send-only key restricted to the verified `surreyaisociety.org` domain. `WAITLIST_FROM_EMAIL` configures the sender. Preview deployments do not send notifications.

Private `waitlist-notifications/` records retain pending/sent receipts and frozen payloads. Resend idempotency keys and sent receipts prevent duplicate notifications when the same address is submitted again. Transient provider failures get one immediate retry; later retries require resubmitting the form. There is no background queue. The signup remains saved if notification fails, and the form explains that state. Pending attempts older than 23 hours require operator review instead of an automatic resend. Existing signups are not bulk-backfilled. API acceptance is separate from final delivery; check the message's delivery events in Resend.

Release verification delivered one notification for `qa-test-do-not-contact-20261021@example.com`; a repeat signup did not send another. Exclude this synthetic address as well as the older QA address above from announcements. The site does not send subscriber confirmation messages or announcement campaigns. Sponsorship and removal/contact links address `ussu.aianddatascience@surrey.ac.uk`. The privacy page explains storage and notifications. Joining is explicitly not a ticket or reservation. Dates, venue, cost, team format and support arrangements remain unannounced.

The final whole-site verification also used `qa-final-do-not-contact-20261021@example.com`. Resend confirmed delivery; API and desktop repeat submissions produced no extra email or stored record. Exclude this address from announcements as well.

## Assets

The event logo and self-hosted Inter / Barlow Condensed fonts come from the previous production deployment. Masthead artwork was generated to match the approved mockup. The footer's “Organised by Surrey AI Society” credit uses the black and orange AI monogram from the official transparent wordmark, `surreyai/apps/ai/public/logos/brand/surrey-ai-logo-transparent.png`. Its unchanged local copy is `assets/surrey-ai-society.png`, SHA-256 `93a80567b808e3f90279537c036042e9f15594577839a24492b9a1c7965c1d9e`. CSS frames the monogram on the cream footer; the artwork retains its original transparency and geometry. The logo slot is 64px on desktop and 56px on phones/tablets, with the organiser name visible throughout. The header contains the event identity, navigation and waitlist action. The blue section contains six clearly spaced role cards. Official links point to https://surreyaisociety.org and its Students' Union listing; the page does not claim university endorsement. The unused historical `workshop.webp` is generated artwork, not evidence of a real event. Phosphor icons are provided under the included MIT license. Font families are distributed under the SIL Open Font License.

The toolkit uses unmodified, self-hosted product logos from LobeHub Icons and Devicon, plus the Canva asset used on the Mivlet reference site. Included license notices cover the icon collections; trademarks remain with their respective owners. Exact source URLs and SHA-256 hashes are recorded in `brand-sources.json`. Each logo has a visible text label, and the section explicitly distinguishes tool examples from event partners.

## Vercel target

Git source: `joshuasknott/surreyai`, branch `main`, Root Directory `apps/hack`. Install with `npm ci --ignore-scripts`, build with `npm run build`, output `dist`. Retain the existing three server environment variables and Blob store; never commit credentials.

- Project: `surrey-ai-hack-2027`
- Project ID: `prj_6TUKU0r5j0vqAN3f4EXAfxNYlNPB`
- Team ID: `team_x3voohVaQ1QCLbyPOA83ZBMN`
- Public URL: https://surrey-ai-hack-2027.vercel.app/

Do not upload QA artifacts, source backups, or credentials. Deploy only the production file manifest.
