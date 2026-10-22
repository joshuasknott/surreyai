import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const outdir = "dist";
await mkdir(outdir, { recursive: true });

await build({
  entryPoints: ["server/index.ts"],
  outfile: `${outdir}/_worker.js`,
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  jsx: "automatic",
  conditions: ["workerd", "worker", "browser"],
  external: ["node:*"],
  sourcemap: true,
  minify: true,
  legalComments: "none",
  plugins: [
    {
      name: "portfolio-css",
      setup(pluginBuild) {
        pluginBuild.onResolve({ filter: /\.css\?raw$/ }, (args) => ({
          path: resolve(args.resolveDir, args.path.replace(/\?raw$/, "")),
          namespace: "portfolio-css-raw",
        }));
        pluginBuild.onLoad(
          { filter: /.*/, namespace: "portfolio-css-raw" },
          async (args) => ({
            contents: await (
              await import("node:fs/promises")
            ).readFile(args.path, "utf8"),
            loader: "text",
          }),
        );
        pluginBuild.onResolve({ filter: /\.css$/ }, (args) => ({
          path: resolve(args.resolveDir, args.path),
          namespace: "portfolio-css-empty",
        }));
        pluginBuild.onLoad(
          { filter: /.*/, namespace: "portfolio-css-empty" },
          () => ({ contents: "export default {};", loader: "js" }),
        );
      },
    },
  ],
});

await writeFile(
  `${outdir}/_routes.json`,
  `${JSON.stringify({ version: 1, include: ["/*"], exclude: [] })}\n`,
  "utf8",
);
