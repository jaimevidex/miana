# PLAN - Website MARIANA (Science-Led Skincare & Effortless Beauty)

> Plano completo de implementação. Fonte: docs (BRIEF, SITEMAP, CONTENT, DESIGN, IMAGES), todos 🟢 completos.

**Stack:** Astro 4 + Tailwind 3 (v3.4) + Sitemap. Deploy: Cloudflare Worker (Static Assets). Formulários: Worker + Resend.

## Fase 0 - Persistência do plano & registo
- [x] 0.1 Guardar este plano em `docs/PLAN.md`
- [x] 0.2 Atualizar `docs/TODO.md` com estado real + secção "Deferred / Para tratar depois"

## Fase A - Design System
- [ ] A1. Paleta antiga → nova em `tailwind.config.mjs`: burgundy `#59010B`, powder `#BDDAF4`, offwhite `#FFFDF7`, darkbrown `#2D1918`
- [ ] A2. Fontes: Playfair Display + Pinyon Script (títulos) + Open Sans (corpo), via Google Fonts
- [ ] A3. `global.css`: cores base, selection, focus ring, eyebrow, reveal
- [ ] A4. `Layout.astro`: lang pt, meta/OG, fontes
- [ ] A5. Favicon/brand + `astro.config.mjs` site via env

## Fase B - Header/Footer
- [ ] B1. Header: menu 6 páginas (Home, Meet Mariana, Bridal & Beauty, The Skin Call, Beauty Education, Contacto) + CTA `[ Let's Book Your Glow ]` → `#contacto`
- [ ] B2. Footer: MARIANA, tagline, email, Instagram, Lisboa & Santarém, links legais RGPD, © 2026

## Fase C - Páginas (copy final de CONTENT.md)
| URL | Página | Form |
|---|---|---|
| `/` | Home | - |
| `/sobre` | Meet Mariana | - |
| `/servicos/bridal` | Bridal & Beauty | Form 1 |
| `/servicos/skin-call` | The Skin Call | Form 2 (Quiz) |
| `/servicos/education` | Beauty Education | Form 3 |
| `/contacto` | Contacto | Form geral |

## Fase D - Formulários (via Worker)
- Infraestrutura reutilizável, `POST /api/contact` do Worker, honeypot, ARIA, mensagem de sucesso comum. Email à dona via Resend (`worker/email.ts`).
- Form 2 (Quiz): Q1 recomenda plano (A→One Time, B→Duo, C→Triple, D→Full Year), Q2-Q5.
- Form 1 e Form 3: campos condicionais (Bride/Guests; Group Sessions).

## Fase E - Galerias
- `Gallery` com categorias (Noivas, Beauty, Workshops, Skincare), `astro:assets`, placeholders (ficheiros reais a entregar).

## Fase F - SEO & Analytics
- Meta por página, sitemap.xml, robots.txt, OG image.
- GA / Meta Pixel: blocos placeholder via env.

## Fase G - QA & Deploy
- Remover páginas antigas (`/portfolio`, `/servicos`), `npm install`, `npm run build`, mobile, Lighthouse ≥90.
- Deploy Cloudflare Pages, domínio, Search Console (ver TODO - deferred).

## Deferred (para tratar depois - ver docs/TODO.md)
Imagens reais, retrato "Sessão de Lisboa", domínio/email, vídeos/reels, logótipo, testemunhos, redes sociais/WhatsApp, política RGPD, GA/Meta IDs, deploy final, fases futuras (Newsletter/Calendly).
