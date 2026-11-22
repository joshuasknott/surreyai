import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const ai = 'apps/ai/public';
const portfolio = 'apps/portfoliostudio/public/brand';
const hack = 'apps/hack/assets';
const aiAvatar = `${ai}/logos/brand/surrey-ai-avatar-light.png`;
const aiWordmark = `${ai}/logos/brand/surrey-ai-logo-transparent.png`;
const opt = `${ai}/logos/optimized`;
const root = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

async function generate(source, target, widths, crop) {
  await Promise.all(widths.map(async (width) => {
    const image = sharp(root(source));
    if (crop) image.extract(crop);
    await image.resize({ width }).webp({ lossless: true }).toFile(root(`${target}-${width}.webp`));
  }));
}

await Promise.all([
  generate(`${ai}/logos/society.png`, `${opt}/society`, [112]),
  generate(aiAvatar, `${opt}/surrey-ai-avatar-light`, [40, 48, 80, 96, 160]),
  generate(aiWordmark, `${opt}/surrey-ai-capsule`, [44, 88], { left: 0, top: 0, width: 360, height: 360 }),
  generate(aiWordmark, `${opt}/surrey-ai-wordmark`, [312, 624]),
  generate(`${portfolio}/ai-monogram.png`, `${portfolio}/ai-monogram`, [32, 64]),
  generate(`${portfolio}/surrey-ai-logo.png`, `${portfolio}/surrey-ai-logo`, [100, 200]),
  generate(`${hack}/surrey-ai-society.png`, `${hack}/surrey-ai-society`, [273, 546]),
  generate(`${hack}/logo.webp`, `${hack}/logo`, [280, 560]),
  sharp(root(aiAvatar)).resize(32).png().toFile(root(`${opt}/surrey-ai-avatar-light-32.png`)),
  sharp(root(`${hack}/logo.webp`)).resize(32, 32, { fit: 'contain', background: '#00000000' }).png().toFile(root(`${hack}/favicon-32.png`)),
]);
