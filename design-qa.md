# Surrey AI committee card dialog - 21 October 2026

final result: passed

## Scope and evidence

Implemented the selected expanded Trello-style card dialog in the existing AI planner. Creator attribution and creation/update timestamps are explicit, comments have readable Europe/London timestamps, and a filter combines comments with private, server-recorded card activity. Existing editing, mentions, files, autosave and publishing remain functional.

- Source: C:/Users/Joshua Knott/Projects/surreysocieties/output/planner/trello-selected-target.png (1586 x 992, the user's selected attachment).
- Desktop implementation: C:/Users/Joshua Knott/Projects/surreysocieties/output/planner/trello-reference-desktop.png (1600 x 1000 CSS/pixel viewport, deviceScaleFactor 1).
- Mobile Card: C:/Users/Joshua Knott/Projects/surreysocieties/output/planner/trello-reference-mobile-card.png (390 x 844, deviceScaleFactor 1).
- Mobile Discussion: C:/Users/Joshua Knott/Projects/surreysocieties/output/planner/trello-reference-mobile-discussion.png (390 x 844, deviceScaleFactor 1).
- Short laptop: C:/Users/Joshua Knott/Projects/surreysocieties/output/planner/compact-card-laptop.png (1280 x 720).
- Full-view comparison: C:/Users/Joshua Knott/Projects/surreysocieties/output/planner/trello-comparison.png; reference on the left, implementation on the right. Source normalized from 1586 x 992 to 1600 x 1000 for comparison (less than 0.2% aspect difference).
- Focused dialog comparison: C:/Users/Joshua Knott/Projects/surreysocieties/output/planner/trello-dialog-comparison.png. Dialog regions are adjacent, source on the left. The implemented dialog is intentionally slightly taller to retain existing functional card-purpose controls and fit provenance plus attachments.

Evidence is Chromium browser rendering with fixture authentication and real Convex functions running in convex-test. The reference fixture uses sample names and local data, not hosted committee records. No production data was written. The in-app browser launch timed out; visual verification used the repository's Playwright browser captures.

## Findings and iteration history

- P2 fixed: initial desktop spacing pushed attachments below the visible card body. Reduced description/field spacing and adjusted dialog height. Final desktop attachments are visible.
- P2 fixed: the 1280 x 720 layout overflowed the compact editor. Added a short-viewport spacing rule. Existing no-scroll assertions and visible checklist/attachment checks pass.
- P1 fixed: a late initial activity response could suppress a concurrent autosave refresh. Activity refreshes now coalesce; a delayed-response regression proves the latest event appears.
- P1 fixed: filtered audit pages could initially contain no visible activity. The client advances through empty pages, bounded to six per load, and retains a load-earlier control for longer history.
- P1 fixed: activity completion could overwrite a failed comment request's retry state. Explicit comment-error state now survives activity completion and filter changes until retry succeeds.
- P2 fixed: unassigned/default field normalization and no-op saves could create misleading lead/team events or update attribution. Empty-equivalent defaults are normalized; true no-op saves retain timestamp/contributors while advancing the concurrency revision.
- Date-group keys now use explicit Europe/London format parts rather than assumptions about locale output.
- Post-fix evidence is the desktop/mobile/laptop captures above and passing browser regressions. No actionable P0/P1/P2 visual finding remains.

## Fidelity surfaces

- Typography: retained the existing Inter/system stack, title hierarchy and readable message text. Comment and activity timestamps are 12px or larger; the browser regression checks the computed timestamp size and exact London-formatted value. Mobile composer text is 16px.
- Spacing/layout: retained the split editor/discussion modal, composer above the feed, checklist progress, attachment action and saved/private footer. Mobile keeps accessible Card/Discussion tabs and independent scrolling without page overflow. The dialog remains centered; the generated reference's lower placement is not hardcoded.
- Colors: retained plum society navigation, orange primary actions, pastel team labels, purple mention/filter/progress accents and restrained dividers. Removed backdrop blur to keep the board context legible.
- Assets: reused the actual society mark, initials avatars and existing Lucide icon library. No generated screenshot is shipped as interface content; no new image asset was needed.
- Copy/content: actual authors and timestamps replace illustrative mock data. Creator and assigned lead are distinct. Existing card-purpose and AI-description controls are retained. Uploaded files show real uploader/time metadata; existing URL-only attachments retain their hostname rather than inventing uploader details. Legacy history is shown only where the server records support it.

## Verification and limits

- npm run typecheck: passed.
- npm test -- --maxWorkers=1: 178 passed across 21 files (including 59 planner backend tests).
- Planner browser coverage: all 44 scenarios validated. The final full run passed 42; two obsolete expectations were updated to reflect meaningful-edit attribution and the Comments-only empty state, then both passed a targeted rerun. Earlier targeted runs also verify the stale-response, audit pagination and comment-retry regressions.
- npm run build:all: AI, Business and Neurotech passed. npm run build:ai passed again after the final frontend error-state change. The existing large-chunk advisory remains.
- Independent review: no remaining P1/P2 blocker after the activity and comment-error fixes.
- The broader browser config also includes public launch tests for other sites. Its AI launch checks passed, then that run was stopped because Business/Neurotech preview servers were not running. It is not claimed as a passing cross-site browser suite.
- Deployed on 21 October 2026 to https://surreyaisociety.org/committee/planner. Vercel deployment dpl_6ZvTqJup8GWtsB7qiBNB59sQGuwa is READY and promoted; the live Convex backend colorless-goldfinch-177 was updated separately. Source remains uncommitted.
- Live HTML, JavaScript and CSS match the checked artifacts; no-store/noindex remain present, the public programme excludes private fields, and an anonymous activity query is rejected. Read-only deployed activity/file queries were verified with the Convex CLI admin-supplied identity; no hosted records were created.
- Three browser smoke tests passed against the deployed frontend, using fixture Clerk transport and an isolated convex-test database. This is not acceptance of a real signed-in committee browser session. Release evidence: output/planner/trello-release-verification.json.
