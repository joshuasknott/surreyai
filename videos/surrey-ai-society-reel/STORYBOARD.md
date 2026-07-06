# Storyboard

**Format:** 1080x1920 portrait
**Audio:** Kokoro voiceover + tight electronic underscore + light UI SFX
**VO direction:** confident student host, upbeat but clear, short pauses between phrases
**Style basis:** `DESIGN.md` brand colors, Inter/Fira Code typography, robot hero, pale technical canvas, teal system accents
**UX intent:** convince curious Surrey students that the society is practical, welcoming, and worth joining now. The first three seconds must show the robot and the hook. Projects and join action must appear early enough for vertical social viewers who do not finish the video.

## Global Guardrails

- Primary canvas stays `#F7F8F3` / `#FCFCFB`; use `#0B0F19` only for project-card and agent UI moments.
- Every beat includes captured or local site imagery; no generic AI stock.
- Use 3 layers per beat: pale grid/backplate, main image or UI, foreground typography/captions.
- Motion language: precise, hands-on, student-led. Use zoom-through, blur-through, grid-scan, and teal path-drawing.
- Reduced-motion fallback: retain same scene order and readable captions with simple opacity/position changes.

## Asset Audit

| Asset | Type | Assign to Beat | Role |
| --- | --- | --- | --- |
| `assets/site/ai-robot-head.png` | Hero image | 1, 5 | Opening visual signal and final brand echo |
| `assets/site/ai-racing-simulator.png` | Project image | 3 | Racing Simulator proof, cinematic speed moment |
| `assets/site/ai-agentic-builder.png` | Project image | 3 | Agentic Builder proof, builder/workflow moment |
| `assets/site/ai-learning-toolkit-cutout.png` | Section image | 2 | Workshops, beginner-friendly learning, data/model practice |
| `assets/site/ai-events-workshop-cutout.png` | Section image | 4 | Events/workshops support visual |
| `assets/site/ai-join-kit-cutout.png` | Section image | 5 | Join/membership visual texture |
| `assets/site/surrey-ai-ds-logo.png` | Logo | 1, 5 | Brand mark first and last beat |
| `capture/screenshots/scroll-000.png` | Site screenshot | 1 | Hero page reference panel / background echo |
| `capture/screenshots/scroll-051.png` | Site screenshot | 3 | Project section reference panel |
| `capture/assets/svgs/logo-9cfbbdaa.svg` | Captured SVG | 1, 5 | Optional mark if visually cleaner than PNG |
| `capture/assets/fonts/*.ttf` | Fonts | All | Local Inter font files |

## Beat 1 - Robot Hook (0.00-2.30s)

**VO cue:** "Build with A I, not just read about it."

**Concept:** The video starts already awake. The robot head floats into portrait frame like the society's mascot scanning the viewer, while the hook types and slams in as a direct challenge. It should feel futuristic, but friendly enough for a beginner to stay.

**Visual description:** Pale `#F7F8F3` grid fills the frame. The Surrey AI logo stamps in near the top. The robot head grows from the right side with a small teal glow and orbiting data dots. Kinetic words stack left: "Build with AI" lands first, then "not just read about it" types below in Fira Code. A small pill row appears: Workshops / Projects / Hackathons.

**Mood direction:** bright technical campus lab, not cyberpunk. Friendly robot, precise typography, teal signal lines.

**Assets:** `assets/site/ai-robot-head.png`, `assets/site/surrey-ai-ds-logo.png`, `capture/screenshots/scroll-000.png` as a soft cropped site echo.

**Techniques:** per-word kinetic typography, SVG path drawing, CSS 3D image tilt, Canvas 2D data dots.

**Animation choreography:** logo STAMPS in; robot GLIDES and rotates slightly; data dots ORBIT; headline SLAMS then SETTLES; subline TYPES; pills CASCADE upward.

**Transition:** zoom-through into the learning toolkit, 0.35s, `expo.inOut`, with teal blur streak.

**Depth layers:** BG grid and soft teal radial glow; MG robot and screenshot echo; FG hook/captions/pills.

**SFX:** soft scanner chirp on robot reveal, clean hit on "Build".

## Beat 2 - Practical Workshops (2.30-8.80s)

**VO cue:** "At Surrey A I Society, you'll explore machine learning and data science through practical workshops, build nights, and student projects."

**Concept:** The society becomes hands-on. Instead of abstract AI, the frame shows notebooks, diagrams, model blocks, and numbered skill rows. The viewer should understand that beginners can start here and experienced coders still have meaningful material to build with.

**Visual description:** Learning toolkit cutout fills the lower half like a desk surface. Three numbered panels draw in on the right: Machine learning, Data science, Model evaluation. Teal connector paths trace between sticky notes and a floating cube. Caption fragments highlight "practical workshops" and "build nights" as the VO reaches them.

**Mood direction:** workshop table meets technical lab. Clear, welcoming, high-signal.

**Assets:** `assets/site/ai-learning-toolkit-cutout.png`, captured site colors and card language.

**Techniques:** SVG path drawing, per-word highlights, counter/numbered list animation, parallax card stack.

**Animation choreography:** cutout RISES; panels SLIDE in at different depths; connector line DRAWS; keywords HIGHLIGHT with teal marker sweep; tiny model nodes PULSE.

**Transition:** grid-scan wipe upward, 0.28s, moving from pale workshop into dark project cards.

**Depth layers:** BG off-white grid; MG desk cutout and cards; FG captions and teal path.

**SFX:** marker sweep, small digital ticks on numbered rows.

## Beat 3 - Student Project Proof (8.80-12.90s)

**VO cue:** "Race autonomous systems. Prototype with agentic tools."

**Concept:** Proof gets fast. Racing Simulator and Agentic Builder are shown as two concrete things members can inspect and build toward. The beat should feel like a split-second portfolio reel: speed, then workflow.

**Visual description:** The frame splits diagonally. Racing Simulator surges from the lower left with a fast track zoom and teal trajectory lines. Agentic Builder slides in from the upper right as a dark laptop/workflow panel with node connectors. The words "Racing Simulator" and "Agentic Builder" punch in as large white labels on dark image surfaces.

**Mood direction:** hands-on technical demo energy, with enough polish for LinkedIn and enough speed for TikTok.

**Assets:** `assets/site/ai-racing-simulator.png`, `assets/site/ai-agentic-builder.png`, `capture/screenshots/scroll-051.png`.

**Techniques:** CSS 3D image tilt, velocity-matched transition, SVG trajectory drawing, terminal typing.

**Animation choreography:** racing image WHIPS forward; track trajectory DRAWS and accelerates; agent image TILTS into place; Fira Code line TYPES `agent_build -> review -> refine`; labels PUNCH in.

**Transition:** blur-through, 0.33s, from dark image proof back to pale responsible/career context.

**Depth layers:** BG dark project plates; MG two image panels; FG labels, path lines, terminal caption.

**SFX:** short whoosh for Racing Simulator, keyboard tick cluster for Agentic Builder.

## Beat 4 - Responsible AI + Careers (12.90-16.20s)

**VO cue:** "Talk responsible A I, careers, and what comes next."

**Concept:** The reel widens from demos to judgement. Responsible AI and careers are not a side note; they are part of how the society builds. The frame should feel calmer but still active.

**Visual description:** Pale event/workshop visual appears as a semi-transparent card. Around it, teal chips rotate into a clean orbit: Bias, Accessibility, Ethics, Careers, Impact. A slim path connects the chips to a central "Responsible AI" title. Small event-format labels slide in at the bottom: Workshops / Hackathons / Project nights / Talks.

**Mood direction:** thoughtful technical culture, practical and mature without becoming corporate.

**Assets:** `assets/site/ai-events-workshop-cutout.png`.

**Techniques:** MotionPath orbit, SVG path drawing, kinetic chip labels, soft parallax.

**Animation choreography:** title BUILDS from left; chips ORBIT then LOCK; event labels CASCADE; background card DRIFTS slowly.

**Transition:** light teal overexposure burn, 0.4s, into final CTA.

**Depth layers:** BG off-white with faint diagonal lines; MG workshop card; FG chips and CTA-prep labels.

**SFX:** softer chime and low riser into final beat.

## Beat 5 - Join CTA (16.20-21.60s)

**VO cue:** "Curious beginner or experienced coder, bring an idea. Join Surrey A I Society."

**Concept:** The final beat is simple and decisive. It brings the robot, logo, and CTA together so the last frame reads instantly in a social feed.

**Visual description:** Robot head returns smaller, hovering above a large teal pill. Logo sits top-center. Big stacked copy: "Join Surrey AI Society". Supporting chips read Beginner-friendly, Hands-on projects, Careers. The join-kit cutout sits as a pale background layer. Final frame holds long enough to screenshot.

**Mood direction:** confident invitation, campus society poster, technical but warm.

**Assets:** `assets/site/surrey-ai-ds-logo.png`, `assets/site/ai-robot-head.png`, `assets/site/ai-join-kit-cutout.png`.

**Techniques:** per-word typography, button glow pulse, CSS 3D robot tilt, final hold.

**Animation choreography:** logo SETTLES; headline RISES; chips POP; CTA PULSES once; robot NODS subtly; final frame HOLDS.

**Transition:** final fade-to-pale with CTA still visible until last 0.25s.

**Depth layers:** BG join-kit and grid; MG robot/logo; FG headline, chips, CTA.

**SFX:** bright final hit, then a soft tail.

## Production Architecture

```text
project/
|-- index.html
|-- DESIGN.md
|-- SCRIPT.md
|-- STORYBOARD.md
|-- narration.txt
|-- narration.wav
|-- transcript.json
|-- assets/
|   `-- site/
|       |-- ai-robot-head.png
|       |-- ai-racing-simulator.png
|       |-- ai-agentic-builder.png
|       |-- ai-learning-toolkit-cutout.png
|       |-- ai-events-workshop-cutout.png
|       |-- ai-join-kit-cutout.png
|       `-- surrey-ai-ds-logo.png
|-- capture/
|   |-- screenshots/
|   |-- assets/
|   `-- extracted/
`-- compositions/
    `-- captions.html
```
