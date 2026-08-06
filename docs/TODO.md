# TODO — Checklist por fase

> Estado real do projeto. Docs de referência: BRIEF, SITEMAP, CONTENT, DESIGN, IMAGES, PLAN.

## Fase 0 — Descoberta
- [x] `BRIEF.md` preenchido com a cliente
- [x] `SITEMAP.md`, `CONTENT.md`, `DESIGN.md`, `IMAGES.md` preenchidos
- [x] Plano guardado em `docs/PLAN.md`

## Fase A — Setup & Design System
- [x] Esqueleto Astro + Tailwind criado
- [ ] Paleta nova (burgundy/powder/offwhite/darkbrown) + fontes (Playfair/Pinyon/Open Sans)
- [ ] `npm install`

## Fase B — Páginas
- [ ] Home
- [ ] Meet Mariana (Sobre)
- [ ] Bridal & Beauty + Form 1
- [ ] The Skin Call + Form 2 (Quiz)
- [ ] Beauty Education + Form 3
- [ ] Contacto + Form geral

## Fase C — Imagens
- [ ] Galerias com placeholders (categorias: Noivas, Beauty, Workshops, Skincare)
- [ ] Trocar placeholders por ficheiros reais (ver "Deferred")

## Fase D — Integrações
- [ ] Ligar formulários (Web3Forms) — placeholder via env
- [ ] Links de redes sociais reais (ver "Deferred")

## Fase E — QA
- [ ] Testar mobile real
- [ ] Lighthouse (Performance/Acessibilidade/SEO) ≥ 90
- [ ] Rever todo o copy

## Fase F — Deploy
- [ ] Deploy Cloudflare Pages
- [ ] Domínio + DNS + SSL
- [ ] Sitemap + robots.txt
- [ ] Google Search Console

---

## Deferred — Para tratar depois (cliente / nós)

> Itens registados a pedido do utilizador para não se perderem. Viveram no todo da sessão e ficam persistidos aqui.

| # | Item | Prioridade | Estado |
|---|---|---|---|
| 1 | Entregar ficheiros de imagem reais (inventário `IMAGES.md`): ~6 por categoria (Noivas, Beauty, Workshops, Skincare) em alta resolução, com autorização/RGPD | Alta | ⏳ |
| 2 | Disponibilizar retrato "Sessão de Lisboa" para a página Meet Mariana (e hero) | Alta | ⏳ |
| 3 | Criar conta Web3Forms e obter Access Key (preencher `PUBLIC_WEB3FORMS_KEY` no `.env`) | Alta | ⏳ |
| 4 | Selecionar vídeos/reels a incluir no site | Média | ⏳ |
| 5 | Registar domínio e configurar email profissional | Média | ⏳ |
| 6 | Fornecer logótipo (SVG/PNG) — "A definir / Pelo designer" no BRIEF | Média | ⏳ |
| 7 | Fornecer testemunhos/reviews reais de clientes/noivas (espaço reservado na Home) | Média | ⏳ |
| 8 | Confirmar links reais de redes sociais (Instagram `@marianapita_makeup`) e se há WhatsApp/telefone para o Contacto | Média | ⏳ |
| 9 | Criar página Política de Privacidade & Cookies (RGPD) e respetivo link no footer | Média | ⏳ |
| 10 | Fornecer IDs do Google Analytics e Meta Pixel (blocos placeholder no código) | Baixa | ⏳ |
| 11 | Deploy final: domínio na Cloudflare Pages, Search Console, submissão do sitemap | Baixa | ⏳ |
| 12 | Fases futuras (não nesta fase): Newsletter, Calendly/agendamento online | Baixa | ⏳ |
