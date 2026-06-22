// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import clerk from '@clerk/astro';

export default defineConfig({
  compressHTML: true,
  site: 'https://surreyaisociety.org',
  output: 'server',
  adapter: vercel(),
  integrations: [clerk()],
  security: {
    checkOrigin: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
