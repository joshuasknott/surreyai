# Design QA

## Source visual truth

- Selected Product Design direction: `/workspace/scratch/476c2b4e255d/generated_images/exec-3ff32dde-baf5-408b-840b-95b9efc56a49.png`
- Source pixels: 864 × 1821.
- Approved identity: `public/images/surrey-ai-hack-logo.png`.

## Browser evidence

- Desktop CSS viewport: 1363 × 936 at 1× device scale.
- Captures: `docs/implementation-option-3-hero.jpg`, `docs/implementation-option-3-tools.jpg`, and `docs/implementation-option-3-sponsors.jpg`.
- Same-input comparison boards: `docs/comparison-option-3-hero.jpg`, `docs/comparison-option-3-tools.jpg`, and `docs/comparison-option-3-sponsors.jpg`. Each board places the selected direction on the left and the browser implementation on the right.
- Full-page browser capture exceeded the browser protocol timeout, so three overlapping viewport captures were used to cover the full experience.

## Fidelity review

- Hero: event mark, lean four-item navigation, oversized aubergine headline, documentary build image, concise national positioning, academic-year note, and dual CTAs match the selected direction.
- Manifesto: full-width petrol field, warm-white statement, yellow icon language, and three build principles preserve the target's strongest transition.
- Audience: every requested experience level is represented beside a dedicated documentary build image.
- Tools: the implementation expands the mockup into a useful matrix of AI assistants, coding tools, no-code/creative tools, APIs/models, and access types without implying that any product is supplied or required.
- National section: aubergine field, large UK-wide message, supporting copy, and demo-room photograph retain the reference composition.
- Sponsors and waitlist: support themes, sponsorship CTA, participant/partner intent switch, email validation, and success state are present without inventing partners, dates, venues, prizes, funding, or attendance.
- Footer: event identity and lean navigation only. Surrey Artificial Intelligence Society branding and organiser copy are absent as requested.

## Visual tokens

- Paper `#f6f2e9`
- Aubergine `#2b104d`
- Petrol `#0e4e56`
- Teal `#08747e`
- Yellow `#ffc431`
- Display typography uses a narrow, heavy neo-grotesk stack with compact leading; body typography stays simple and readable.

## Findings and resolution history

- [Resolved P1] Previous direction lacked enough practical information. Added the full tools and access matrix plus sponsor support themes.
- [Resolved P1] Previous page carried Society identity in the header/footer. Removed all Society references and retained only the approved Surrey AI Hack identity.
- [Resolved P2] Interest controls exposed visual state only. Added `aria-pressed` so participant/partner selection is also announced to assistive technology.
- [Resolved P2] Potential text/image collisions. Rebuilt hero, audience, and national sections with explicit grids, overflow-safe media containers, and responsive stack rules.
- No remaining P0, P1, or P2 fidelity findings.

## Interaction and console checks

- Header anchors route to The Hack, Tools, Sponsors, and Waitlist sections.
- Hero and sponsor CTAs scroll to the correct interest state.
- Invalid email shows an inline error.
- Valid email shows the local success state.
- Participant/partner selection changes the active state, heading, and email placeholder.
- No application-origin console errors were found. The cloud browser emitted unrelated `chrome-extension://` metadata errors.

## Follow-up polish

- [P3] Capture a real-device mobile screenshot after launch. Responsive rules are present down to 320px; the available cloud browser exposed only a fixed desktop viewport for this QA pass.

final result: passed
