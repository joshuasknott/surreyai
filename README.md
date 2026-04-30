# surreysocieties monorepo

A monorepo containing three University of Surrey society websites, built with Astro and Tailwind CSS.

## Sites

| Society | App | Domain | Dev Port |
|---------|-----|--------|----------|
| Surrey AI Society | `apps/ai` | surreyaisociety.org | 4321 |
| Surrey Business Society | `apps/business` | surreybusinesssociety.org | 4322 |
| Surrey Neurotech Society | `apps/neurotech` | surreyneurotechsociety.org | 4323 |

## Tech Stack

- **Framework:** [Astro](https://astro.build/) (static sites)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Language:** TypeScript
- **Monorepo:** npm workspaces

## Getting Started

```bash
# Install all dependencies
npm install

# Start a specific site
npm run dev:ai         # http://localhost:4321
npm run dev:business   # http://localhost:4322
npm run dev:neurotech  # http://localhost:4323

# Build a specific site
npm run build:ai
npm run build:business
npm run build:neurotech

# Build all sites
npm run build:all
```

## Project Structure

```
surreysocieties/
├── apps/
│   ├── ai/              # Surrey AI Society website
│   ├── business/        # Surrey Business Society website
│   └── neurotech/       # Surrey Neurotech Society website
├── packages/
│   └── ui/              # Shared components & utilities
└── package.json         # Workspace root
```

## Shared Code

- **`packages/ui`** — Shared Astro components (e.g., `BaseLayout`), constants, and TypeScript types used across all three sites.
