#!/usr/bin/env node

/** Build browser-ready desktop and mobile derivatives from Blender's GLB.
 *
 * Usage:
 *   node optimize_hintze_hall.mjs <intermediate.glb> <output-directory>
 *
 * Geometry uses meshoptimizer simplification and EXT_meshopt_compression. The
 * baked-colour atlases become WebP at 4096px (desktop) and 2048px (mobile).
 */

import { mkdir, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) {
  console.error("Usage: node optimize_hintze_hall.mjs <intermediate.glb> <output-directory>");
  process.exit(2);
}

const input = path.resolve(inputArg);
const output = path.resolve(outputArg);
await mkdir(output, { recursive: true });

const tiers = [
  { name: "desktop", ratio: "0.58", error: "0.00025", texture: "4096" },
  { name: "mobile", ratio: "0.22", error: "0.0006", texture: "2048" },
];

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: true, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

for (const tier of tiers) {
  const target = path.join(output, `hintze-hall-${tier.name}-v1.glb`);
  await run("npx", [
    "--yes", "@gltf-transform/cli", "optimize", input, target,
    "--compress", "meshopt",
    "--meshopt-level", "high",
    "--simplify", "true",
    "--simplify-ratio", tier.ratio,
    "--simplify-error", tier.error,
    "--simplify-lock-border", "true",
    "--texture-compress", "webp",
    "--texture-size", tier.texture,
    "--flatten", "true",
    "--join", "true",
    "--palette", "false",
  ]);
  const info = await stat(target);
  console.log(JSON.stringify({ tier: tier.name, path: target, bytes: info.size }));
}
