# Design QA

## Source visual truth

- Selected Product Design direction: `/workspace/scratch/476c2b4e255d/generated_images/exec-3ff32dde-baf5-408b-840b-95b9efc56a49.png`
- Source pixels: 864 × 1821 at 1× density.
- Approved event identity: `public/images/surrey-ai-hack-logo.png`.

## Browser-rendered implementation evidence

- CSS viewport: 1363 × 936 at 1× device scale.
- Implementation captures: `docs/implementation-polish-hero.jpg`, `docs/implementation-polish-tools.jpg`, and `docs/implementation-polish-sponsors.jpg`.
- Capture pixels: 1348 × 926. The difference from the CSS viewport is browser scrollbar/chrome exclusion.
- Same-input comparison boards: `docs/comparison-polish-hero.jpg`, `docs/comparison-polish-tools.jpg`, and `docs/comparison-polish-sponsors.jpg`. Each places the source direction on the left and browser implementation on the right.
- State: default participant view for visual captures. Partner, validation-error, and success states were tested separately.

## Findings

- No remaining P0, P1, or P2 findings.
- [P3] The implementation intentionally omits the source mockup’s two decorative corner squares beside photographs. The simplified photography keeps the site more restrained and avoids decorative CSS art.
- [P3] Still comparisons cannot demonstrate scroll easing, staggered entrance timing, hover depth, or the reduced-motion fallback; these were inspected directly in the live browser.

## Required fidelity surfaces

- Fonts and typography: self-hosted Barlow Condensed gives display lines the intended editorial density and Inter Variable provides a cleaner, more optical body texture. Headline overhang and wrapping were rechecked after the font change; no clipping remains.
- Spacing and layout rhythm: the wide two-column hero, petrol manifesto, audience split, dense tools matrix, aubergine national section, sponsor grid, waitlist band, and quiet footer preserve the selected direction’s hierarchy. The page has no horizontal overflow at the verified viewport.
- Colors and tokens: paper `#f6f2e9`, aubergine `#2b104d`, petrol `#0e4e56`, teal `#08747e`, and yellow `#ffc431` remain consistent with the selected independent event identity.
- Image quality and asset fidelity: all documentary photography is high-resolution and uses controlled object-positioning. Tool cards use real brand assets from Lobe Icons or recognised icon-library marks for ChatGPT/OpenAI, Claude, Gemini, Perplexity, Cursor, GitHub Copilot, Replit, VS Code, Lovable, v0/Vercel, Figma, Canva, Anthropic, Google AI, Hugging Face, and open source/GitHub.
- Copy and content: the expanded tools and access matrix retains the no-vendor-lock-in message and makes clear that examples are neither required nor supplied. No dates, venue, sponsors, prizes, funding, or attendance figures were invented. Surrey Artificial Intelligence Society branding remains absent.

## Comparison history

- [Resolved P1] The previous tools matrix relied mainly on text and generic category icons.
  - Fix: added genuine product marks inside structured tool cards while keeping generic icons only for category labels.
  - Evidence: `docs/comparison-polish-tools.jpg`.
- [Resolved P2] The previous typography used system Arial fallbacks and felt visually coarse.
  - Fix: self-hosted Inter Variable and Barlow Condensed, then retuned display sizes, weights, leading, and tracking.
  - Evidence: `docs/comparison-polish-hero.jpg` and `docs/comparison-polish-sponsors.jpg`.
- [Resolved P2] The first polished hero capture clipped the final glyph in “Build something”.
  - Fix: reduced the responsive display scale and verified the headline’s client and scroll bounds match without page overflow.
  - Post-fix evidence: `docs/implementation-polish-hero.jpg`.
- [Resolved P2] Motion previously relied on basic CSS hover transitions.
  - Fix: added spring scroll progress, staged hero entry, once-only section reveals, tool-logo stagger, image depth, button tap feedback, animated form state changes, and a complete `prefers-reduced-motion` path.

## Primary interactions tested

- Smooth anchor navigation and top progress indicator.
- Hero waitlist CTA and sponsor-interest CTA.
- Participant/sponsor intent switch, including `aria-pressed`, heading, and placeholder changes.
- Invalid email error state.
- Valid email success transition and follow-up action.

## Console and performance check

- No application-origin browser console errors were found.
- Motion is transform/opacity based and respects the user’s reduced-motion preference.
- Brand marks and fonts are bundled locally, so the experience does not depend on third-party runtime requests.

## Follow-up polish

- [P3] A real-device mobile capture would be useful after deployment. Responsive rules remain present down to 320px; the available cloud browser exposed only a fixed desktop viewport for this pass.

final result: passed
