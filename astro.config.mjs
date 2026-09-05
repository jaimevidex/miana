import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// Substituir pelo domínio real antes do deploy - usado no sitemap e em meta tags Open Graph.
// Definir PUBLIC_SITE_URL em .env quando o domínio existir (ver .env.example e docs/PLAN.md fase deferred).
const SITE_URL = process.env.PUBLIC_SITE_URL ?? 'https://marianapita.pt';

export default defineConfig({
  site: SITE_URL,
  i18n: {
    defaultLocale: 'pt',
    locales: ['pt', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    tailwind({ applyBaseStyles: false }),
    sitemap({
      i18n: {
        defaultLocale: 'pt',
        locales: {
          pt: 'pt-PT',
          en: 'en-GB',
        },
      },
    }),
  ],
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
});