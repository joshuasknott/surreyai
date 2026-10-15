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
