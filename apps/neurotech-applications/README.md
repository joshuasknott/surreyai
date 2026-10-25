# Neurotech committee applications

Standalone recruitment app for the 2026–27 committee. It is deployed to the
`surrey-neurotech-applications` Vercel project, independently of the public
Neurotech society site. The three open role forms are available from `/`.

From the repository root:

```sh
npm run dev:neurotech-applications
npm run build:neurotech-applications
npm run typecheck
npm test -- --project server apps/neurotech-applications
npm run test:e2e -- --config playwright.neurotech-applications.config.ts
```

Production requires `RESEND_API_KEY`, `COMMITTEE_FROM_EMAIL` (or
`CONTACT_FROM_EMAIL`), and `BLOB_READ_WRITE_TOKEN` for a private Vercel Blob
store. Applications are emailed to `joshhknott@gmail.com`; uploaded mock posts
are attached to the email and deleted after confirmed acceptance by Resend.
Missing delivery configuration keeps submissions unavailable.

This round stays open by default. Set `APPLICATIONS_CLOSE_AT` to an ISO timestamp
to close it independently of the society site's previous recruitment round.

Build locally, verify the linked Vercel project in this app directory, and
deploy its `.vercel/output` with `vercel deploy --prebuilt --prod --archive=tgz`.
Keep all environment values in Vercel or ignored local environment files.
