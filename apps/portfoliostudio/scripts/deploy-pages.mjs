import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const outputDir = "dist";
const requiredFiles = ["index.html", "_worker.js"];
const missing = requiredFiles.filter(
  (file) => !existsSync(`${outputDir}/${file}`),
);

if (missing.length > 0) {
  console.error(
    `Pages deploy stopped: build output is missing ${missing.join(", ")}.`,
  );
  console.error(
    "Build the Vite app and the Pages advanced-mode worker before deploying.",
  );
  process.exit(1);
}

const command = process.execPath;
const result = spawnSync(
  command,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "pages",
    "deploy",
    outputDir,
    "--project-name",
    "portfolio-studio",
    "--branch",
    "main",
  ],
  {
    stdio: "inherit",
    shell: false,
  },
);

if (result.error) {
  console.error(
    `Could not run ${command}. Add Wrangler to devDependencies or run the equivalent Wrangler command directly.`,
  );
  process.exit(1);
}

process.exit(result.status ?? 1);
