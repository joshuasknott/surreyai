<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Design Workflow

When designing, redesigning, implementing, or reviewing UI, use this sequence:

1. Define UX intent first: user mindset, page purpose, primary action, required states, hierarchy, risks, and what must be visible immediately.
2. Use references only when they sharpen a decision:
   - Godly for public AI, Business, and Neurotech page direction.
   - Refero for event sections, committee pages, resource hubs, content layouts.
   - Mobbin for admin, invites, roles, settings, empty states.
3. Turn the UX brief into a build-ready frontend plan: layout, components, responsive behavior, states, accessibility, and QA.
4. Use motion only when it supports meaning. Public pages may be expressive; admin dashboards should be plain, reliable, dense, and fast.
5. Run desktop and mobile visual QA before considering UI work complete.

For the `/ai` robot-head hero, use Three.js for the robot and Anime.js only for scroll choreography or reveals. Keep events and join actions visible early, and provide reduced-motion fallback.
