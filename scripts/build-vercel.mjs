import { execFileSync } from 'node:child_process';
import { cp, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const society = process.argv[2];
if (!['ai', 'business', 'neurotech'].includes(society)) {
  throw new Error('Specify one society: ai, business, or neurotech.');
}

const root = fileURLToPath(new URL('../', import.meta.url));
const app = join(root, 'apps', society);
execFileSync(process.execPath, [join(root, 'node_modules/astro/bin/astro.mjs'), 'build'], {
  cwd: app,
  stdio: 'inherit',
});

// Vercel reads the Build Output API bundle from the deployment root.
// Keep Astro's app-local output intact for local tooling and prebuilt releases.
const source = join(app, '.vercel', 'output');
await access(join(source, 'config.json'));
const destination = join(root, '.vercel', 'output');
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
console.log(`Prepared ${society} for Vercel at .vercel/output`);
