// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  compressHTML: true,
  devToolbar: { enabled: false },
  output: 'server',
  adapter: vercel(),
  security: { checkOrigin: true },
});
