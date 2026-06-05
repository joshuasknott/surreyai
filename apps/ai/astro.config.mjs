// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import clerk from '@clerk/astro';

export default defineConfig({
  compressHTML: true,
  site: 'https://surreyaisociety.org',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [clerk()],
  security: {
    checkOrigin: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
