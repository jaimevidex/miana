# DEPLOYMENT

## Stack de hosting
- **Build:** Astro (`npm run build` → gera `/dist` estático)
- **Hosting:** Cloudflare (Worker com Static Assets via Wrangler) - subdomínio: `miana.maquiadora-site.workers.dev`
- **DNS/Domínio:** `marianapita.pt` registado no OVH, nameservers apontados para Cloudflare (`julian.ns.cloudflare.com` / `lucy.ns.cloudflare.com`)
- **Formulários:** enviados via Worker para o `POST /api/contact` do próprio site - ver `worker/index.ts` e `worker/email.ts` (email via Resend)

## Deploy (Wrangler - já executado)

Pré-requisitos:
- `npx wrangler login` (fluxo OAuth, uma vez)
- `.env` com `PUBLIC_SITE_URL` (não commitar; secrets do Worker vivem em `.dev.vars` ou `wrangler secret put`)

Passos:
1. `npm run build` (gera/destino `dist`)
2. `npx wrangler deploy` - usa `wrangler.toml` (`[assets] directory = "./dist"`)

Nota: nestes versão, Pages é delegado para Workers. O domínio custom liga-se com `wrangler domains` depois de o domínio ficar **Active** no Cloudflare.

## DNS / Domínio

1. Dominio `marianapita.pt` comprado no OVH (Cloudflare Registrar não suporta `.pt`).
2. Em Cloudflare: **Add a site** → plano Free → guardar os 2 nameservers.
3. No OVH (**Servidores DNS / Nameservers**, não a Zona DNS): substituir pelos 2 do Cloudflare.
4. Aguardar propagação (Cloudflare passa de Pending → Active).
5. Após Active: adicionar CNAME `marianapita.pt` → `miana.maquiadora-site.workers.dev` e ligar domínio custom ao projeto.
6. SSL automático (Cloudflare Universal SSL).

## Formulários (via Worker + Resend)

Os formulários (Bridal, Education e os genéricos) fazem `POST /api/contact` directamente para o Worker, que valida, faz rate-limit e envia um email à dona via **Resend**.

1. Criar conta em https://resend.com e verificar o domínio `marianapita.pt` (SPF/DKIM/DMARC).
2. Gerar uma **API Key** e defini-la como secret no Worker:
   - `npx wrangler secret put RESEND_API_KEY`
3. Defender o destinatário no deploy: `OWNER_EMAIL=hello@marianapita.pt` (secret ou variável de env).
4. No dev: preencher `.dev.vars` (não commitar) com `RESEND_API_KEY`, `EMAIL_ENABLED=true` e `RATE_LIMIT_DISABLED=true`.
5. Um Worker serve todos os formulários (diferenciados por `subject`), tal como antes com as keys por formulário.
6. Testar com um submit real; confirmar a entrega do email na caixa da dona (verificar SPF/DKIM antes).

## Checklist pré-lançamento

- [x] Build ok, 6+ páginas
- [x] Formulários ligados ao Worker (`POST /api/contact` → email via Resend)
- [x] Política de Privacidade & Cookies (RGPD)
- [x] Sitemap + robots.txt (com domínio real)
- [x] Meta/OG por página
- [ ] Trocar placeholders por imagens reais (ver `IMAGES.md`)
- [ ] Ligar domínio custom `marianapita.pt` (após Active no Cloudflare)
- [ ] Testar envio real do formulário até ao email (dona)
- [ ] Google Search Console + sitemap submetido
- [ ] Google Analytics / Meta Pixel (ver deferred)