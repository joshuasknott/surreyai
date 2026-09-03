# Design QA

**Source visual truth**
- `docs/design-reference.png`
- `docs/logo-selected-v2.png` (approved event identity)
- Source pixels: 729 × 1536, 1× density.

**Implementation evidence**
- `docs/implementation-hero.jpg`
- `docs/implementation-bottom.jpg`
- `docs/implementation-logo-v2.jpg`
- Browser CSS viewport: 1363 × 936 at 1× device scale.
- Captured image pixels: 1348 × 926 at 1× density; the small difference is browser scrollbar/chrome exclusion.
- State: public landing page, default participant interest state. Partner state, invalid email state, and successful registration state were tested separately.

## Full-view comparison evidence

The full source was compared in the same visual review input with browser-rendered implementation captures of the hero and lower conversion/footer regions. The implementation preserves the source's defining composition: warm paper base, oversized left-aligned forest headline, panoramic documentary hero image, forest manifesto block with sky-blue type, 50/50 people split, sky-blue tools strip, national demo section, restrained partner row, vermilion waitlist band, and quiet organiser footer.

The browser could not produce a single full-page capture before its screenshot timeout, so overlapping viewport captures were used to cover the page. This did not prevent comparison of any major region. The approved event logo was additionally compared against a fresh header capture in `docs/implementation-logo-v2.jpg`.

## Focused comparison evidence

- Hero: compared at 1363 × 936. Headline wrapping, image scale, navigation density, organiser placement, CTA dimensions and the transition into the manifesto closely match the source.
- Manifesto and people section: inspected in the browser at the same viewport. Type scale, colour balance, photographic crop, line rhythm and split layout match the target.
- National, partner, waitlist and footer: compared against `docs/implementation-bottom.jpg`. Section proportions, CTA emphasis and organiser credit match the target.

## Required fidelity surfaces

- Fonts and typography: Arial/Helvetica provides a close neo-grotesk match. Display text uses heavy weights, tight tracking and compact line-height; body copy remains readable at 14–17px. No clipping or unintended truncation was found.
- Spacing and layout rhythm: desktop grid, broad image planes and section pacing match the reference. Content remains within the page bounds and important controls remain visible.
- Colors and tokens: paper `#f6f2e9`, petrol `#12373d`, yellow `#f6cf58`, aubergine `#2b104d`, and teal `#0c7380` extend the approved event identity into a distinct, accessible site palette.
- Image quality and asset fidelity: all four visible photographic regions use dedicated high-resolution raster assets in the selected editorial documentary style. The approved Surrey AI Hack identity appears in the header; the supplied transparent Surrey AI Society mark is used only in header/footer organiser credits. Neither logo has a visible background box or checkerboard.
- Copy and content: the page preserves the selected concept's key language while avoiding invented dates, venue, sponsors, prizes, funding or attendance figures. The waitlist and partner flows use realistic, concise copy.

## Findings and comparison history

- [Resolved P2] Header organiser wordmark clipped horizontally on the first browser pass.
  - Fix: widened the logo crop and reduced its internal image scale.
  - Post-fix evidence: `docs/implementation-hero.jpg` shows the full organiser identity legibly.
- [Resolved P1] The selected event logo attachment contained a baked checkerboard rather than real transparency.
  - Fix: extracted the approved emblem, typography and colours into a clean alpha PNG before implementation.
  - Post-fix evidence: `docs/implementation-logo-v2.jpg` shows both header identities without background boxes and with clear spacing from navigation and imagery.
- [Resolved P1] Hero copy previously risked colliding with the adjacent photograph at narrower desktop widths.
  - Fix: constrained the display scale and gave the copy column a stable minimum width while allowing the image column to flex.
- No remaining P0, P1 or P2 findings.

## Primary interactions tested

- Hero “Join the waitlist” scroll and focus behaviour.
- Invalid email validation message.
- Valid email success state.
- Participant/partner intent switch, including copy and placeholder changes.
- Anchor navigation and partner CTA routing.

## Console check

- No application-origin errors or warnings found.
- The cloud browser extension emitted unrelated metadata errors from its own `chrome-extension://` URL; these are not produced by the site.

## Follow-up polish

- [P3] A real mobile device/browser capture would be useful after deployment. Responsive CSS is present down to 320px, but the cloud browser available for this pass exposed only its desktop viewport.

final result: passed
