import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const runtimeDir = resolve(projectRoot, "output/e2e-runtime");
const distDir = resolve(projectRoot, "dist");
const siteDir = resolve(runtimeDir, "site");
const persistDir = resolve(projectRoot, "output/e2e-db");
const sourceConfig = resolve(projectRoot, "wrangler.test.json");
const runtimeConfig = resolve(runtimeDir, "wrangler.jsonc");
const runtimePackage = resolve(runtimeDir, "package.json");
const runtimeDevVars = resolve(runtimeDir, ".dev.vars");
const wrangler = resolve(projectRoot, "node_modules/wrangler/bin/wrangler.js");

await mkdir(runtimeDir, { recursive: true });
await cp(distDir, siteDir, { recursive: true, force: true });
// Wrangler discovers its project root by walking up to package.json. Keep the
// isolated test project rooted here so production wrangler.jsonc/.dev.vars are
// never loaded into browser QA.
await writeFile(runtimePackage, '{"private":true,"type":"module"}\n', "utf8");
await writeFile(
  runtimeDevVars,
  "APP_ORIGIN=http://127.0.0.1:8788\nPUBLIC_APP_URL=http://127.0.0.1:8788\nADMIN_USER_IDS=\n",
  "utf8",
);
const config = JSON.parse(await readFile(sourceConfig, "utf8"));
config.pages_build_output_dir = "./site";
await writeFile(runtimeConfig, `${JSON.stringify(config, null, 2)}\n`, "utf8");

const child = spawn(
  process.execPath,
  [
    wrangler,
    "pages",
    "dev",
    "site",
    "--port",
    "8788",
    "--persist-to",
    persistDir,
    "--binding",
    "APP_ORIGIN=http://127.0.0.1:8788",
    "--binding",
    "PUBLIC_APP_URL=http://127.0.0.1:8788",
    "--binding",
    "ADMIN_USER_IDS=",
  ],
  {
    cwd: runtimeDir,
    stdio: "inherit",
    windowsHide: true,
  },
);

const forward = (signal) => child.kill(signal);
process.on("SIGINT", () => forward("SIGINT"));
process.on("SIGTERM", () => forward("SIGTERM"));
process.on("SIGHUP", () => forward("SIGHUP"));
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
