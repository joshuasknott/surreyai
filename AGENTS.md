# Surrey Societies

Three distinct Astro sites share packages and a Convex backend. Confirm the requested society, edited app, preview URL, build, and screenshots all match.

## Commands and scope

Use npm workspaces and package-lock.json.

| Site | Source | Development | Build |
| --- | --- | --- | --- |
| AI | apps/ai | `npm run dev:ai` | `npm run build:ai` |
| Business | apps/business | `npm run dev:business` | `npm run build:business` |
| Neurotech | apps/neurotech | `npm run dev:neurotech` | `npm run build:neurotech` |

Use `npm run typecheck` and `npm test` for affected shared logic; `npm run test:e2e` for changed user flows. Shared changes may require `npm run build:all`. Use the actual server output to identify each preview port. Keep requested previews running through handoff.

## Design and data

- Use the selected mockup, existing assets, and current user direction. Public society pages can be expressive; admin screens should be calm and efficient. Keep events and join actions visible early.
- For substantial design work, consult [.agents/skills/surreysocieties-design/SKILL.md](.agents/skills/surreysocieties-design/SKILL.md). Small fixes do not need a new design brief or reference hunt.
- For an existing /ai robot-head hero, Three.js owns the robot; Anime.js is for scroll/reveal choreography. Preserve reduced-motion fallback.
- Inspect affected desktop/mobile views before UI handoff. Preserve society labels, asset identity, accessible controls, and member-data privacy.
- Authorization, roles, invites, and admin provisioning must remain enforced server-side. Confirm the intended deployment before data mutations or provisioning.

<!-- convex-ai-start -->
When changing Convex code, read convex/_generated/ai/guidelines.md and the applicable Convex skill. Keep generated files generated. A missing optional skill is not a reason to reinstall tooling or block unrelated frontend work.
<!-- convex-ai-end -->


Installed Convex skills provide task-specific technical guidance. A complex fix already authorized by the user does not need a second approval just because a skill suggests presenting options. Prepare and verify local changes within scope; pause only the step that needs missing credentials, a material product decision, or ungranted production authority.
