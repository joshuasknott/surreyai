# Surrey AI Hack homepage promotion

Source visual truth: `output/hack-homepage/reference.png` (approved user attachment, 1967 × 800 pixels).

Implementation: `apps/ai/src/components/home/HackPromotion.astro`, immediately after the homepage programme. Source content, heading, logo and primary link are preserved as accessible HTML and the original logo asset.

## Evidence and normalization

- Desktop viewport: 1440 × 900 CSS pixels, device density 1. The section capture is 1440 × 594 pixels. The reference is normalized to 1440 × 586 pixels without stretching.
- Full-view comparison: `output/hack-homepage/comparison-desktop-final.png` (reference above implementation).
- Focused logo and button comparison: `output/hack-homepage/comparison-details.png` (reference above implementation).
- Mobile: `output/hack-homepage/section-mobile.png` at 390 pixels and `output/hack-homepage/section-narrow-mobile.png` at 320 pixels. Both use the same content, stacked into one column.
- Browser capture: `output/hack-homepage/browser-local.png`. The final automated section captures supersede its earlier spacing.
- State: default, unfocused CTA for fidelity comparison. Keyboard focus was tested separately. No browser console errors were recorded in the in-app browser.

## Comparison history

1. Initial comparison (`comparison-desktop-initial.png`): P2, logo too small and right column/button too wide. Fixed logo scale and alignment, limited desktop copy to 90% of its grid track, and tightened spacing.
2. Final comparison (`comparison-desktop-final.png`): the two-column proportions, two-line heading, logo prominence and pill CTA now match the approved hierarchy. No actionable P0/P1/P2 findings remain.

## Required fidelity surfaces

- Typography: existing Inter loaded and verified in the browser; bold two-line heading and readable supporting text. Original condensed wordmark is retained in the supplied logo image.
- Spacing/layout: full-width yellow feature, centered logo, right-hand copy and CTA, bottom metadata. Section height differs by 8 normalized pixels; acceptable responsive rounding and font rendering.
- Colors: yellow `#fff34f`, purple `#21113a`. The reference's minor generated texture is intentionally represented as a flat background.
- Images: app-local logo is a byte-identical copy of `apps/hack/assets/logo.webp`, preserving transparency and independent app deployment. No redraw or generated replacement.
- Copy: matches the approved section, including “Explore Surrey AI Hack 2027”, beginner inclusion and unconfirmed-details metadata.

## Interaction and responsive checks

- Six focused browser tests passed: promotion at 1440/390/320, existing `/hack` route at desktop/mobile, and header Join menu keyboard/outside dismissal.
- Final three promotion tests passed after spacing adjustments, with no horizontal overflow.
- Keyboard focus is visible, link opens the exact event origin in a new tab, and `noopener noreferrer` is present. A real browser click opened the live event website successfully.
- Hack is absent from the homepage and inner-page header navigation; direct `/hack` links remain valid.
- Reduced motion disables the CTA's color transition.
- Production build, typecheck, 137 unit tests and diff checks passed. The checked prebuilt bundle was deployed as `dpl_8boAQgkLUTwdjG729XKPSUcUmRxz`, verified before promotion, then confirmed READY on `https://surreyaisociety.org/`.
- The published page was opened in the in-app browser; the real logo, new section, external CTA and corrected navigation were present, with no console errors. Live screenshot: `output/hack-homepage/production-section.png`.

## Follow-up polish

P3 only: browser font rasterization and the original logo glyph proportions differ slightly from the generated mockup. The supplied brand asset takes precedence.

final result: passed

---

# Meet the committee: approved hierarchy and supplied portraits

Source visual truth: `output/committee-home/reference.png`, the user's selected 1182 × 1330 image.

Implementation: `apps/ai/src/components/home/Committee.astro`, rendered in the existing homepage at `/#committee`. The three signatories retain their canonical roles and names; the eleven non-signatories remain in the five published teams.

## Evidence and normalization

- Desktop comparison: `output/committee-home/comparison-desktop-final.png`, source on the left and browser implementation on the right. Both are 1182 pixels wide at device density 1. The source is 1330 pixels tall; the full implementation section is 1423 pixels tall, including existing spacing and the next section's wave. No image or screenshot is stretched for comparison.
- Focused comparison: `output/committee-home/comparison-detail.png` checks the signatory names, portrait scale, roles, connecting line and team headings at matching scale.
- Browser screenshots: `output/committee-home/section-{320,390,768,1024,1182,1440}.png`, all at device density 1. The 390px and 320px captures were inspected for long-name wrapping and face crops; the 768px capture was inspected for the two-column team arrangement.
- The in-app browser separately confirmed the full homepage context and working committee anchor at 1280 × 720. Section comparison captures omit fixed assistant/skip-link chrome; those controls remain present in the application and their existing browser checks pass.
- State: default content, all portraits loaded, reduced motion enabled for automated captures. The committee section introduces no animation or new interactive controls.

## Findings and comparison history

1. Initial comparison (`comparison-desktop-initial.png`): P2, some team headings remained on one line and variable member heights shifted later portraits between columns. The heading lines now match the reference, and desktop member rows have consistent heights and spacing. The decorative connector's source crop was also cleaned to exclude stray text from the neighbouring Treasurer label.
2. Final comparison (`comparison-desktop-final.png` and `comparison-detail.png`): the three signatories, shared orange connector, five team columns, circular portraits and all fourteen names follow the selected composition. No actionable P0/P1/P2 findings remain. A separate read-only review confirmed correct photo/name placement and readable desktop/mobile grouping.

## Required fidelity surfaces

- Typography: existing Baloo 2 display type and Inter text preserve the site's visual language. The title is upright, names remain real text and long names wrap without truncation. Minor generated-letterform differences are P3 only.
- Spacing/layout: signatories are centred above the five evenly spaced teams. All officer portraits are 154px on desktop and all team portraits are 144px; both use 96px portraits on narrow mobile. Desktop member rows align. Below 1024px, the connector is hidden and teams reflow; below 600px, the officers and teams stack into readable groups.
- Colors: existing cream `#faf8f3`, ink `#111111` and orange `#ff4a00` are retained. Smaller role text uses the accessible darker orange `#cc3b00`.
- Image quality: all fourteen portraits are deterministic crops from the supplied originals, exported as 384px WebP assets (approximately 320KB combined with the connector). There is no facial generation, retouching, relighting or background replacement. The three signatory crops exclude their post graphics. The exact connector artwork was extracted from the approved mockup; no substitute illustration was drawn.
- Copy/content: canonical full names, three officer roles and the five existing team rosters are preserved. The file named `ibrahim hague.jpeg` is labelled with the website's correct name, Ibrahim Haque. Photos have empty alt text because the adjacent names identify the people without duplicate announcements; headings, the labelled signatory group and member lists retain accessible semantics.

## Verification and limits

- `npm run typecheck`: passed.
- `npm run build:ai`: passed on the final implementation.
- Four focused Playwright checks passed: committee roster/portraits/responsive bounds, existing signatories/anchors/assets, labelled social links/touch targets, and keyboard skip link/reduced motion.
- All fourteen portraits loaded successfully; no section, label, portrait or page overflow was found at 320, 390, 768, 1024, 1182 and 1440px.
- Scope is local implementation and browser verification. This committee update has not been committed, pushed or deployed. Concurrent planner/backend edits were preserved.

## Follow-up polish

P3 only: the chosen display font differs slightly from ImageGen's synthetic letterforms. Original low-resolution and backlit photographs retain their supplied quality rather than undergoing facial reconstruction or tonal retouching.

final result: passed

## Portrait crop correction - 22 October 2026

The user identified overly tight and off-centre portraits after the initial implementation. This supersedes the initial crop acceptance above. All fourteen photo assets were reframed directly from the supplied originals, with more hair/chin clearance and individually adjusted centres. Layout and member mapping are unchanged.

- Compared actual circular masks before and after in `output/mockups/committee/crop-comparison.png`; a separate read-only review found no remaining actionable clipping or post-graphic issues.
- Inspected refreshed browser screenshots at 1182px and 390px. The existing committee Playwright check passed at 320, 390, 768, 1024, 1182 and 1440px, including all fourteen loaded portraits and responsive bounds.
- Amanda's source itself cuts the upper forehead; her crop now uses the full available image width. No missing pixels were invented. All faces retain their original appearance, lighting and background.
- Changes remain local and have not been committed, pushed or deployed.

## Committee planner areas and essential Hack preset — 22 October 2026

Source targets: the selected Outreach conversation pipeline (`output/mockups/planner-directions-20261022/outreach-pipeline.png`) and Hack readiness checklist (`output/mockups/planner-directions-20261022/hack-readiness.png`). The subsequent user correction reduces the Hack preset to essential tasks only. Events retains the existing board workflow.

### Evidence and comparison

- Side-by-side design/implementation inputs: `output/planner-implementation-20261022/outreach-comparison.png` and `hack-comparison.png`. Source images are contained at the captured 1440 × 1024 CSS viewport without stretching; device scale is 1. The reference mockups contain illustrative assignees/dates and eight Hack rows, while the implementation deliberately contains an editable 42-task preset with no fabricated assignments, dates or completed work.
- Desktop: `output/planner/segmented-outreach-desktop.png`, `segmented-hack-desktop.png`, and the final 1485px captures. Mobile/tablet: `segmented-outreach-320.png`, `segmented-outreach-390.png`, `segmented-hack-320.png`, `segmented-hack-390.png`, and the 834px captures. All tested widths fit without horizontal page overflow.
- Actual in-app browser preview: `output/planner-implementation-20261022/outreach-preview.png` and `hack-preview.png`. The latter shows all eight essential sections collapsed, 0 of 42 complete. Checked and reopened a task in the real loopback preview; changes remained isolated in its in-memory backend.

### Findings and fixes

- Resolved P2: an always-visible Planning area field crowded existing compact card editing. Moved it into private details, accessible directly from Change planning area in card options. The existing compact desktop/laptop/mobile editor regression now passes.
- Resolved P2: the longer grouped checklist needed clearer disclosure affordances. Added native accessible details/summary groups with visible chevrons, group totals, and Expand all/Collapse all controls. Keyboard/touch controls and search remain functional.
- Resolved functional regression: overlapping focus refreshes could drop a comment update. Refresh requests are now queued; the existing comment pagination/edit/delete/revocation browser regression passes.
- No remaining actionable P0/P1/P2 visual or accessibility findings on the changed surfaces. The existing application shell deliberately retains its compact typography, 248px rail, member controls, filters, brand assets and orange/purple tokens rather than treating the generated mock's dimensions as a replacement shell. The selected body structures, hierarchy and interaction models are preserved.

### Required fidelity surfaces

- Typography: existing Inter/system sans family; Outreach titles 17px, Hack row titles 16px on desktop and 14px on phones, readable supporting text, correct title wrapping on 320px screens.
- Spacing/layout: three Outreach stages with concise next actions; grouped Hack rows with compact metadata, expandable detail and independent editor/discussion scrolling. Mobile retains the existing stage tabs and navigation drawer; checklist rows stack metadata without sideways scrolling.
- Colors/tokens: original aubergine sidebar, orange active/action states, white surfaces, cool-grey grouping, and text-labelled status colors. No color-only status or bespoke replacement palette.
- Images/icons: original society logo retained; existing Lucide library supplies all standard UI icons. No new raster assets or approximate logo redraws were needed.
- Copy/content: Outreach has To approach, Waiting for reply and In conversation. Hack has 42 editable essentials in eight groups, with smaller checks inside task details. Seed content starts incomplete, private, unassigned and undated; no venue, budget or sponsor is presented as confirmed.

### Validation and limits

- 140 unit tests passed, including workspace isolation, legacy-data preservation under large other-workspace counts, publishing guards, revision conflicts and seed idempotency.
- All 64 planner browser tests passed after the functional/layout fixes. The three focused segmentation/responsive tests passed again after the disclosure-icon polish.
- Root and Convex type checks and the Astro production build passed. Final diff checked using the repository's existing CRLF line-ending convention; unrelated concurrent homepage/portrait work was preserved.
- Preview uses local fixture identity/sample Events and Outreach cards with real planner functions in `convex-test`. Data resets on preview restart. This is not a hosted deployment, a production auth acceptance test, or real-recipient email verification. No frontend/backend resources were deployed and no hosted committee records were changed.

final result: passed

## Production release - 22 October 2026

- Published commit `7ab336ca0a85ca69ad293573127c13d95320b61f` to origin/main. The release includes the committee photos/layout and records the already-live Hack promotion/header changes; concurrent planner and Convex work remains uncommitted and was excluded.
- Built an isolated export of the release: typecheck, build:vercel and four committee/Hack browser checks passed. Initial prebuilt deployment `dpl_FGLoZyzwzRr9rUscsB2S79DdyR1k` was verified and promoted. The Git-triggered production deployment `dpl_3f1XzvCRmvaxXSEArmrZcKvXKMsH` for the same commit subsequently reached READY and owns the live domain.
- Live https://surreyaisociety.org/#committee verified in browser: fourteen corrected portrait URLs loaded. The committee test passed against the public domain at 320, 390, 768, 1024, 1182 and 1440px. Evidence: `output/committee-home/live/section-{width}.png`.
- Homepage runtime error scan for the release window returned no errors. Existing Hack promotion, event and resources navigation preserved.
