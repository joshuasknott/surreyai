import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const clientRoot = path.join(projectRoot, "dist", "client");
const outputRoot = path.join(projectRoot, "dist", "vercel");

let html = await readFile(path.join(clientRoot, "index.html"), "utf8");

const scriptMatch = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
const styleMatch = html.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/);

if (!scriptMatch || !styleMatch) {
  throw new Error("Could not find the Vite script and stylesheet in dist/client/index.html");
}

let javascript = await readFile(path.join(clientRoot, scriptMatch[1]), "utf8");
const css = await readFile(path.join(clientRoot, styleMatch[1]), "utf8");

const images = [
  ["/images/hero-build-space.webp", "image/webp"],
  ["/images/builder-portrait.webp", "image/webp"],
  ["/images/notebook-prototype.webp", "image/webp"],
  ["/images/demo-room.webp", "image/webp"],
  ["/images/surrey-ai-hack-logo.png", "image/png"],
];

for (const [publicPath, mimeType] of images) {
  const bytes = await readFile(path.join(clientRoot, publicPath));
  const dataUri = `data:${mimeType};base64,${bytes.toString("base64")}`;
  javascript = javascript.replaceAll(publicPath, dataUri);
}

// Inline scripts must not contain a literal closing script tag. Using a
// replacement callback also prevents `$&` and other `$` sequences in the
// minified bundle from being interpreted as String.replace patterns.
const inlineJavascript = javascript.replaceAll("</script", "<\\/script");
const inlineCss = css.replaceAll("</style", "<\\/style");

html = html
  .replace(scriptMatch[0], () => `<script type="module">${inlineJavascript}</script>`)
  .replace(styleMatch[0], () => `<style>${inlineCss}</style>`);

await mkdir(outputRoot, { recursive: true });
await writeFile(path.join(outputRoot, "index.html"), html);

console.log(`Prepared inlined Vercel bundle (${Buffer.byteLength(html)} bytes)`);
