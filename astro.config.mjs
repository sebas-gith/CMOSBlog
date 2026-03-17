// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import expressiveCode from 'astro-expressive-code'; 
import tailwind from '@astrojs/tailwind';


// https://astro.build/config
export default defineConfig({
  site: 'https://example.com',
  integrations: [expressiveCode({themes: ['tokyo-night', 'catppuccin-latte']}), mdx(), sitemap(), tailwind()],

});