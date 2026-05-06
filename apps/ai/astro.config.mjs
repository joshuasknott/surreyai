// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import clerk from '@clerk/astro';

export default defineConfig({
  site: 'https://surreyaisociety.org',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [clerk()],
  vite: {
    plugins: [tailwindcss()],
  },
});
