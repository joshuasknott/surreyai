# Committee planner board implementation — 17 October 2026

final result: passed

## Scope and visual targets

Implemented the selected desktop board and mobile board. Card details remain a native modal with the existing discussion, autosave and publishing flows. The separate right-side drawer concept was not implemented.

- Desktop source: C:/Users/Joshua Knott/.codex/generated_images/01a14a55-1fc9-7eb3-a0a6-90d60cbac7c3/exec-35899718-f173-4a7c-99ec-c9cf8d96b248.png (1487 x 1058).
- Mobile source: C:/Users/Joshua Knott/.codex/generated_images/01a14a55-1fc9-7eb3-a0a6-90d60cbac7c3/exec-bb62ecc2-ca44-4fe7-a242-9b6ea6e6e0ef.png (853 x 1844).
- Browser-rendered implementation: output/planner/board-first-desktop.png (1440 x 1024), output/planner/board-first-mobile.png (390 x 844), output/planner/board-first-mobile-modal.png (390 x 844). Desktop Chrome, deviceScaleFactor 1, fixture authentication and in-memory Convex functions. No hosted data was created or mutated.
- Full-view comparison: output/planner/qa/desktop-comparison.png and output/planner/qa/mobile-comparison.png. Source images were normalized to the matching CSS viewport before composition; each pair places the reference on the left and implementation on the right.
- Focused comparison: output/planner/qa/toolbar-comparison.png, matching main-header and filter regions with source above implementation. The mobile full-view pair is also large enough to inspect complete cards, owner names, due dates and stage tabs.

## Findings and iteration history

- P2 fixed: the first mobile capture wrapped In progress awkwardly. Gave that stage additional space; all four tabs remain visible at 390 and 320 pixels, and the active column uses a vertical card list without horizontal scrolling.
- P2 fixed: an autosizing title missed its border height. Added the border allowance, then reclaimed two pixels of bottom spacing so the existing compact desktop modal still fits. Final title overflow and compact-modal regression checks pass.
- P2 fixed: putting the waiting editor in the primary card body introduced unnecessary scrolling. Moved it into the existing optional-details modal panel, accessible through Set waiting status in Card options. It saves, reloads and clears through the normal revision-checked card mutations.
- Updated obsolete creator-avatar assertions: board cards now show their assigned lead, while creator/editor history remains available through Worked on by inside the modal.
- Final post-fix evidence is the board-first captures above and the complete 34-test planner browser run. No actionable P0/P1/P2 issue remains in this scope.

## Fidelity surfaces

- Fonts and typography: retained the existing Inter/system sans stack; stronger wrapping titles, readable owner names and next-action text. Existing authenticated header is slightly more compact than the concept; acceptable product continuity, not a clipping defect.
- Spacing and layout: retained the navigation rail, four desktop columns and single compact filter row. Mobile selects one stage at a time. Actual full roster names and existing update-time sorting make card heights/order differ from the illustrative mock data.
- Colors and tokens: retained plum navigation, warm orange actions, pale grey columns, existing team colors, amber waiting status and green publication badge.
- Image quality: existing society mark and Lucide icons are reused. No generated screenshot is shipped as UI and no new raster asset is required.
- Copy and content: real leads, first unfinished checklist action, saved private waiting status and explicit event-date labels replace illustrative text. Missing teams remain unlabelled instead of inventing an Admin team. Existing Archive, website and account controls are preserved.

## Verification and limits

- npm run typecheck: passed.
- npx tsc --noEmit -p convex/tsconfig.json: passed.
- npm test: 136 passed across 16 files, including waiting-status validation, omitted-field compatibility and public snapshot privacy.
- npm run test:e2e -- --config e2e/planner.config.ts planner.spec.ts: 34 passed. Covers Everyone/My work, display-name mapping, combined team/search/due/waiting filters, empty states, default lead under My work, mobile stages and keyboard control, 320/390 layouts, desktop drag/reorder, true modal behavior, autosave/retry, files, sign-in/access revocation, comments, mentions, realtime notifications and publication/privacy.
- npm run build:ai: passed. Vite reports a non-blocking large-chunk warning.
- New board flow asserts no browser page errors. The live in-app local preview was opened and reaches the committee-email sign-in form; authenticated board evidence comes from the browser fixtures, not a live account.
- No production deploy, hosted schema/function push, production sign-in or physical-device acceptance was performed. Release the optional waitingOn backend change with the AI frontend. Unit/browser verification uses the actual Convex functions in convex-test.

## Follow-up polish

- The compact authenticated mobile header and full roster names intentionally differ from the illustrative artwork. A physical-phone pass is still useful after release.

---

## Previous QA report (preserved)

# Neurotech presentation and mascot QA - 15 October 2026

final result: passed

## Findings and fixes

- P1: The hero divider could cover the membership and Linktree actions at intermediate widths. Reserved divider clearance within the copy column and reduced the decorative wave height. The actions now finish at least 12 pixels above the wave's complete paint box.
- P2: The long hero word approached the photograph. The heading now scales with its actual column; the regression measures rendered text with a Range and requires at least 20 pixels of separation from the photo.
- P2: Introduction copy felt crowded at tablet widths. Limited the heading and paragraph line lengths and reduced the decorative neural artwork footprint.
- P2: A legacy body font rule could win in the bundled stylesheet. Added a focused body font override so the local self-hosted sans font is used consistently.
- Recoloured the existing neuron through imagegen to warm gold with a navy face and boots, preserving transparent edges and its friendly identity. Optimized the result to a 320 x 320 WebP sibling asset.
- Reduced the assistant launcher to a 64px desktop badge and 56px phone badge, with an ivory background and gold edge. The matching panel opens above the badge, retains visible controls and stays within short/narrow viewports. Reserved footer space beside the Union link.

## Evidence

- User report: C:/Users/JOSHUA~1/AppData/Local/Temp/codex-clipboard-2fca6026-6860-4fbf-b4d3-2781404dc623.png (906 x 926).
- Local screenshots: output/playwright/neurotech-presentation/local/editorial-{width}-{hero,full}.png and assistant-{906,390,320}.png.
- The responsive check covers 1440x1000, 906x926, 838x1000, 768x1024, 761x900, 760x900, 390x844, 320x640, 1024x600, 1152x900, 1280x720 and 1920x1000. Assistant interaction coverage additionally includes 320x568.
- Publication evidence and final screenshots are recorded separately under output/playwright/neurotech-presentation/live/ and output/neurotech-presentation-release/.

## Verification and limits

- 22 Neurotech browser checks passed, including navigation, membership/social links, contact mailto, keyboard and reduced motion, assistant mocked reply/error/recovery states, closed application routes and responsive layout. The focused layout check was repeated after the final font-cascade adjustment.
- The layout regression checks real headline bounds, hero action/wave separation, loaded photos and fonts, paragraph contrast, touch targets, no horizontal overflow, compact mascot sizing, and assistant panel/launcher clearance.
- Typecheck and Neurotech production build passed. No shared product components or backend logic changed.
- No actionable P0/P1/P2 findings remain in the reviewed sizes and states. The assistant dialog intentionally appears over the page when opened. Live provider response quality, a real membership checkout and database mutations are outside this visual fix.

---

# Neurotech editorial redesign QA - 15 October 2026

final result: passed

## Source and final evidence

- Approved attachment: C:/Users/JOSHUA~1/AppData/Local/Temp/codex-clipboard-0961bac6-b50b-4235-a7ff-b94825ccc5a8.png, copied to output/playwright/neurotech-editorial/reference.png (838 x 1877).
- Pre-release local preview: http://127.0.0.1:4453/ in the isolated codex/neurotech-editorial worktree. Subsequent publication evidence is recorded separately in output/neurotech-release-2026-10-15/.
- Final desktop capture: output/playwright/neurotech-editorial/final/editorial-1440-full.png (1440 x 3306). CSS viewport 1440 x 1000, device scale factor 1.
- Full comparison: output/playwright/neurotech-editorial/comparison-full-final.png. The implementation is normalized to 838 x 1924 with preserved aspect ratio beside the source.
- Focused comparisons: output/playwright/neurotech-editorial/comparison-hero-final.png and comparison-contact-final.png.
- Responsive captures: output/playwright/neurotech-editorial/final/editorial-{320,390,838,1024,1440,1920}-{full,hero}.png.

## Comparison history and fixes

The first comparison (comparison-pass-1.png, implementation 1440 x 3483) exposed five P2 fidelity issues:

- The curved hero transition was too shallow. Increased the supplied raster wave height and tightened the introduction overlap to match the reference rhythm.
- Activity headings were too small. Increased desktop heading scale while retaining unclipped phone typography.
- Shared scoped form styles overrode the intended rounded fields and message height. Increased the specificity of homepage-only form rules.
- Shared social-icon flex sizing shrank the icons. Reset flex basis and matched the reference scale.
- The introduction brain icon was vertically centered rather than aligned beside the heading. Aligned it to the top.

After these fixes, inspected full-page, hero and contact comparisons. A final pass tightened committee and footer whitespace, removed the redundant contact note, and kept functional mobile social labels readable. The mobile review also exposed a legacy minimum height below activity descriptions; removed it and added a regression assertion against excess blank space. The final desktop page is approximately 2.5% taller than the source after normalizing width. No actionable P0, P1 or P2 findings remain.

Production validation exposed a CSS ordering difference: legacy selectors overrode activity paragraph colors/sizes and hero action sizing in the bundled build. Increased the specificity of those three homepage overrides. Added regression checks for at least 4.5:1 journal paragraph contrast, 17px activity copy and 50px hero action height. The new contrast assertion reproduced the initial production failure at 1.20:1 before the correction.

## Fidelity and behavior

- Preserves the actual society logo, existing EEG/activity photography, established copy, membership/social destinations and neuron assistant.
- Implements the navy, ivory and gold palette, serif headings, arched gold photograph, curved transition, neural artwork, alternating activity rows, compact committee roster, gold join strip and navy contact/footer from the selected mockup.
- Uses local display/body fonts and optimized decorative raster assets. Decorative images have empty alt text; content photographs retain descriptive alternatives.
- The existing assistant remains fixed and interactive. Full-page browser captures show it at the first viewport's fixed position; the source presents it beside the footer. This is an intentional functional adaptation.
- Desktop and mobile layouts have no horizontal overflow. Tested hero, join, social and form actions remain within the viewport with targets at least 44 pixels high and wide. No desktop headline/photo overlap was found.
- Functional form labels remain present. The contact form opens a mail app; it does not claim to submit a server-side message.
- Changes are limited to Neurotech app files, a focused responsive regression test and this QA record. Shared society components, backend logic and the primary checkout are unchanged.

## Verification actually run

- npm run build:neurotech: passed after final CSS changes.
- npm run typecheck: passed after generating each app's Astro types in the fresh worktree.
- npm test -- --maxWorkers=1: 50 tests passed across seven files.
- Neurotech launch, closed-application and editorial Playwright coverage: 22 distinct cases passed across the initial run and focused retries. Two initial image-loading failures came from Astro's Windows Sharp loader after a configuration hot restart; restarting the owned preview server resolved both, and both failed cases passed on retry. This is not a claim that one final 22-case run passed without retries.
- Final editorial regression passed again after the last spacing changes at 320, 390, 838, 1024, 1440 and 1920 pixels.
- Browser coverage includes joining links, navigation and keyboard menu behavior, section destinations, contact mailto behavior, social controls, reduced motion, assistant open/close/error/retry/reset and safe reply links, closed committee-application routes and absence of a public CMS. Assistant API response states are mocked.
- No page JavaScript errors were recorded by the responsive regression.
- git diff --check: passed; Windows line-ending notices only.
- Reopened the final in-app preview after the production build and retained it for review.

## Limits and remaining P3 differences

- This section records pre-release local implementation and QA; the later production release is verified separately. No database mutation, real membership checkout or live assistant-provider response was performed.
- No CONVEX_URL is configured for this preview, so committee rendering uses the existing configured signatory fallback. Live backend data acceptance is not claimed.
- Small differences remain in photograph crop, generated neural branches and the exact generated-reference letterforms. The browser implementation uses consistent self-hosted fonts and clean flat color rather than reproducing raster texture.
- The Astro development toolbar is disabled for this app preview so it does not cover the design. Existing reduced-motion behavior remains intact.

---

# Earlier QA records (preserved)

# Agentic Builder Approved Showcase Build — 28 August 2026

final result: passed

## Source Visual Truth

- User-approved Product Design mockup: `C:\Users\Joshua Knott\.codex\generated_images\01a045b3-d0aa-73c0-bed5-0e869fd095c4\exec-78522ac1-5a66-4314-8eaa-f484498961da.png`
- Source dimensions: 1487 x 1058 pixels.
- Target state: the Agentic Builder project modal open on its initial prompt screen, using the official Surrey Artificial Intelligence Society lockup, floating fullscreen and close controls, one central prompt composer, and three visual example prompts.
- Explicit omissions preserved from the approved direction: no Student Project header, no Agentic Builder title strip, no decorative hero icon, no “Idea in. Prototype out.” line, no role/team explanation, and no “How it works” link.

## Implementation Evidence

- Local URL: `http://127.0.0.1:4324/`
- Final desktop modal: `C:\Users\Joshua Knott\Projects\surreysocieties\output\product-design\agentic-builder-modal-desktop-final.png`
- Final mobile modal: `C:\Users\Joshua Knott\Projects\surreysocieties\output\product-design\agentic-builder-modal-mobile-final.png`
- Side-by-side source comparison: `C:\Users\Joshua Knott\Projects\surreysocieties\output\product-design\agentic-builder-comparison.png`
- Desktop viewport/state: 1440 x 1024 at density 1, AI homepage, Agentic Builder project modal open, initial prompt state.
- Mobile viewport/state: 390 x 844 at density 1, AI homepage, Agentic Builder project modal open, initial prompt state.

## Comparison History and Fixes

- P1: The initial implementation still exposed the old internal title bar and role-ready status. The approved opening state now hides that chrome while retaining the existing build-progress and completed-preview states after submission.
- P2: The first layout pass inherited a grid display override that distributed the heading, composer, and examples too far apart. Replaced it with a measured vertical composition matching the source hierarchy.
- P2: The first desktop comparison showed an oversized heading, a narrower composer, and a stronger peach wash than the source. Tightened the display size, matched the composer dimensions, and reduced the background glow.
- P2: The mobile model label clipped. Added a compact `3.7 Flash` label for narrow screens and retuned the control widths without creating horizontal overflow.
- P2: The study and club examples initially inherited muted brand-token colors. Gave the existing Lucide book and people icons distinct sage and blue treatments to match the approved mockup.
- The final side-by-side comparison has no remaining actionable P0, P1, or P2 differences.

## Fidelity and Interaction

- The real Surrey AI Society raster lockup is used; it is not redrawn or approximated.
- The primary paperclip, model, arrow, calendar, book, and people symbols come from the project’s Lucide icon library.
- Example prompts remain functional: selecting Event planner populated the composer with its full prompt, and the field was cleared before the final capture.
- The composer retains file attachment, character limit, live status, and build submission behavior. The model label and server workflow now use Gemini 3.7 Flash consistently.
- Desktop and mobile modal layouts have no horizontal overflow. Controls remain reachable and have explicit visible focus styling and reduced-motion behavior.
- The actual AI generation request was not submitted because a Gemini key is not configured in this local preview; the existing server-side key boundary remains intact.

## Verification

- AI production build: passed.
- Desktop visual QA at 1440 x 1024: passed.
- Mobile visual QA at 390 x 844: passed.
- Initial-state example interaction: passed.
- Browser console errors: none. Only the expected local Clerk development-key warning was present.
- `git diff --check` on touched files: passed; only Windows line-ending notices were reported.

---

# Neurotech Hero Fidelity Amendments — 27 August 2026

final result: passed

## Source Visual Truth

- User-selected reference: `C:\Users\JOSHUA~1\AppData\Local\Temp\codex-clipboard-3033844f-328e-4bc1-885c-7aae80a0455f.png`
- Source dimensions: 864 x 1821 pixels at density 1.
- Amendment target: remove the separate full-width header treatment, integrate navigation into the hero image, align the cream logo block with the forest copy column, improve the supplied logo lockup's apparent size and position, and bring hero text and buttons closer to the reference.

## Implementation Evidence

- Local URL: `http://127.0.0.1:4322/`
- Desktop first viewport: `C:\Users\Joshua Knott\Projects\surreysocieties\output\product-design\neurotech-hero-amendment-desktop.png`
- Desktop full-page capture: `C:\Users\Joshua Knott\Projects\surreysocieties\output\product-design\neurotech-amendment-desktop-full.png`
- Clean full-page evidence: `C:\Users\Joshua Knott\Projects\surreysocieties\output\product-design\neurotech-amendment-desktop-full-clean.png`
- Mobile first viewport: `C:\Users\Joshua Knott\Projects\surreysocieties\output\product-design\neurotech-hero-amendment-mobile.png`
- Focused hero comparison: `C:\Users\Joshua Knott\Projects\surreysocieties\output\product-design\neurotech-amendment-hero-comparison.png`
- Full-view comparison: `C:\Users\Joshua Knott\Projects\surreysocieties\output\product-design\neurotech-amendment-full-comparison.png`
- Desktop CSS viewport: 1091 x 1000 at density 1; screenshot content width 1076 pixels because of the browser scrollbar.
- Mobile CSS viewport: 390 x 844 at density 1; screenshot content measured 375 x 812 pixels with no horizontal overflow.
- The 1076-pixel implementation was normalized to 864 pixels for comparison, producing a 864 x 2530 full-page image. The focused implementation hero crop was 1076 x 608 and normalized to 864 x 488 beside the source's 864 x 465 hero crop.
- The clean full-page evidence replaces the browser full-page capture's fixed-position skip-link paint artifact with the separately captured, browser-rendered first viewport from the same route and state. No page content was redrawn or altered.

## Comparison History and Fixes

- P1: The implementation initially placed a full cream header above the hero, so the laboratory image began below navigation rather than running behind it. Changed the desktop header to an overlay grid that shares the hero's 37/63 split: cream logo block on the left, transparent navigation over the image on the right.
- P2: The supplied logo lockup appeared undersized because its raster contains intentional transparent space. Increased and repositioned the real image asset inside a clipped cream brand region without redrawing or altering the logo.
- P2: Hero actions wrapped into a tall vertical stack at common desktop widths. Tightened button type and padding, removed the unnecessary external-link icon from the first CTA, kept both actions inline on desktop, and retained full-width stacking on mobile.
- P2: The first mobile check showed the long `neurotechnology` line reaching the viewport edge. Reduced the mobile display size and tracking; the final 390-pixel check has no clipping or horizontal overflow.
- Post-fix focused and full-view comparisons show no remaining actionable P0, P1, or P2 differences.

## Fidelity Surfaces

- Typography: the hero now uses the reference's compact three-line headline, smaller supporting copy, and lightweight navigation hierarchy. Desktop and mobile wrapping are deliberate and unclipped.
- Spacing and layout rhythm: the logo block, forest copy area, image, navigation, actions, and fact line now follow the reference's shared hero frame instead of separate stacked bars.
- Colors and tokens: the existing warm cream, deep forest, Surrey yellow, and photographic treatment remain unchanged and match the selected direction.
- Image quality and assets: the exact supplied logo and existing high-resolution EEG laboratory hero remain in use. The logo was only resized and positioned; it was not regenerated or approximated.
- Copy and content: all factual copy is unchanged. Button text is clearer after removing a decorative external-link icon from the hero's join action.
- Accessibility and interaction: skip link, focus rings, reduced-motion fallback, mobile menu states, and semantic navigation remain intact. The mobile menu was opened and closed successfully after the amendment.

## Verification

- Neurotech production build: passed.
- Desktop and mobile visual QA: passed.
- Desktop and mobile horizontal-overflow checks: passed.
- Mobile navigation open/close state: passed.
- Browser console errors: none. Only the expected local Clerk development-key warning is present.
- `git diff --check`: no whitespace errors; only Windows line-ending notices.

---

# Neurotech Showcase Build Design QA — 27 August 2026

final result: passed

## Source Visual Truth

- Selected mockup: `C:\Users\JOSHUA~1\AppData\Local\Temp\codex-clipboard-ffadcda1-ff9e-4293-b0e6-bbb092404819.png`
- Source dimensions: 864 x 1821 pixels.
- Direction: a warm, editorial one-page society showcase with a split laboratory hero, three alternating activity stories, a BCI process feature, a purple society-facts band, updates, one prominent join section, and a compact contact footer.

## Implementation Evidence

- Local URL: `http://127.0.0.1:4322/`
- Final desktop screenshot: `C:\Users\Joshua Knott\Projects\surreysocieties\output\product-design\neurotech-implementation-desktop-final.png`
- Final mobile screenshot: `C:\Users\Joshua Knott\Projects\surreysocieties\output\product-design\neurotech-implementation-mobile.png`
- Side-by-side full-view comparison: `C:\Users\Joshua Knott\Projects\surreysocieties\output\product-design\neurotech-design-comparison.png`
- Desktop viewport/state: 1440 x 1100, public homepage, full-page capture after scrolling through each reveal region.
- Mobile viewport/state: 390 x 844, public homepage, navigation menu opened and closed, full-page capture after scrolling.
- Implementation capture dimensions: 1425 x 3770 pixels. For comparison it was normalized to the source width at 864 x 2286 pixels, preserving aspect ratio.

## Comparison History and Fixes

- P2: The first full-page desktop capture recorded below-the-fold reveal content before it had entered the viewport, leaving blank regions in the screenshot. Scrolled through the full page to exercise the real reveal states, then recaptured the rendered result.
- P2: The initial implementation was noticeably taller than the selected composition. Removed an extra hero eyebrow and tightened activity rows, facts-band spacing, and join-section spacing while retaining readable campus-site proportions.
- P2: The assistant initially reused the wide logo lockup in its circular control. Replaced it with the new square Neurotech brand avatar so the control is legible and consistent with the refreshed identity.
- Post-fix comparison found no remaining actionable P0, P1, or P2 issues.

## Fidelity Surfaces

- Typography and hierarchy: bold Manrope headings, compact labels, and restrained body copy reproduce the mockup's clear student-society hierarchy without repeating the society name in the hero.
- Layout and rhythm: navigation, split hero, early actions, alternating activity rows, BCI pipeline, facts band, update strip, join callout, and footer follow the selected composition in the same order.
- Color and identity: warm cream, deep forest, Surrey yellow, and the Neurotech purple accent are used consistently. The exact supplied Neurotech logo is used in the header and footer, with the matching new avatar in the assistant.
- Image quality and content: five high-resolution, Neurotech-specific images show EEG fitting, BCI work, a journal talk, campus collaboration, and a signal-to-action equipment pipeline. They avoid generic robot, radio-wave, and glossy synthetic-tech imagery.
- Copy: wording is direct and factual, based on the society's established activities and public links. It avoids invented sponsors, attendance figures, research outcomes, and vague technology slogans.
- Responsive behavior: desktop and mobile have no page-level horizontal overflow. Images recrop intentionally, alternating rows stack cleanly, buttons remain reachable, and the mobile menu closes correctly.
- Accessibility and motion: visible focus states, labelled controls, semantic headings, alt text, adequate contrast, and a reduced-motion fallback are present.

## Focused Region Review

Separate crop files were not needed. The hero, all alternating content rows, BCI pipeline, join treatment, footer, and assistant avatar were inspected at full resolution in the final desktop and mobile captures. Each generated source image was also inspected independently before integration.

## Verification

- Neurotech production build: passed.
- Desktop and mobile browser visual QA: passed.
- Mobile navigation open/close interaction: passed.
- Primary join, Instagram, and contact destinations: verified.
- Browser console errors: none. The only messages are expected Clerk development-key warnings in the local environment.
- `git diff --check`: no whitespace errors; only Windows line-ending notices.

---

# Three-Site One-Page Design QA — 25 August 2026

final result: passed

## Scope

- AI: merged overlapping About and What we do content, centred the hero robot, replaced the announcement with aligned activity formats, enlarged project modals, replaced all four project covers, removed public themes, and replaced every source reference to the legacy AI logo.
- Business: reduced the primary journey to About, Activities, and Join on one homepage.
- Neurotech: reduced the primary journey to About, Activities, and Join on one homepage.
- Public `/about`, `/events`, `/committee`, and `/join` routes now redirect to the relevant homepage section. Admin content-management routes remain intact.

## Browser Evidence

- AI final desktop screenshot: `C:\Users\Joshua Knott\.codex\visualizations\2026\08\25\01a03960-4494-7243-9743-f0ec8beae481\surrey-ai-final-one-page.png`
- Desktop QA: 1440x1000 across AI, Business, and Neurotech.
- Mobile QA: 390x844 across AI, Business, and Neurotech.
- All primary anchors cleared sticky headers; mobile menus closed after selection; no page-level horizontal overflow was present.
- All four AI project dialogs opened at the enlarged viewport size and rendered their interactive content.
- All Neurotech activity images completed with non-zero natural width.
- AI assistant toggle and panel use `/logos/brand/surrey-ai-avatar-light.png`; no legacy AI logo source references remain.

## Verification

- AI, Business, and Neurotech production builds: passed.
- Root TypeScript project check: passed.
- Full Playwright launch suite: 41 passed.
- Redirect responses: verified as HTTP 302 with homepage hash targets.
- `git diff --check`: no whitespace errors; only existing Windows line-ending notices.
- No actionable P0/P1/P2 findings remain.

---

# Previous Surrey AI Brand Redesign Design QA

final result: passed

## Source Visual Truth

- Combined Product Design target: `C:\Users\Joshua Knott\.codex\generated_images\01a03960-4494-7243-9743-f0ec8beae481\exec-3420605b-d3f5-4dbe-8da8-a961b251cc9f.png`
- Brand source: the supplied Surrey Artificial Intelligence Society brand kit using near-black `#111111`, orange `#FF4A00`, and warm white `#FAF8F3`.
- Selected direction: the dark editorial hero, orange humanoid AI image, early event agenda, warm project grid, responsible-AI band, orange join CTA, and official logo lockups.

## Implementation Evidence

- Local URL: `http://127.0.0.1:4321/`
- Desktop screenshot: `C:\Users\Joshua Knott\.codex\visualizations\2026\08\25\01a03960-4494-7243-9743-f0ec8beae481\surrey-ai-redesign-desktop.png`
- Mobile screenshot: `C:\Users\Joshua Knott\.codex\visualizations\2026\08\25\01a03960-4494-7243-9743-f0ec8beae481\surrey-ai-redesign-mobile.png`
- Side-by-side comparison: `C:\Users\Joshua Knott\.codex\visualizations\2026\08\25\01a03960-4494-7243-9743-f0ec8beae481\surrey-ai-design-comparison.png`
- Viewport/state: desktop 1440x1000 and mobile 390x844, public homepage, light mode.

## Findings and Fixes

- P2: The two compact programme labels initially clipped because a higher-specificity grid rule constrained their copy columns. Fixed with an explicit compact-card grid rule and remeasured in the browser.
- P2: Project cards lacked the mockup's visible action treatment. Added a consistent orange `Open project` label while preserving the existing modal interaction.
- P2: The first humanoid hero pass used one 1200px source at every viewport. Added an 828px mobile source and matched Three.js texture selection to the responsive image.
- No actionable P0/P1/P2 findings remain.

## Fidelity Surfaces

- Typography and hierarchy: the heavy, tightly spaced editorial headings and orange emphasis closely follow the selected visual target.
- Layout and rhythm: split hero, overlapping event strip, four-up projects, pathway grid, responsibility band, join CTA, and footer all track the mockup structure.
- Color and identity: the approved palette and official logo/avatar assets are used throughout public navigation, content, footer, favicon, focus states, and controls.
- Image fidelity: the rejected round robot is not used. The hero uses the approved mockup-like humanoid profile and a generated orange/black Neural Beat Lab thumbnail.
- Responsive behavior: no page-level horizontal overflow at 390px; projects intentionally use an accessible horizontal card rail; join and event actions stay visible early.
- Interaction: mobile menu, project dialog, theme toggle, assistant, join link, skip link, reduced-motion mode, and all public routes were verified.

## Verification

- `npm run build` in `apps/ai`: passed.
- AI public launch checks: 14 passed.
- Browser console errors on the final homepage: none.

---

# Neurotech Option 2 Design QA

final result: passed

## Source Visual Truth

- Source mockup: `C:\Users\Josh\.codex\generated_images\019e943f-69a2-7353-a819-f4f5cf7cff19\ig_0bf2fbb41f77150b016a21dc2c7dd881918aa020316134fda3.png`
- Selected direction: Student Discovery Lab, the lighter and more student-friendly option 2.

## Implementation Evidence

- Local URL: `http://localhost:4325/`
- Desktop screenshot: `C:\Users\Josh\Projects\surreysocieties\output\playwright\neurotech-option2-implemented-desktop.png`
- Mobile screenshot: `C:\Users\Josh\Projects\surreysocieties\output\playwright\neurotech-option2-implemented-mobile.png`
- Mobile journey screenshot: `C:\Users\Josh\Projects\surreysocieties\output\playwright\neurotech-option2-implemented-mobile-journey.png`
- Mobile activities screenshot: `C:\Users\Josh\Projects\surreysocieties\output\playwright\neurotech-option2-implemented-mobile-activities.png`
- Full-view comparison: `C:\Users\Josh\Projects\surreysocieties\output\playwright\neurotech-option2-comparison-desktop.png`
- Viewport/state: desktop 1440x1024 and mobile 390x844, public homepage, single public visual mode.

## Findings

- No actionable P0/P1/P2 findings remain.

## Fidelity Surfaces

- Fonts and typography: Fraunces and Inter preserve the mockup's editorial display plus readable body pairing. Desktop headline hierarchy is close; mobile wraps cleanly without one-word lines.
- Spacing and layout rhythm: Hero, journey cards, and activity cards now follow the option 2 structure. Desktop includes the next section hint; mobile stacks without overlap.
- Colors and tokens: Pale mint/off-white surfaces, deep navy text, teal signal accents, and gold CTAs match the selected direction while preserving Neurotech tokens and single-mode behavior.
- Image quality and asset fidelity: New generated hero and activity assets replace the darker/technical imagery. The page now uses real raster assets for the community hero, talks, workshops, projects, and socials.
- Copy and content: Copy is less technical and avoids fake lab, equipment, research outcome, sponsor, or attendance claims.

## Focused Region Comparison

Focused separate crops were not needed after the desktop full-view comparison and mobile section captures: the primary fidelity areas were the hero, journey cards, generated image assets, CTA treatment, and responsive stacking, all visible in the captured evidence.

## Patches Made Since QA

- Replaced the dark/cinematic homepage hero with the selected option 2 light student-discovery structure.
- Generated and wired in five new Neurotech assets for the hero and activity cards.
- Updated first-section copy to be student-friendly and less technical.
- Added responsive CSS for the light nav, hero image treatment, journey cards, and activity cards.
- Tuned desktop hero height/crop and mobile headline sizing after screenshots.

## Follow-up Polish

- P3: If desired, the nav can be extended with a `Focus Areas` anchor to match the generated mockup even more closely, but the current route set remains consistent with the existing site.

---

# Previous Agentic Builder Design QA

Final result: passed

## Reference Direction

Selected Product Design direction:

- Implement the cleaned-up Warm Guided Canvas mockup for the actual Agentic Builder tool.
- Keep the UI light, minimal, polished, accessible, and less technical.
- Remove the Drafting status treatment.
- Use faster Gemini Flash language instead of slow timing copy.
- Keep only two views: Preview and Build steps.
- Keep practical actions: Share, New build, Close.
- Remove the bottom marketing-style quality checklist.

## Checks Run

- `npm run build:ai` passed.
- Opened the AI homepage locally and launched the Agentic Builder project modal.
- Confirmed the tool renders as a light workspace inside the modal.
- Confirmed the legacy modal close button is hidden for this tool so actions do not overlap.
- Confirmed only Preview and Build steps tabs are present.
- Confirmed removed labels are absent: Drafting, Notes, Details.
- Confirmed Share, New build, and Close actions are present.
- Checked browser console errors after opening the modal: none found.

## Notes

- The existing server-side AI boundary is preserved: Gemini keys remain server-side only.
- The Agentic Builder API still depends on local/deployed AI environment configuration being present.

---

# AI, Business and Neurotech refinement — 12 September 2026

Local refinement of the existing three sites. Existing imagery, branding and overall design directions were retained. No commits, pushes, deployments, backend changes or member-data mutations were made.

## Review scope and evidence

- Inspected the three homepages, navigation, activities, event discovery, joining, footers, About, Committee, Events and Join pages on desktop and mobile, plus 404 and relevant public error states.
- Evidence is in `output/refinement-2026-09-12/`: `before/`, `pass1/`, `after/`, `verified/`, and `comparisons/`. The ignored `review.html` provides ten before-and-after comparisons and selected interaction captures.
- Local previews: AI `http://127.0.0.1:4321/`, Business `http://127.0.0.1:4322/`, Neurotech `http://127.0.0.1:4323/`. All returned HTTP 200 at handoff and were left running. The evidence viewer is at `http://127.0.0.1:8765/`.
- Desktop browser targets were 1440×1000 and 1280×720; mobile was 390×844, with an additional 320px overflow check. The in-app browser's screenshot dimensions differ slightly from its requested viewport. Each homepage comparison uses matching capture dimensions. Neurotech tablet navigation was additionally inspected at 900px.

## Significant changes

- All societies: restored the authored secondary routes that previously redirected to the homepage. Navigation and assistant recovery links now make Events and other useful pages discoverable. Mobile menus support Escape and close correctly when returning to desktop width.
- AI: fixed mobile menu containment and contrast; retained complete headline phrases; shortened repetitive copy; restored the event preview and events listing; made Union membership the primary closing action; improved project-card alignment and footer wrapping at 320px. The raw redirect statement previously displayed on Committee is removed. Three.js robot ownership and reduced-motion behaviour are preserved.
- Business: preserved the navy, cream, gold and serif identity; refined secondary-page spacing, heading hierarchy and small-text contrast; prioritised browsing events; improved menu state feedback and joining copy; omitted the empty historical committee block when there are no records.
- Neurotech: brought secondary pages into the current Manrope, forest, purple and yellow direction; fixed headline wrapping, secondary navigation contrast and the 404 header; changed tablet navigation before links wrap; corrected the actual BCI image selector so its diagram and three descriptions remain visible without the large mobile gap; kept reveal content readable from the start.
- Shared assistant: empty submission is disabled, controls have usable touch targets, sending/reset states are consistent, HTTP errors expose useful recovery links, and a late response no longer steals focus after the panel is closed. Loading, error, retry and reset verification used mocked responses.

## Two deliberate critique passes

1. Major layout and usability: reopened the rendered pages after the first implementation. Corrected excessive whitespace on restored pages, old Neurotech secondary-page styling, broken mobile menu layout, confusing event actions and redundant AI joining content.
2. Detail and consistency: rechecked desktop/mobile pages and interactions. Refined heading weights, labels on light surfaces, button contrast, disclosure feedback, project-card alignment, footer wrapping, the BCI diagram, and Neurotech desktop/tablet navigation. Stopped where remaining alternatives were subjective.

## Verification results

- `npm run typecheck`: passed.
- `npm test`: passed, 37 tests across five files.
- `npm run build:all`: passed. AI and Neurotech builds were repeated after their final CSS changes and passed; Business had no subsequent source changes.
- Chromium E2E: 45 distinct cases are green across the complete run and focused follow-ups. The initial 44-case run passed 43 and found a 9px AI footer overflow at 320px. After the fix and added BCI coverage, the five affected/new cases passed. Two affected Neurotech navigation/membership cases passed again after the tablet header change. This is not a claim that one final 45-case suite was rerun.
- Browser inspection covered menus, focus, Escape, resizing, reduced motion, native FAQ open states, empty events, membership link destinations, and opening/closing all four AI project dialogs. Hover and mocked assistant loading/error captures were inspected.
- `git diff --check`: passed. No authorization or backend code changed.

## Limits

- No live assistant/provider generation, real membership checkout, event registration or admin mutation was performed. AI project dialogs were inspected without running paid generation, full gameplay or audio sessions.
- Connected public event listings were empty. Populated event layouts and Neurotech filtering were not exercised against event records.
- This was local visual and functional QA, not a production deployment or a full accessibility/performance audit. Existing build warnings remain for deprecated Vite dependency-optimization options and the large AI client chunk.
- Some browser captures include the Astro development toolbar. It is preview tooling, not society content.

## 2026-09-23 assistant refresh

- Compared the approved AI, Business and Neurotech assistant mockups with local open and replied states at 1440×900 and 390×844. Captures are `output/assistant-preview-{ai,business,neurotech}-{desktop,mobile}.png` and corresponding `-reply.png` files.
- Each launcher and panel header reuses its site's actual logo, as requested. Each panel has three society-focused starters; social, committee and membership answers include clickable verified links. The panel stays in the mobile viewport and scrolls its conversation content.
- `npm run build:all`, `npm run typecheck`, 33 unit tests, nine focused Playwright checks and real local membership endpoint requests all passed. No domain deployment was performed.

final result: passed

## 2026-10-08 Business committee and social refinement

- Result: released and verified at `https://surreybusinesssociety.org`. Runtime source commit `132154e9008053e10f0e7fb61f14c01b8d14f463`; production deployment `dpl_5E2n58sBhVSJRLnYEwnNnno32VPL` in the `surrey-business-society` project. Separate PR: https://github.com/joshuasknott/surreysocieties/pull/23.
- Layout: roomier notebook committee, integrated yellow WhatsApp strip, fawn assistant and clear student-line/microphone spacing. All eleven public names and roles, membership destinations and email contact remain present. Shared layout extensions are optional; AI and Neurotech retain their default header, footer and launcher.
- Socials: prominent Instagram gradient, LinkedIn blue and WhatsApp green icons in the desktop header, join menu and labelled footer. TikTok has a visible black tile in the join menu. Phone footer buttons align at equal widths with a gutter beside the mascot; click targets measure 52px high.
- Responsive repairs: increased notebook gutters from the binding and desktop mascot; tablet join copy sits above the pencil. Phone pencil artwork now follows the copy in normal document flow, with an E2E regression assertion at 320/390px. The narrow Networking heading fits both Windows and Linux fallback fonts.
- Builds/checks ran in Vercel's build environment to avoid competing local heavy workloads. `npm run build:all` passed at `7e4c6a2`; AI/Neurotech runtime sources did not change afterward. `npm run typecheck` and all 50 unit tests passed at `063d7b7`. Final Business build and all 17 Business E2E checks passed at `132154e` using one worker and no retries.
- E2E covers section anchors, roster/artwork at 320/390/768/1440px, overflow, branded social controls, contact email, keyboard menu/skip link, reduced motion, assistant open/close/loading/error/retry/reset/reply links, public metadata and unavailable admin routes. Assistant API reply states are mocked; provider response quality was not assessed.
- Live verification on 8 October 2026: apex homepage HTTP 200 with Business title/content and correct social/email destinations; www HTTP 308 to the apex; mascot HTTP 200 and SHA-1 matching the approved asset. Live browser checks at 390px and 1024px confirmed clear copy/action/pencil spacing, loaded artwork, all eleven names without overflow, working assistant and branded menu controls. No console errors were recorded.
- Live screenshots: `C:/Users/Joshua Knott/Projects/surreysocieties/output/business-recovery-2026-10-08/business-live-desktop.jpg` (1024x900 CSS viewport) and `business-live-phone.jpg` (390x844 CSS viewport). HTTP evidence is in the same folder's `live-http-check.json`. Browser viewport override was reset after inspection.
- Installation limitation: a clean `npm ci` exposed a pre-existing missing optional `@emnapi/runtime` lock entry. Verification used the project's configured `npm install`. Temporary remote browser verification added missing Linux libraries; project runtime/dependency manifests were not changed.
- Recovery provenance: the previous preview checkout disappeared after an interrupted run. Restored 24 selected source/artwork files from unpromoted deployment `dpl_HUQ4f5HzbwUB6gPjv1MFkpAW81tu`, verifying each uploaded SHA-1. Retained current upstream application fixes and the root QA history above. Earlier interrupted-run results are superseded by the release checks recorded here.
- Checkout: `C:/Users/Joshua Knott/.codex/worktrees/business-committee-refinements/surreysocieties`; branch `codex/business-committee-refinements`. The primary checkout's unrelated work remains preserved.

Business release result: passed.

---

# Business editorial hero — 6 October 2026

final result: passed

Source: C:/Users/JOSHUA~1/AppData/Local/Temp/codex-clipboard-2bf27b0f-6559-45bb-881d-5a60419aa837.png (1672 x 941).
Local implementation: http://localhost:4322/, homepage at scroll top.
Intentional differences: retain the existing navy top navigation; omit the gold SURREY BUSINESS SCHOOL eyebrow. The physical building signage remains part of the photograph.

Evidence (under C:/Users/Joshua Knott/Projects/surreysocieties/output/business-hero/):
- desktop-exact.jpg: in-app browser, CSS viewport 1672 x 941, devicePixelRatio 1; browser capture returned 1650 x 933 pixels.
- comparison.png: source left / implementation right, each normalized to 836 x 471 for composition comparison. Small capture scaling differences were excluded from findings.
- mobile-final.jpg: 390 x 844 CSS viewport, density 1.
- mobile-320-final.jpg: 320 x 740 CSS viewport, density 1.
- desktop.jpg and mobile.jpg preserve earlier capture evidence.

Fidelity review:
- Typography: Georgia reproduces the large, regular-weight editorial serif, two-line desktop heading, serif supporting copy and button labels. The existing navigation typography stays unchanged by request.
- Layout: full-width photo, lower-left content, generous spacing, two visible actions; small-screen text wraps to three lines with stacked full-width buttons. No horizontal overflow at 320 or 390; existing E2E checks also cover 768 and 1440.
- Colors: navy photographic shading, ivory text, gold primary button, ivory outline secondary button. Added restrained desktop shading for legibility against the brick facade.
- Images: generated a photo-only asset from the selected mockup, preserving the building, golden tree and statue composition; optimized WebP is 348868 bytes. No UI is baked into the background.
- Copy: exact selected headline, Talks/workshops/socials supporting copy, Join the society and Explore events; no school eyebrow.
- Full-view comparison and full-resolution individual captures were reviewed together. Separate focused crop was unnecessary because the only changed controls and typography are large and legible in these captures.

Iteration history:
- P2: initial mobile source was only 390px wide and visibly soft after object-fit cropping. Corrected responsive image sizes; verified naturalWidth 1440 and sharp final mobile capture.
- P2: at 320 x 740 the existing fixed assistant overlapped the second hero button. Adjusted mobile height and vertical padding; mobile-320-final.jpg confirms the button is clear of the launcher.
- No remaining actionable P0/P1/P2 findings. Expected minor generated-photograph variation and preserved navigation differ from the mockup intentionally.

Interaction and checks:
- Explore events clicked in the in-app browser; URL became /#activities and target top was 96px, below the sticky navigation.
- Union destination remains unchanged; accessible links have visible focus styling and external-link protections.
- Browser console error list was empty.
- Business build passed. Initial Business E2E run: 16 passed, one obsolete Linktree expectation failed. Updated that existing test for the Business events anchor; rerun passed on all three societies.
- Standard E2E startup could not reuse IPv6 localhost servers through its hardcoded IPv4 URL. Tests used an ignored output-directory copy with localhost URLs and no server startup, leaving running previews intact.
- Shared layout hash remained d5ab49ade697aa6dcbb6ba8a2cbc8294dfb92a8a; no topnav source changes.
- Local verification only; no deployment.

---

# AI Curious Forms static hero — 6 October 2026

final result: passed (static visual implementation; operational form limitations below)

## Reference and scope

- Selected source: C:/Users/JOSHUA~1/AppData/Local/Temp/codex-clipboard-fd5371bf-82de-4baf-9329-a96a0b581973.png, 1672 x 941.
- Local implementation: http://localhost:4321/, AI homepage at scroll top.
- Preserved the actual society logo and existing #FF4A00, #111111 and #FAF8F3 brand tokens. Kept navigation, headline, supporting copy and actions as HTML with accessible names and keyboard controls.
- Artwork was prepared separately from the reference, without baked-in copy or controls: desktop WebP 140602 bytes, portrait WebP 94978 bytes. Phones and portrait tablets request the portrait composition at appropriate resolutions. No canvas, video or flowing animation is mounted in the hero.
- Kept the existing assistant launcher. The committee strip follows the hero; committee routes retain their existing sticky header/strip. The mockup's concept number and title are intentionally omitted from the public page.

## Evidence and comparison

Evidence directory: C:/Users/Joshua Knott/Projects/surreysocieties/output/ai-hero/.

- reference.png is the supplied source; e2e/ai-curious-forms-1672.png is the final actual browser capture at exactly 1672 x 941, density 1.
- comparison-final.png puts source left and browser result right, each normalized to 1003 x 565. Both images were inspected together in one visual input.
- comparison-type-controls.png compares matching full-resolution crops (x415, y205, 875 x 600) of the headline, supporting copy and buttons. Inspected together after the final type refinement.
- Final responsive captures: e2e/ai-curious-forms-{1440,1024,768,390,320}.png. Viewports were 1440 x 900, 1024 x 1366, 768 x 1024, 390 x 844 and 320 x 740. All were inspected during iteration.
- Earlier desktop-v1.jpg, desktop-v2.jpg, comparison-v1.png and comparison-v2.png retain the initial comparison evidence. The final PNGs come from Chromium E2E; the initial in-app-browser JPEGs have slight capture scaling/softness and were not used for final pixel placement.

## Fidelity and iteration

- Layout: matched the large central three-line heading, surrounding cropped forms, wide top navigation and side-by-side desktop actions. Phones use the same materials arranged around a clear center, two navigation rows and stacked actions where needed.
- Materials and colors: preserved the transparent glass loop and sphere, glossy orange form, black reflective tube, warm background and contact shadows. The image edit closely retains the source composition; shader/mesh equivalence is not claimed.
- Typography: compared Fredoka, Lilita One and Baloo 2 in the browser. Selected a locally served Baloo 2 800 Latin font (30600-byte WOFF plus OFL license), with static letter rotations, spacing and subtle stroke to approach the reference's weight. The accessible H1 is read as one complete sentence.
- P2 fixed: the initial headline was undersized and misplaced. Iterated desktop size, letter placement, line spacing and the gap before the supporting copy/actions against the source.
- P2 fixed: portrait tablets initially cropped away most artwork and left a large empty region. Added portrait art selection, larger centered type and a soft header backing to protect logo/navigation legibility.
- P2 fixed: initial live type had noticeably different B, Q and dot shapes. Replaced it after a three-font comparison and repeated the focused source/browser review.
- No remaining actionable P0/P1/P2 visual findings. P3: individual generated glyph contours, especially the Q tail, remain approximate rather than pixel-identical. The source is an image, while the implementation uses selectable accessible text.

## Verification

- npm run typecheck passed; npm test passed (47 tests across seven files).
- npm run build:all passed after the shared layout change. npm run build:ai passed again after the final font/artwork/CSS changes. The existing large-client-chunk warning remains.
- Final focused Chromium run: all 19 AI public-launch and committee-strip checks passed. Includes all six viewport sizes, loaded artwork/font, no horizontal overflow, accessible heading, 44px minimum control targets, section anchors, Join dropdown keyboard/Escape/outside dismissal, reduced-motion mode and mobile artwork request selection.
- Full three-site E2E run initially passed 55/62. The obsolete AI homepage sticky-strip expectation was updated to test the new hero/strip order plus preserved sticky behavior on committee pages, then passed. The remaining six failures are AI/Neurotech form-field expectations: local pages intentionally show “Submissions will open when secure email delivery is connected” because their existing email configuration gate is unmet. No form submissions or configuration changes were attempted.
- All Business and Neurotech public-launch checks passed in that full run. Existing unrelated Business changes were preserved.
- E2E_HOST is now an optional test-host override, preserving 127.0.0.1 by default. Verification used E2E_HOST=localhost to reuse the existing IPv6 local previews without disrupting them.
- git diff --check passed. No backend or member-data changes, commits, pushes or deployments. Flowing animation awaits review of this static version.

---

# AI Flow full homepage — 6 October 2026

final result: passed

## Reference, state and evidence

- Source visual truth: `output/ai-flow/approved-mockup.png`, copied from the user's selected `codex-clipboard-f302c69b-442b-4568-b043-5f3a189a4a92.png`; 725 x 2170 pixels. The source depicts a desktop composition, not a 725px responsive breakpoint.
- Local implementation: http://127.0.0.1:4321/, AI homepage, light/orange/black palette, assistant closed. User specifically requested compact icon branding instead of the rectangular header/footer lockups.
- Final full-page browser evidence: `output/ai-flow/e2e/ai-home-desktop.png` (1440 x 4531 pixels; 1440 x 900 CSS viewport, deviceScaleFactor 1) and `output/ai-flow/e2e/ai-home-mobile.png` (390 x 4824 pixels; 390 x 844 CSS viewport, density 1).
- `output/ai-flow/comparison-final.png` combines the source on the left with the actual desktop capture on the right, each normalized to 725px wide. Reviewed in one visual input. Section positions differ because the existing active committee application strip remains present and the real form retains visible labels.
- Focused source/browser comparison: `output/ai-flow/comparison-footer.png`, including contact controls, branding and mascot. Source crop is 725 x 520; the actual 1440 x 900 desktop viewport is normalized to 725px wide. This is a region comparison, not a claim of identical crops or pixel positions.
- Additional actual browser captures: `desktop-footer-final.png`, `mobile-footer-final.png`, `mobile-assistant-final.png`, `mobile-320-activities.png`, `tablet-activities.png`, and `tablet-footer-final.png`, all under `output/ai-flow/`. In-app-browser captures include the Windows scrollbar; Chromium test captures do not.
- Manually inspected the hero/header, activity cards, committee, join, contact/footer and assistant at desktop, 768px tablet, 390px phone and 320px phone sizes. Existing hero checks additionally cover 1672, 1024 and reduced motion.

## Fidelity surfaces

- Fonts and typography: retained the locally served Baloo 2 800 display face and Inter UI/body text; large rounded section headings continue the hero's hierarchy. Static tilts give headings the selected character without animating reading text. Small controls remain readable, committee names wrap, and mobile headings do not truncate. Handwritten side notes use Segoe Print with fallbacks.
- Spacing and layout: cream/orange/cream/black/cream/black sequence, broad curved section boundaries, three organic activity cards, three officer badges, two join steps and three contact columns follow the reference. Phone layouts become rows or a single column; footer links keep space for the fixed mascot. The existing application strip is intentionally retained.
- Colors and tokens: #FAF8F3 paper, #FF4A00 orange, #111111 ink. Dark text on orange controls intentionally provides stronger contrast than the reference's white labels. Keyboard focus remains visible, including against the black join section.
- Images and assets: retained the approved existing hero artwork. New optimized alpha WebP glass forms, orange objects, black officer badge and star mascot follow the reference materials. Official light/dark AI icon assets supply header/footer branding; no generated approximation of the society logo is used. Decorative imagery has empty alt text and no embedded UI text.
- Copy and content: retained the selected section headings and supporting copy. Real society configuration supplies membership/social destinations and signatories, with the existing public committee query retained. Name/email/message labels and honest email-app helper text remain visible. The assistant is the existing accessible widget with a new launcher image, not a disconnected illustration.

## Findings and comparison history

- P2 fixed: the first comparison (`comparison-first.png` / `desktop-first.png`) showed undersized lower-page headings, shallow curves and square form inputs. Increased display sizes, fitted the generated wave mask to its silhouette, and corrected selector specificity for pill-shaped fields. `comparison-final.png` and `comparison-footer.png` confirm the revised hierarchy and shapes.
- P2 fixed: the first generated president star was too slender for readable initials. Replaced it with the plump five-point orange badge; final full-page and committee captures confirm a clear JK badge.
- P2 fixed: the mobile assistant panel used viewport width including the Windows scrollbar, extending beyond the content area. Changed its width to `calc(100% - 24px)`. Final browser measurements at a 390px viewport are left 12px, right 363px within a 375px content area; `mobile-assistant-final.png` confirms the panel and controls fit.
- Preview-only fault resolved: Astro's development reload briefly returned failed image transforms. Restarted the AI preview, then confirmed loaded images visually and reran all 18 AI public checks successfully. This recovery is not counted as a design iteration.
- No remaining actionable P0/P1/P2 findings. P3: generated form contours and lighting, individual glyph shapes, handwritten notes and the exact wave phase are approximate. The transparent loop on the dark section is lighter than the reference. These do not prevent the selected style or content from carrying through the page.
- Intentional adaptations: compact official icons with readable society text in header/footer; mobile reflow; retained application strip; persistent form labels; fixed assistant placement; actual external destinations and accessible control sizing.

## Verification and handoff checklist

- [x] `npm run typecheck` passed.
- [x] `npm test` passed: 47 tests across seven files.
- [x] `npm run build:all` passed; `npm run build:ai` passed again after the final assistant width change. Existing large-client-chunk warning remains.
- [x] Public-launch suite: all Business and Neurotech checks passed. After fixing an obsolete assistant-image assertion and restarting the AI preview, all 18 AI public checks passed. The three AI assistant checks passed again after the final width fix.
- [x] Browser coverage includes anchors, loaded branding/art, overflow, Join dropdown keyboard/Escape/outside dismissal, contact email draft, social links, skip link, reduced motion, assistant open/close/focus and mocked loading/error/retry/reset/reply links. No real messages or forms were sent.
- [x] Latest in-app browser console error list was empty. Real assistant-provider response generation was not retested; backend behavior is unchanged.
- [x] `git diff --check` passed. Existing unrelated working-tree changes were preserved.
- [x] Local AI preview remains available at http://127.0.0.1:4321/. No commit, push or deployment.

## Follow-up: launcher, footer and header corrections

final result: passed

- User evidence: `codex-clipboard-5f3c5b96-1b29-45f3-b50c-176aaed667f0.png` (label overlap), `codex-clipboard-032e5a7d-a468-446f-8334-20f1803aaa8c.png` (oversized footer), and `codex-clipboard-cb8c0991-fd4b-40ea-8409-598d665bd98a.png` (cream logo box), supplied on 6 October 2026.
- Corrected the previously missed launcher overlap: the Ask AI label now sits above the entire mascot image with 4px bounding-box clearance at both desktop and phone sizes, and has an explicit stacking order.
- Reduced the footer body to 122px at 1920px desktop width, with a 90px maximum wave. Tightened padding, icon size and metadata layout while retaining 44px links. The 390px footer is 212px plus its 40px wave and has no horizontal overflow.
- Reused the existing official transparent logo asset, framing only its left icon using object-fit/object-position. The cream square is gone, including where the header overlaps the glass artwork at the user's 2423px wide viewport. No logo was regenerated or redrawn.
- Inspected actual wide desktop and phone views. Evidence: `output/ai-flow/polish/desktop-header.png`, `wide-header.png`, `desktop-footer.png`, `mobile-footer.png`, and updated Chromium captures in `output/ai-flow/polish/e2e/`.
- AI build passed; all 18 AI public browser checks passed; `git diff --check` passed. Latest browser console error list was empty. The local preview remains open; no deployment.

## AI committee planner — 15 October 2026

final result: passed

- Target: the approved minimal committee board, publishing review, and homepage programme mockups from this chat. The existing AI homepage hero and society identity are retained.
- Compared the actual board and publication screenshots with their source mockups in combined inputs: `output/planner/comparison-board.png` and `comparison-publication.png`. Inspected desktop at 1440×1024, mobile at 390×844, and overflow at 320px.
- Fixed P2: the full brand lockup was too small in the planner header. Reused the existing transparent asset with the same left-icon crop used on the public site; final desktop and mobile captures show a readable AI mark.
- Fixed P2: public activity routes initially nested a main landmark inside the shared layout. They now use the layout's single main landmark.
- Verified the board, live preview, calendar view, access controls and mobile editor. No remaining actionable P0/P1/P2 layout findings. Intentional adaptations: native keyboard-accessible stage selectors, an Archive view, access controls for admins, a scrollable activity dialog, and compact text-only public project entries.
- Evidence: `output/planner/board-desktop.png`, `board-mobile.png`, `publication-desktop.png`, `publication-mobile.png`, `homepage-programme-desktop.png`, and `homepage-programme-mobile.png`. Programme and authenticated-board captures use temporary test data, not hosted or production events.
- Backend: explicit committee checks on every private operation; separate whitelisted publication snapshots; Ready is private; edits remain drafts until republished; revocation, optimistic revision conflicts, cross-society isolation and safe calendar escaping have regression coverage.
- Checks: 77 unit/backend tests; all six planner browser cases; all 18 AI public launch cases passed across the main run and the focused retry of a navigation timeout. Root and Convex TypeScript checks and all three site builds passed. Existing large-client-chunk warning remains.
- Browser transport fixtures stand in for Clerk sessions and HTTP delivery, while the real Convex functions execute in an isolated test database. Actual local Clerk sign-in UI also loaded successfully. A real committee account, live AI-provider generation and production publication are separate acceptance checks; do not infer them from the fixture tests.
- Release: deployed the AI app and promoted the checked release to https://surreyaisociety.org/. Retained the website's existing Convex backend and Clerk instance; the current Clerk sign-in still identifies itself as Development mode. Existing AI owner/admin access and the Convex JWT template were verified without changing account grants.
- Live checks: homepage and planner return 200 with no-store; planner has noindex/nofollow and renders the real Clerk email sign-in screen. The public JSON feed is empty, the calendar is valid, unknown activity IDs return 404, anonymous AI requests return 401, and anonymous private-board queries are rejected. Evidence: `output/planner/live-verification.json`. No sample activities were inserted into the hosted database. Real-account sign-in, authenticated live AI generation and a hosted content publication remain unexercised.

### Follow-up: sign-in only and owner-managed emails

- Removed the sign-up action from the actual Clerk sign-in component and disabled transfer into sign-up. Confirmed the real local sign-in screen renders only email and Continue.
- Dashboard Settings now contains Committee access only for the authenticated `joshhknott@gmail.com` account. Owner access does not depend on an existing membership row. Other accounts require a manually added email; inherited society roles no longer grant planner access. The owner checks run on Convex reads and mutations, including direct calls.
- Adding an email prepares a reserved Clerk account server-side and grants planner access only after that succeeds. Email verification remains with Clerk at sign-in. Existing accounts are reused; no invitation, password or automatic sign-in is created. Other settings views do not load the private email list.
- Inspected `output/planner/owner-settings-desktop.png` at 1440x1024 and `owner-settings-mobile.png` at 390x844, with an additional 320px overflow check. These owner screenshots use isolated test sessions and sample emails. No actionable layout findings.
- Verification: 88 unit/backend/server tests, all seven planner browser cases, root TypeScript and Convex TypeScript passed. The real Clerk sign-in-only view was also checked locally. Provisioning failures, non-owner direct calls, profile-email spoofing, unverified emails, owner bootstrapping and immediate revocation have coverage. Real-account sign-in and creating a real committee sign-in account remain separate acceptance checks.
- Release checks: the AI build passed and the updated functions were pushed to the website's existing backend. The owner's existing Clerk account and email-code sign-in support were verified read-only. Vercel already has the required server secret. The staged production access endpoint correctly returned 401 without a session; no real committee accounts or grants were created during verification.
- Promoted deployment `dpl_77hUnSxbu2beQxgHNBU8fu6jnkam` to the main domain. Live browser verification confirms the real sign-in screen has no sign-up action. Live HTTP checks confirm the Settings markup, no-store response, removed legacy access toolbar button, working programme endpoint and 401 on anonymous access-management requests. Evidence: `output/planner/owner-live-verification.json`.

### Follow-up: custom email-code sign-in

- Replaced the mounted Clerk UI with a custom email/code form using the Clerk JavaScript sign-in resource. There is no password or sign-up control, provider footer, or development-mode text in the product UI. The lock icon, heading and form share a centre line on desktop and mobile.
- Before asking Clerk to send an email code, the server checks the email against AI planner grants or the owner email. A server-only shared secret protects that check from direct anonymous access. Rate limits cover allowed emails and keyed requester hashes; no raw IP address is stored. Board access is independently checked after verification and on return visits, including if access was revoked while a code was in flight.
- Clerk verifies the code and persists its normal browser session. The app restores that session after reload rather than requiring another code. Signing out removes access; no application JWT or code is put in local storage. Existing Clerk expiry settings still apply.
- Inspected `output/planner/sign-in-desktop.png`, `sign-in-mobile.png`, `sign-in-code-desktop.png`, and `sign-in-code-mobile.png`. Desktop is 1440x1024; mobile is 390x844, with an additional 320px overflow check. The real local Clerk SDK also loaded the custom form successfully. Code-step screenshots use isolated test sessions; no verification email was sent during these tests.
- Verification: 97 unit/backend/server tests, all ten planner browser cases, root and Convex TypeScript, AI build, and whitespace checks passed. Browser coverage includes denied email with no code request, wrong/expired code, resend cooldown, changing email, successful verification, remembered session, sign-out and revocation during sign-in. A public-build scan found no shared-secret exposure. Actual inbox delivery and a real-user verification remain unexercised.
- The actual local server/backend access check accepted the owner and denied an unlisted email after restarting the long-running preview to load its new environment setting. The staged production owner check also returned 200 with `allowed: true`. Promoted deployment `dpl_BezjsLxCb3CCg7jP5KcgyZr67BiL` to https://surreyaisociety.org/. The access-check requests do not send verification emails. Live HTTP evidence is in `output/planner/code-live-verification.json`.

### Follow-up: simpler Ideas and embedded description help

- Ideas now shows only title, description and optional collaborators. Planning reveals practical details and collapsed optional notes/checklists. Ready and Published add the website preview and a list of missing publication details. Returning to Ideas preserves previously entered logistics and private notes.
- Event and hackathon publication requires a date, start time, room/location and booking link; incomplete drafts can still be saved in Ready. Project dates and links remain optional. Collaborators use the existing private owner field and are excluded from public snapshots.
- Removed the standalone AI action/dialog. Description help now uses the current item's title and description, displays a suggestion for review, and changes only the description when explicitly applied. Closing the editor or changing sessions aborts pending suggestions. No real provider request was made during verification.
- Separated the four board lists with bordered, tinted panels, stage accents, item counts and short stage descriptions. Idea cards show their description and collaborators without premature date/task metadata.
- Inspected `output/planner/simple-idea-desktop.png`, `simple-idea-mobile.png`, updated board captures and the mobile publication form. Desktop is 1440x1024, mobile is 390x844, with a 320px overflow check. No actionable layout findings. Authenticated screenshots use isolated test data.
- Verification: 103 unit/backend/server tests, all 11 planner browser cases, root and Convex TypeScript, the AI build and whitespace checks passed. Browser tests cover sparse ideas, preservation across stages, publication requirements, reviewed description suggestions, and existing access/sign-in flows. Provider and Clerk transport are mocked; real Convex functions run in an isolated database. The existing website backend received the updated publication validation without sample content or access-grant mutations.
- Release: checked the staged planner markup and public feed, then promoted `dpl_HEyAfGnr3PKsCgXtezNqSVeTttmR` to https://surreyaisociety.org/. Live checks confirm the new editor markup and board assets, a 200/no-store planner response, a working public programme array, and 401 responses for anonymous AI and access-management requests. Evidence: `output/planner/simple-live-verification.json`. Real signed-in hosted editing and live provider generation were not exercised during this release.

### Follow-up: calendar, compact cards and automatic archive

- Fixed the phone calendar's long list of empty days by showing only scheduled days as an agenda. Desktop retains a complete Monday-first month grid with leading/trailing padding, clearer event blocks, Today/previous/next controls, stage labels and London time. Same-day events sort by start time. Dates can open a new Planning item, and empty/loading/error states have clear actions.
- Calendar history now queries the selected month, including archived records, independently of the active board and the archive list's most-recent-200 limit. It returns a bounded summary; opening an event separately checks committee access before retrieving its private editor details. Requests from older month selections cannot overwrite newer results, and session changes clear the calendar data.
- Added an internal hourly archive sweep at five minutes past the hour. It archives events and hackathons whose date is before the current London date, including in summer/winter time, without deleting their dates, description, collaborators, notes or tasks. Today, future dates, undated ideas, projects and other societies are excluded. Batches are limited to 100 and continue through the scheduler. Archiving removes public snapshots under the existing archive rules, while retaining the private calendar entry.
- Board cards now separate the activity type, title, short description, date/time and location. Removed all per-card stage dropdowns and empty footers while retaining the four section headers. Drag/drop moves private stages; dropping into Published opens the existing review rather than publishing directly. The editor retains its stage selector for keyboard and touch access.
- Inspected desktop at 1440x1024, mobile at 390x844, and overflow at 320px. Evidence: `output/planner/calendar-before-desktop.png`, `calendar-before-mobile.png`, `calendar-desktop.png`, `calendar-mobile.png`, `calendar-empty-mobile.png`, `cards-desktop.png` and `cards-mobile.png`. Authenticated screenshots use isolated test data. No remaining actionable layout findings.
- Verification: 107 unit/backend/server tests, all 14 planner browser cases, root and Convex TypeScript and whitespace checks passed. New cases cover London date boundaries, idempotent/batched archiving, archive retention beyond the list limit, month/year navigation, retry and stale responses, editing archived notes, creating from a calendar date, and drag/drop without card dropdowns or implicit publication. Clerk transport remains mocked in these private browser tests; real Convex functions run in an isolated database.
- Release: the AI build passed with the existing large-client-chunk warning. Pushed the new month/date indexes, protected queries and hourly archive job to the website's existing Convex backend. Checked the staged planner and client bundle, then promoted `dpl_8hu1mny6BF2ENuMRpQ3PA5JTvSEN` to https://surreyaisociety.org/. Live HTTP checks confirm the new assets, mobile agenda styles, retained column headers, removed card dropdowns, a working public programme feed, and rejection of anonymous private-calendar/AI requests. An initial live archive sweep completed and found zero past events. Evidence: `output/planner/calendar-live-verification.json` and `archive-sweep-live.txt`. No sample content or access grants were created in the hosted database; signed-in hosted editing remains separate from the fixture browser acceptance.

### Follow-up: homepage programme simplification

- Removed the Calendar feed link and Projects to join panel from the homepage Coming up section. Events now use the full section width. Removed the corresponding client refresh branch and obsolete panel/grid styles so subsequent public-feed refreshes work without the removed elements.
- Inspected the updated programme at 1440px desktop and 390px mobile using `output/planner/homepage-programme-desktop.png` and `homepage-programme-mobile.png`. Screenshots use isolated published test activities. No new layout defects or horizontal overflow.
- Root TypeScript, both affected existing planner/publication browser cases, the AI build and whitespace checks passed. Publishing, revising and unpublishing still update the homepage correctly. No backend data or access changes were needed.
- Promoted `dpl_7DTHaegmTjFv9dpd7mqtJsWB3NKg` after checking its staged homepage. Live homepage verification confirms both requested elements and the split-column wrapper are removed, with the event list retained. Evidence: `output/planner/programme-simple-live.json`.

### Follow-up: card ownership, preview and private comments

- Cards now open a compact reading view with their description, confirmed details, initials avatars and a comment thread underneath. Edit opens the existing progressive detail form; closing it returns to the card. Unsaved comment text survives that transition. Board cards retain drag/drop and use avatars plus an optional comment count instead of text contributor lines and action footers.
- Creators and unique editors are recorded server-side from authenticated accounts. Saves, stage changes and publishing add an editor; comments and automatic archiving do not. Existing author metadata is optional for compatibility. The internal audit-history backfill restored attribution on three hosted cards and returned zero changes on a repeat run. It does not infer authorship from freeform collaborator text or change content revisions.
- Comments live in an indexed, separately paginated table. Every read/write checks AI committee access and item ownership. Authors are server-derived; text is limited to 2,000 characters and rendered as plain text. Idempotency keys prevent duplicates after a committed request loses its response. Comment counts do not advance the content revision or change public snapshots. Archives retain their discussion.
- Inspected `output/planner/card-preview-desktop.png`, `card-preview-mobile.png` and the updated board captures at 1440x1024 and 390x844, with a 320px overflow check. These images use isolated test sessions and comments. No actionable layout defects remained.
- Verification: 113 unit/backend/server tests, all 16 planner browser cases, root/Convex TypeScript and whitespace checks passed. The two discussion cases passed again after guarding posting during a pending history load. Coverage includes attribution deduplication, historical backfill, pagination, retry without duplicates, plaintext rendering, drafts across Edit, return-to-preview, public privacy and access revocation clearing loaded discussion. No hosted test comments or access grants were created.
- Release: the AI build passed with the existing client-chunk warning. Added the comment table, required indexes and optional attribution fields to the existing website backend, checked the staged planner, then promoted `dpl_GsWnQUyUQaWQ9nyWw7pXNmXY2ZUy` to https://surreyaisociety.org/. Live checks confirm the preview/comment markup and new client bundle, initials rendering, removed card dropdowns, anonymous comment reads/posts denied, and attribution/discussion metadata excluded from the public feed. The previous homepage simplification remains in place. Evidence: `output/planner/card-preview-live-verification.json`. Signed-in hosted commenting was not exercised; authenticated browser acceptance uses isolated sessions and real Convex functions in a test database.

### 2026-10-15: approved AI Join dropdown

- Source visual truth: `C:/Users/Joshua Knott/.codex/generated_images/01a140dc-ed48-7a02-9c74-bcfd742f678c/exec-beebfe5b-78df-4c66-a240-1bc22ea1384d.png` (1665 x 944 pixels). The selected design is the latest warm-white revision.
- Implementation: `output/ai-join/desktop.png` and `output/ai-join/mobile.png`; open Join menu, homepage, local AI preview at port 4321. Desktop CSS viewport 905 x 513 with devicePixelRatio 1; browser capture is 890 x 504. The reference was normalized with contain sizing to 890 x 504 for comparison.
- Full-view evidence: `output/ai-join/comparison.png`; focused evidence: `output/ai-join/panel-comparison.png`. Each image places the reference on the left and implementation on the right. The surrounding existing site layout was preserved.
- Typography: Inter for compact product text, 22px title, 16px primary row labels, muted descriptions; no clipping or truncation. Spacing: the panel closely matches the reference width and density, with consistent rows and 44px minimum touch targets. Colors: warm-white surface, fine neutral outline, restrained shadow and orange membership action match the approved light direction. Image/icon quality: existing shared vector brand icons and Lucide functional icons stay crisp; existing outline brand marks differ from the generated filled/gradient marks as a minor P3 variation. Copy: all approved text and seven destinations are present; membership opens the existing Union membership URL.
- Comparison history: initial inspection found P2 assistant overlap and P2 phone-edge clipping. Raised the open header above the assistant and anchored the phone panel to the header with 12px side insets. The subsequent desktop/mobile captures and responsive browser test confirm both fixes. Tightened row spacing and kept the open trigger orange.
- Interaction evidence: the AI launch dropdown browser case passed at 320, 390, 768 (390px high) and 1440px widths, covering visibility, target size, viewport fit, links, Enter/Space, Escape with focus restoration, focus leaving the menu, outside click and toggle. Local in-app browser error log was empty. Root typecheck, all 113 unit tests and the AI production build passed. Build retains its existing client chunk-size warning.
- Findings: no actionable P0/P1/P2 findings remain. P3: existing outline brand icons are retained for consistency with the site.
- final result: passed
- Production release: pushed the four-file dropdown change to `origin/main` as `e7b40bb24e7183721c706308527e655abbdef974`, using a separate Git index to preserve the dirty primary checkout. The release build preserves the already-deployed page baseline. Staged verification confirmed seven menu links, direct membership, and unchanged main/footer markup after normalizing inter-tag whitespace. Promoted `dpl_EXLedmGg2cxRZxrW1VQSB5psHy2z` to `https://surreyaisociety.org/`.
- Live acceptance: desktop (905 x 513) and mobile (390 x 844) smoke checks passed against the custom domain, including HTTP 200, seven links, fit, unobscured Linktree/email targets, Escape/focus restoration, outside dismissal and no page errors. The first mobile smoke attempt targeted a headline underneath the open panel; the corrected test clicks visible page padding and passed. Evidence: `output/ai-join/live-desktop.png`, `output/ai-join/live-mobile.png`. In-app browser checks also confirmed the deployed menu and an empty browser error log. Deployment runtime-error query returned no error records.

### Follow-up: authors edit and delete their own comments

- Added small Edit and Delete actions beneath the signed-in author's comments. Editing uses an inline textarea with Save changes and Cancel; saved changes show an Edited marker. Deletion asks for confirmation within the thread. Other people's comments remain read-only, including for the planner owner. The server derives the current user and checks authorship, committee access, comment society and parent-card society for both mutations.
- Optional comment revisions preserve existing records and prevent overwriting a different edit from another tab. Retrying an already-applied edit or deletion is safe. Deletion removes the stored comment and decrements the count once without changing the card revision, contributor avatars or public snapshot. Loaded history is refreshed page by page so edits and deletions from another session also reach older comments. An active edit keeps its text through background refreshes; failed requests retain the edit or deletion confirmation for retry. Comments remain editable/deletable after archiving.
- Inspected `output/planner/comment-controls-desktop.png`, `comment-edit-mobile.png` and `comment-delete-mobile.png` at 1440x1024 and 390x844, plus overflow at 320px. The screenshots use isolated accounts and comments. No actionable layout defects remained.
- Verification: all 117 unit/backend/server tests, all 18 planner browser cases, root and Convex TypeScript, the AI build and whitespace checks passed. Coverage includes author-only controls and direct authorization, planner-owner restrictions, validation, revision conflicts, retry after lost responses, cancellation, confirmed deletion, retained unposted drafts, archived comments, accurate zero counts, paginated cross-session changes and revoked access. Browser sign-in transport is mocked; real Convex functions execute in an isolated database. No hosted test comments or access grants were created.
- Release: pushed the updated functions and optional comment fields to the website's existing Convex deployment. Verified the staged HTML and delivered client asset, then promoted `dpl_9xCUNbv2ha8jeT5DdDKtyKJsd6TT` to https://surreyaisociety.org/. Live HTTP checks confirm the 200/no-store planner, new author controls and client code, and private metadata excluded from the public feed. Homepage main/footer markup and all seven Join-menu destinations match the preceding live release. Evidence: `output/planner/comment-controls-backend-spec.json`, `comment-controls-stage-verification.json` and `comment-controls-live-verification.json`. Actual signed-in hosted edit/delete remains unexercised; no real comments were changed for verification. The build retains its existing client chunk-size warning.

### Follow-up: committee mentions and private notifications

- Added an @ picker to new and edited comments. It searches current committee names/emails, supports arrows, Enter, Tab, Escape and pointer selection, and inserts canonical @email tokens to distinguish people with the same name. Saved comments display highlighted names using plain text nodes. The picker clears its rendered options on close/sign-out. Directory reads require committee access and return a bounded list of active AI grants plus the owner.
- Mentions are resolved server-side from the comment text, limited to ten distinct recipients, and checked against current AI access grants. Valid recipients can receive a notification before their first sign-in. Self-mentions do not notify; duplicate tokens and committed-request retries do not create duplicate alerts. Edits add newly mentioned recipients, retain existing read state, and remove notifications for removed mentions. Deleting a comment removes its notifications in the same transaction. Comment revisions, ownership and publication privacy stay separate from discussion metadata.
- Added a bell inbox with a capped unread badge, paginated history, individual read receipts and bounded Mark all as read batches. Every operation checks current committee access and the signed-in recipient email; callers cannot choose another inbox. Notifications refresh every 30 seconds while the planner is visible, on window focus, and when opening the inbox. Clicking a notification opens the card and loads earlier comment pages as needed to focus/highlight the exact comment. Archived cards remain reachable. No email or desktop notifications are sent.
- Inspected `output/planner/mention-picker-desktop.png`, `mention-picker-mobile.png`, `notifications-desktop.png`, `notifications-mobile.png` and `mention-jump-mobile.png` at 1440x1024 and 390x844, with an additional 320px overflow check. Screenshots use isolated test accounts and comments. No actionable layout defects remained.
- Verification: all 124 unit/backend/server tests, all 21 planner browser cases, root and Convex TypeScript, the AI build and whitespace checks passed. The three mention/inbox cases passed again after hardening picker clearing, retry loading state, keyboard navigation and focus preservation. Coverage includes recipients awaiting first sign-in, active-grant filtering, private inboxes, unverified/revoked access, read persistence, notification pagination, capped unread totals, bounded read-all batches, edit/delete cleanup, duplicate suppression, older-comment navigation on archived cards and HTTP retry. Browser auth transport is mocked; the actual Convex functions run in an isolated database.
- Release: pushed the new notification table/indexes, active-grant index and optional comment mention metadata to the existing website backend. Verified all four new API functions and the staged delivered client, then promoted `dpl_9xPRGrN5wpvaxdkWWWbBFf3NTkQq` to https://surreyaisociety.org/. Live HTTP checks confirm the 200/no-store planner, picker/inbox assets, anonymous directory/inbox/read-all requests rejected, and mention metadata excluded from the public feed. Homepage main/footer markup and all seven Join destinations match the preceding release. Evidence: `output/planner/mentions-backend-spec.json`, `mentions-stage-verification.json` and `mentions-live-verification.json`. No hosted test comments, notifications or access grants were created. Actual signed-in hosted mention delivery remains unexercised. The existing large-client-chunk warning remains.

### Follow-up: real-time mention notifications

- Replaced the inbox's 30-second refresh dependency with an authenticated Convex WebSocket subscription. A small indexed revision document per recipient changes in the same transaction as added/edited/removed mentions and read receipts. The subscription prompts a refresh of all currently loaded inbox pages, so changes to older read notifications also arrive live. Existing notifications work without a backfill. The board's existing refresh remains separate.
- The client authenticates using the current Clerk session and honours forced token refresh. It reconnects automatically, queues updates received during a pending fetch or read operation, and retries transient HTTP refresh failures with backoff. Sign-out, expired authentication and revoked committee access clear the inbox and close its subscription. Version checks discard late responses after a session ends; page hide/show closes and restores the connection.
- Inspected `output/planner/notifications-realtime-desktop.png` at 1440x1024 and `notifications-realtime-mobile.png` at 390x844, with no horizontal overflow. Appearance and card navigation are preserved. The existing full suite also checks the planner at 320px. These screenshots use isolated test data.
- Verification: all 127 unit/backend/server tests, root/Convex TypeScript, the AI build and whitespace checks passed. All 24 planner browser cases passed across the full run and focused retry. The initial sign-out test had an ambiguous label; its corrected run exposed that the fixed mock session signed itself back in after reload. The fixture now preserves sign-out, and the late-response case exercises a Clerk session-ended event without navigation. The focused rerun passed the three real-time cases plus existing email-code/sign-out coverage.
- New browser coverage uses the actual Convex browser SDK and a simulated Convex WebSocket transport backed by the actual Convex functions in an isolated database. It verifies two open tabs receive new mentions, edited snippets, read receipts and removals without a reload/focus/poll; reconnection catches up; failed refreshes retry; a new change arriving during a held older response is retained; older loaded history refreshes; and revocation/sign-out close connections and prevent late data from returning. No hosted test comments or notifications were created.
- Release: deployed the recipient-state table/index and protected query to the website's existing backend, then checked and promoted `dpl_4vQiaqs1puX8r4dxNaeNaMtdqK4L` to https://surreyaisociety.org/. The actual hosted WebSocket connected and rejected an anonymous subscription; the corresponding anonymous HTTP query was also rejected. Main-domain checks confirm the new client code, 200/no-store planner, existing directory/inbox/read-all guards and private public-feed metadata. Homepage main/footer markup and all seven Join destinations match the preceding release. Evidence: `output/planner/realtime-backend-verification.json`, `realtime-stage-verification.json` and `realtime-live-verification.json`. Authenticated hosted push delivery remains unexercised; signed-in browser acceptance uses isolated transport. The existing client chunk-size warning remains.


## AI committee planner: approved board and card — 15 October 2026

final result: passed

The approved targets are `output/planner/mockups-2026-10-15/board.png` and `opened-card.png`. This change is limited to the existing AI planner frontend and its browser tests. No backend schema, hosted data, publishing rules, or other society UI was changed.

**Visual evidence.** Both source images (1488 × 1056 pixels) were normalized with containment to the implementation viewport of 1440 × 1024, device scale factor 1. Compared reference and rendered UI together in `output/planner/approved-board-comparison.png` and `approved-card-comparison.png`; inspected the readable comment/composer region in `approved-comments-comparison.png`. Sample card titles, people, stage counts, and comments match the concepts. Captures use isolated fixture accounts and real planner functions in an in-memory Convex database.

- Typography: retained the existing Inter font, with clear title/body/name hierarchy and readable contributor names. Matched the opened-card description wrapping and increased the first-pass column/comment heading sizes.
- Spacing and layout: four stage columns on desktop, two on an 834 × 1194 tablet, and one on phones. Private-column add actions align at the bottom. The 800px opened card has one conversation surface and an integrated composer. First-pass mobile ellipsis/text overlap was fixed by reserving space beside the author's comment. Inspected `approved-board-tablet.png`, `approved-board-mobile.png`, `approved-card-mobile.png`, and `approved-composer-mobile.png`; 390px and 320px views have no horizontal overflow. The long mobile dialog scrolls vertically and the send button remains reachable.
- Colors and tokens: warm off-white, lilac/blue/peach/sage stage surfaces, neutral comment text, purple mentions, and restrained orange actions follow the source. Darkened the orange action color to #d24419 for 4.58:1 white-text contrast and strengthened muted text/placeholder colors.
- Asset fidelity: reused the existing Surrey AI monogram and Lucide icons. Contributor avatars remain initials derived from actual identities, with stable per-user color tones; no mockup was used as a runtime image.
- Copy and content: closed cards contain only the title and creator/editor names plus initials, across every stage, including published cards. Description, dates, location, booking links, and discussion remain inside the opened card. Contributor names are also exposed as the card button's accessible description.

**Behavior and accessibility.** Comments support the existing draft recovery, pagination, retries, edit/delete confirmation, and mentions. A keyboard-accessible ellipsis menu replaces the always-visible edit/delete links; Escape closes that menu without closing the card and focus returns to its trigger. The composer mention button opens the existing directory picker. Privacy clearing also removes the new current-user avatars. Signed-out/revoked access, drag-to-stage, publish review, calendar/archive navigation, and real-time inbox behavior remain covered.

**Verification.** All 25 planner browser cases passed, followed by a focused pass on the final contributor accessibility/tablet checks. All 127 unit tests passed. Root typecheck, the final AI production build, and whitespace checks passed. The build retains the existing large-client-chunk warning. Browser auth and transport are fixtures backed by actual isolated Convex functions; authenticated hosted acceptance was not exercised.

**Accepted differences.** Avatar tones come from identity IDs, timestamps reflect fixture creation, and Planning/Ready use the accurate label “Add card.” The orange is slightly darker for contrast. Keyboard-focus outlines are intentionally visible in the interaction captures. No remaining P0/P1/P2 findings.

The local preview remains at http://127.0.0.1:4321/committee/planner and uses the normal committee sign-in. This implementation has not been committed, pushed, or deployed.

## Branch reconciliation — 16 October 2026

Consolidated the current AI homepage and approved committee planner, Neurotech editorial design and upload recovery, Business committee release, and AI Join dropdown on current main. Shared layout integration preserves Business header/footer slots and its fawn mascot, Neurotech's gold neuron and closed-application state, and the AI homepage navigation, artwork and assistant. Earlier local hero variants, deadline resets, and an unconfigured committee-email queue prototype remain in the local recovery archive instead of replacing current behavior. Two unused AI artwork variants are also archived.

Verified the combined source with root TypeScript, Convex TypeScript, all 127 unit/backend/server tests, all three production builds, all 87 browser cases, and whitespace checks. Reviewed fresh desktop/mobile captures of all three society sites and the approved planner board/card. Browser sign-in and private planner operations use isolated fixtures and Convex functions; this reconciliation does not establish authenticated production acceptance or perform a new backend deployment. The earlier dated release notes above remain historical evidence.

final result: passed

## AI team board — 16 October 2026

final result: passed

**Target and comparison.** Compared the supplied `codex-clipboard-2d089f04-48eb-4dac-81a3-ab10012a8a54.png` against `output/planner/team-board-desktop.png` together at 1756 × 896, with deviceScaleFactor 1. The implementation preserves the expanded plum sidebar, full-height four-column board, team filters, compact cards and top-right member stack. The Committee dropdown row is deliberately removed; Board, Calendar, Archive, website, Settings, account and sign-out controls remain available. Reviewed the readable card/header regions as well as the overall composition, then inspected the 390 × 844 and 320 × 760 captures and the mobile card editor.

**Typography and spacing.** Existing Inter/system typography with 25px page title, 17px list headings, 15px desktop card titles and 13px filter controls. Lists fill the remaining viewport with 12px gutters. Cards have short titles, a team badge in All, and one metadata row. Team badges are hidden in a filtered view. The slightly narrower sidebar and shorter cards deliberately give more space to work. On phones, lists and team filters scroll within their own containers; the page itself does not overflow. The sidebar becomes a dismissible drawer and the main surface is inert while it is open.

**Color, assets and copy.** Flat plum navigation, cool gray lists, white cards and restrained team-label colors follow the target. The action orange is darker for white-text contrast. The existing society logo asset is reused. Member portraits are unavailable, so the header uses honest initials rather than the fictional generated faces; the member dialog contains the eleven names supplied by the user, grouped under the five teams. Screenshot card content is fixture data, not seeded production content. Navigation labels, team names and workflow stages match the approved direction.

**Behavior and data.** Lead-team assignment persists, can be cleared, and defaults from the current filter. Internal work has an optional due date, notes and checklist, and is rejected by the publish mutation. Existing records without a team remain under All. Published records retain the existing public snapshot/index while optional workflowStage records their position on the board; drag/drop and the keyboard-accessible card menu cannot publish or unpublish. Explicit unpublish and archive retain their existing confirmation flows. Settings, sign-in, comments, mentions, calendar history and notifications remain functional. New schema fields are optional and no data migration or hosted write was performed.

**Verification.** All 129 unit/backend/server tests passed, as did root and Convex TypeScript and the AI production build. The 26 planner browser cases passed across the regression run and focused rerun after adapting the old Published-column count assertion. The final four-case rerun covers team persistence, responsive navigation, calendar history, drag/drop publication isolation and card/comment accessibility. Eighteen AI public launch checks also passed. The broader launch run was stopped when it attempted unrelated Business tests without a running Business preview; no Business or Neurotech acceptance is claimed for this change. The build still reports the existing large-client-chunk warning. Browser authentication/transport are fixtures backed by actual isolated Convex functions; live authenticated acceptance and production deployment remain unexercised.

No remaining P0/P1/P2 visual findings in the reviewed states. Local preview remains at http://127.0.0.1:4321/committee/planner. The frontend and Convex changes must be released together before hosted use; this task did not commit, push or deploy.

---

# Committee card design QA

Source visual: `C:/Users/Joshua Knott/.codex/generated_images/01a14232-e32b-7d61-8e02-31694b7fe854/exec-e1c205b5-f36b-45c4-97ef-47396850be97.png`.
Implementation: `output/planner/compact-card-desktop.png`.
Full comparison: `output/planner/compact-comparison.png`.
Focused comparison: `output/planner/compact-comparison-detail.png`.
Responsive evidence: `output/planner/compact-card-laptop.png`, `compact-card-mobile.png`, and `compact-discussion-mobile.png`.

Source is 1586 x 992 pixels. Desktop implementation is 1600 x 1000 CSS/pixel viewport at device scale 1. The full comparison normalizes the source onto a 1600 x 1000 canvas, then places both views together. The focused comparison aligns the title, assignment controls, and description. State: In progress, internal NVIDIA workshop partnership, two teams, Ibrahim Haque as lead, three checklist items, one linked PDF, two discussion messages.

## Findings and comparison history

- Initial P1: checklist text inputs inherited checkbox width and clipped text. Fixed by giving text inputs the remaining row width. Final screenshots show all three editable items clearly.
- Initial P2: the old form border rule and description margin made the view look like a form and caused 21px of content scrolling. Removed the conflicting rule and margin. Automated checks now confirm no dialog or main content scrolling in the sample at 1600 x 1000 and 1280 x 720.
- Initial P2: frame was wider than the selected mock. Reduced desktop width to 1100px and increased the title to 30px. Final combined comparison preserves the compact two-column composition and title hierarchy.
- No remaining actionable P0/P1/P2 findings.

## Required fidelity surfaces

- Typography: existing Inter/system sans stack; 30px title, 12px metadata, 13-14px editable copy, muted small timestamps. The 720px-high laptop layout uses a 27px title. Text is readable without permanent form borders.
- Layout: white 12px-radius frame, compact header, approximately 62/38 content/discussion grid, thin divider and save footer. Description, checklist, and attachment each have a quiet divider. Discussion history scrolls independently from editing.
- Color: white, deep plum text, pale blue/amber team chips, faint cool-purple borders. Existing app identity and navigation are retained. The source's invented navigation destinations are outside this card change.
- Assets: existing society logo and Lucide icons retained. Initials represent existing committee identity data; no decorative raster assets are needed.
- Copy: Team(s), Lead, Due, Card purpose, Description, Checklist, Attachments, Discussion and All changes saved match the selected information hierarchy. Fixture discussion authors differ from the mock and do not affect layout.

## Functional and responsive checks

- Browser-rendered screenshots at 1600 x 1000, 1280 x 720, 390 x 844; smaller 320px layouts covered by existing planner cases.
- Direct title/description/assignment editing, checklist editing and completion, linked attachments, optional notes/activity panels, debounce autosave, edits typed during an in-flight save, retry after failure, close-to-save, comments and mentions.
- Ordinary saved drafts retain explicit publication boundaries. Unpublish/archive wait for pending card saves. Access revocation clears loaded private data.
- All 30 planner browser cases passed. These use Clerk transport fixtures with the actual Convex functions running in convex-test, not production data. No page errors in the new compact-card flow.
- The in-app preview reaches the real committee sign-in gate. Authenticated production editing has not been exercised by this QA.

## Intentional product constraints

- Document attachments are private HTTPS links; file uploading is outside this release.
- Mobile uses Card/Discussion tabs to preserve a full-height editing surface. Long descriptions, large checklists, attachment lists and long discussions have independent overflow regions.
- Native date controls retain the full date for direct editing.

final result: passed

---

## Planner file uploads and display names - 17 October 2026

- Added authenticated PDF/image uploads alongside the existing HTTPS links. Uploads accept PDF, PNG, JPEG, GIF, WebP and AVIF, up to 10 MB each and 10 stored files per card. Both upload and download HTTP actions verify current committee access; storage URLs are not returned to browsers. Downloads are attachments with private/no-store and nosniff headers. File signature checks reject content masquerading as a PDF or image. Upload request IDs make retrying safe without duplicate records or retained duplicate storage objects.
- The left-navigation account row now opens a planner display-name editor. A separate plannerProfiles table leaves the shared users name and public committee data intact. Queries resolve existing card contributors, discussion authors, mentions and notification authors through the profile. Live subscriptions update other open tabs; recognised committee identities also update the planner member list and lead labels.
- Desktop/mobile screenshots inspected: output/planner/attachment-picker-desktop.png, uploaded-files-desktop.png, uploaded-files-mobile.png, planner-profile-desktop.png, planner-profile-mobile.png.
- Fixed one P2 issue found during visual QA: an older rule intended to hide file-removal controls also hid the new filename/download button on desktop. The download button now remains visible at rest. Post-fix desktop and mobile evidence shows readable file names and types in the existing attachment list.
- Checks: 135 unit tests; all 33 planner browser scenarios; application typecheck; Convex TypeScript check; AI production build. The browser upload tests execute the real HTTP actions and storage in convex-test with a Clerk transport fixture. Coverage includes PDF/image bytes, download, removal, reload, interrupted-upload retry, unauthorised/revoked access, incorrect types, size/count limits, idempotent retries, old-author name hydration and updates in a second open tab.
- Live backend checks: upload preflight returns 204 for the AI site, unauthenticated download returns 401, unrelated-origin preflight returns 403. Authenticated production upload/name changes were not exercised against real committee data.

final result: passed
