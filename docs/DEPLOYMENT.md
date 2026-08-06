# DEPLOYMENT

## Stack de hosting
- **Build:** Astro (`npm run build` → gera `/dist` estático)
- **Hosting:** Cloudflare (Worker com Static Assets via Wrangler) — subdomínio: `miana.maquiadora-site.workers.dev`
- **DNS/Domínio:** `marianapita.pt` registado no OVH, nameservers apontados para Cloudflare (`julian.ns.cloudflare.com` / `lucy.ns.cloudflare.com`)
- **Formulário:** Web3Forms (endpoint gratuito, sem backend) — ver `src/lib/web3form.ts` e `.env`

## Deploy (Wrangler — já executado)

Pré-requisitos:
- `npx wrangler login` (fluxo OAuth, uma vez)
- `.env` com `PUBLIC_WEB3FORMS_KEY` e `PUBLIC_SITE_URL` (não commitar)

Passos:
1. `npm run build` (gera/destino `dist`)
2. `npx wrangler deploy` — usa `wrangler.toml` (`[assets] directory = "./dist"`)

Nota: nestes versão, Pages é delegado para Workers. O domínio custom liga-se com `wrangler domains` depois de o domínio ficar **Active** no Cloudflare.

## DNS / Domínio

1. Dominio `marianapita.pt` comprado no OVH (Cloudflare Registrar não suporta `.pt`).
2. Em Cloudflare: **Add a site** → plano Free → guardar os 2 nameservers.
3. No OVH (**Servidores DNS / Nameservers**, não a Zona DNS): substituir pelos 2 do Cloudflare.
4. Aguardar propagação (Cloudflare passa de Pending → Active).
5. Após Active: adicionar CNAME `marianapita.pt` → `miana.maquiadora-site.workers.dev` e ligar domínio custom ao projeto.
6. SSL automático (Cloudflare Universal SSL).

## Formulário (Web3Forms)

1. Criar conta gratuita em https://web3forms.com e gerar uma **Access Key**.
2. Colocar a key no `.env` → `import.meta.env.PUBLIC_WEB3FORMS_KEY`.
3. Uma key serve todos os formulários (diferenciados por `subject`). Orar em `CLOUDFLARE_PAGES`.
4. No deploy (Cloudflare): definir as variáveis `PUBLIC_WEB3FORMS_KEY` e `PUBLIC_SITE_URL` (o `.env` não vai para o deploy).
5. Após o 1º submit real, o Web3Forms valida o domínio/remetente.

## Checklist pré-lançamento

- [x] Build ok, 6+ páginas
- [x] Formulários ligados (key no `.env` + injetada no build)
- [x] Política de Privacidade & Cookies (RGPD)
- [x] Sitemap + robots.txt (com domínio real)
- [x] Meta/OG por página
- [ ] Trocar placeholders por imagens reais (ver `IMAGES.md`)
- [ ] Ligar domínio custom `marianapita.pt` (após Active no Cloudflare)
- [ ] Testar envio real do formulário até ao email
- [ ] Google Search Console + sitemap submetido
- [ ] Google Analytics / Meta Pixel (ver deferred)