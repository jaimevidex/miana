# [Nome] — Site de Maquilhadora Profissional

Site estático (sem backend) construído com **Astro** + **Tailwind CSS**, otimizado para imagens de alta qualidade e SEO.

## Stack
- [Astro](https://astro.build) — geração estática, otimização automática de imagens (`astro:assets`)
- [Tailwind CSS](https://tailwindcss.com) — estilos
- [Worker (Cloudflare)](https://developers.cloudflare.com/workers/) — envia os formulários para o email da dona via Resend (`POST /api/contact`)
- Deploy: Cloudflare Worker (Static Assets)

## Documentação do projeto

Ver pasta `/docs`:
- `BRIEF.md` — respostas da cliente (preencher primeiro)
- `SITEMAP.md` — estrutura de páginas e navegação
- `DESIGN.md` — paleta de cores, tipografia, layout, elemento assinatura
- `CONTENT.md` — copy real por página
- `IMAGES.md` — inventário e pipeline de imagens
- `DEPLOYMENT.md` — passos de deploy
- `TODO.md` — checklist por fase

## Correr localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:4321`.

## Build de produção

```bash
npm run build
npm run preview
```

## Estrutura

```
src/
  layouts/Layout.astro       ← layout base (head, header, footer)
  components/
    Header.astro
    Footer.astro
    Hero.astro
    SwatchDivider.astro      ← elemento assinatura (ver DESIGN.md)
    Gallery.astro
    ContactForm.astro
  pages/
    index.astro
    sobre.astro
    portfolio.astro
    servicos.astro
    contacto.astro
  styles/global.css
public/
  images/                    ← colocar imagens otimizadas aqui
```

## Próximos passos
1. Preencher `docs/BRIEF.md` com a cliente.
2. Substituir todo o texto placeholder (marcado com `<!-- TODO -->` ou `[...]`) com `docs/CONTENT.md`.
3. Substituir imagens placeholder em `public/images` pelas reais (ver `docs/IMAGES.md`).
4. Configurar os formulários → `POST /api/contact` no Worker (ver `docs/DEPLOYMENT.md`).
5. Deploy — seguir `docs/DEPLOYMENT.md`.
