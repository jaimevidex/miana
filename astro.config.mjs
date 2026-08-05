import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// Substituir pelo domínio real antes do deploy — usado no sitemap e em meta tags Open Graph.
const SITE_URL = 'https://exemplo-maquilhadora.pt';

export default defineConfig({
  site: SITE_URL,
  integrations: [
    tailwind({ applyBaseStyles: false }),
    sitemap(),
  ],
  image: {
    // Gera automaticamente variantes responsivas de imagem via astro:assets
    domains: [],
  },
});
