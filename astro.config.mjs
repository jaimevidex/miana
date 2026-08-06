import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// Substituir pelo domínio real antes do deploy — usado no sitemap e em meta tags Open Graph.
// Definir PUBLIC_SITE_URL em .env quando o domínio existir (ver .env.example e docs/PLAN.md fase deferred).
const SITE_URL = process.env.PUBLIC_SITE_URL ?? 'https://exemplo-mariana.pt';

export default defineConfig({
  site: SITE_URL,
  integrations: [
    tailwind({ applyBaseStyles: false }),
    sitemap(),
  ],
  image: {
    domains: [],
  },
});