// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import clerk from '@clerk/astro';

const imageSizes = [360, 600, 640, 750, 828, 960, 1080, 1200, 1440, 1800, 1920, 2048, 3840];

export default defineConfig({
  compressHTML: true,
  site: 'https://surreyaisociety.org',
  output: 'server',
  adapter: vercel({
    imageService: true,
    imagesConfig: {
      sizes: imageSizes,
    },
  }),
  integrations: [clerk()],
  security: {
    checkOrigin: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
