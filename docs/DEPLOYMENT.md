# DEPLOYMENT

## Stack de hosting
- **Build:** Astro (`npm run build` → gera `/dist` estático)
- **Hosting:** Cloudflare Pages (ou Netlify — instruções equivalentes)
- **DNS/Domínio:** Cloudflare Registrar (ou onde já estiver comprado, com nameservers apontados para Cloudflare)
- **Formulário:** Web3Forms (endpoint gratuito, sem backend) — ver `src/components/ContactForm.astro`

## Passos — Cloudflare Pages

1. Criar repositório git (GitHub/GitLab) e fazer push do projeto.
2. Em Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Selecionar o repositório.
4. Build settings:
   - Framework preset: `Astro`
   - Build command: `npm run build`
   - Output directory: `dist`
5. Deploy. Cloudflare dá um subdomínio `*.pages.dev` para testar.
6. Domínio próprio: **Custom domains** → adicionar o domínio → seguir instruções de DNS (CNAME automático se o domínio já estiver na Cloudflare).
7. SSL é automático (Cloudflare Universal SSL).

## Passos — Formulário (Web3Forms)

1. Criar conta gratuita em https://web3forms.com e gerar uma **Access Key**.
2. Colocar a key em `src/components/ContactForm.astro` (variável `WEB3FORMS_KEY`, ou idealmente como variável de ambiente pública do Astro — ver `.env.example`).
3. Testar o envio em produção (o Web3Forms só valida domínios depois do 1º submit real).

## Checklist pré-lançamento

- [ ] Todas as imagens otimizadas (ver `IMAGES.md`)
- [ ] Meta tags de SEO preenchidas por página (title, description, Open Graph)
- [ ] `sitemap.xml` gerado (`@astrojs/sitemap`)
- [ ] `robots.txt` presente
- [ ] Favicon e ícone para partilha (OG image) configurados
- [ ] Formulário testado end-to-end (email chega mesmo)
- [ ] Testado em mobile real (não só DevTools)
- [ ] Lighthouse ≥ 90 em Performance, Accessibility, SEO
- [ ] Links de redes sociais corretos
- [ ] Google Search Console configurado e sitemap submetido
- [ ] (Opcional) Google Analytics / Meta Pixel

## Variáveis de ambiente

Ver `.env.example` na raiz — copiar para `.env` e preencher localmente (nunca commitar `.env`).
