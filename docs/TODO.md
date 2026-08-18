# TODO — Ciclo de trabalho

> Estado real do projeto. Doc de referência: `PLAN.md` (plano original). Este ficheiro regista o ciclo atual: Fase 1 (Frontend — formulários/páginas) → Fase 2 (Backend / funnel Skin Call), dependente do domínio ficar Active.

## Estado recente do frontend (formulários)

### Bridal (`/servicos/bridal`)
- [x] Removida preseleção das questoes de opção (Bride/Guests, serviços, Add-on Skin Call)
- [x] Opções obrigatórias com `*`; campos Guests & Events obrigatórios quando visíveis
- [x] Visual de erro partilhado (rádios destacam o título/legend)

### Skin Call (`/servicos/skin-call`)
- [x] Questões "rotina de skincare" e "preocupações" removidas → seleção direta do plano
- [x] Opções: One Time Call 3M / Duo Call 6M / Triple Call 9M / Full Year Call 12M / **Ainda não sei**
- [x] Legend com `*`, obrigatório, visual de erro no título
- [x] Em-dash `—` trocado por hífen `-` nas opções

### Education (`/servicos/education`)
- [x] Uniformização: removida pré-seleção (`tipo`, `modalidade`, `regime`)
- [x] Todos os grupos de opções com `*` no legend + `required`; campos de Group Sessions obrigatórios quando visíveis

### Validação partilhada (`src/lib/web3form.ts`)
- [x] `validateRequiredFields` ignora campos dentro de `.hidden` (Bride/Guests, Group Sessions)
- [x] Visual de erro: texto/inputs marcados burgundy; grupos de rádio destacam apenas o título (legend)

---

## Fase 1 — Frontend (formulários & páginas)

> Focados agora, enquanto o domínio configura.

### Uniformização dos formulários
- [x] Bridal: sem preseleção, opções obrigatórias com `*`
- [x] Skin Call: plano direto, sem preseleção, com `*` e opção "Ainda não sei"
- [x] Education: sem preseleção, `*` nos grupos, obrigatórios condicionais

### Páginas a rever
- [ ] Revisão de copy/UX das páginas do serviço (paralela ao trabalho de forms)

---

## Fase 2 — Backend / funnel Skin Call

> A proposta: quando alguém submete o skin-call, guardar o email e enviar um email ao lead com link para um formulário de diagnóstico privado, pré-preenchido; só esse diagnóstico gera o "pedido real" no backend.
>
> O domínio `marianapita.pt` está **Active** e o DNS já aponta para a Cloudflare — o bloqueio da Fase 2 está **desbloqueado** (ver `.env`, `wrangler.toml` e `worker/`).

### Código pronto (implementado, falta configurar credenciais no deploy)
- [x] `wrangler.toml`: sair do estático puro → Worker com `assets` + `kv_namespaces` (`LEADS`) + binding `send_email`
- [x] KV `LEADS`: gravar lead (nome/email/telefone/plano) com `token` único, TTL **48h** (`worker/lib.ts`)
- [x] `POST /api/lead`: grava lead + devolve link `/diagnostico?token=…` + emails (invite ao lead, aviso ao dono)
- [x] `GET /diagnostico?token=…`: página privada pré-preenchida (dados vêm do KV, não do browser) — `worker/diagnostico.ts`
- [x] Email: **Resend** (API REST, grátis — 3.000/mês, 100/dia). Envia `no-reply@marianapita.pt` no invite do lead; o diagnóstico termina em `hello@marianapita.pt`. `EMAIL_ENABLED=false` em modo stub — `worker/email.ts`
- [x] Stage 2 diagnóstico: reintroduzidas as questões de rotina de pele como o formulário de diagnóstico; submete o "pedido real" **diretamente por email à dona** (eliminada dependência Web3Forms no backend) — `POST /api/diagnostico`
- [x] Consentimento "Vou receber um email com link privado" antes do submit do stage 1
- [x] Honeypot `botcheck` + rate-limit por IP (5/h) no Worker
- [x] Limpeza automática via TTL 48h
- [x] `worker/tsconfig.json` + `npm run worker:check` / `just worker-check` (typecheck do Worker)

### Para configurar antes do deploy (credenciais / conta)
- [ ] Criar conta **Resend** e adicionar o domínio `marianapita.pt` (SPF/DKIM) — o Resend entrega os registos DNS para pores no `marianapita.pt`
- [ ] Secret `RESEND_API_KEY`: `npx wrangler secret put RESEND_API_KEY`
- [ ] Secret/var `EMAIL_ENABLED=true` (para ligar o envio real)
- [ ] Criar o KV `LEADS` e preencher `id`/`preview_id` no `wrangler.toml`
- [ ] Confirmar `OWNER_EMAIL` (default `hello@marianapita.pt`)
- [ ] Testar `wrangler dev` (feito: `/api/lead`, `/diagnostico`, `/api/diagnostico`, `/api/contact`, honeypot, rate-limit e consumo de token validados)

> Nota sobre custo: Cloudflare Email Sending (enviar para destinatários arbitrários) requer o plano Workers Paid. Por isso trocámos para Resend (free tier) — envia do próprio domínio via SPF/DKIM, sem plano pago.

### Melhorias de backend recomendadas (fora do ciclo atual)
- [x] Centralizar os 3 formulários no nosso Worker (eliminada dependência Web3Forms) — Bridal e Education via `POST /api/contact` (email à dona); Skin Call via funnel `token`
- [ ] Confirmação automática ao cliente em Bridal/Education (paridade com o funnel Skin Call) — via Resend

---

## Deferred — Para tratar depois (cliente / nós)

> Itens registados para não se perderem, fora do ciclo atual.

| # | Item | Prioridade | Estado |
|---|---|---|---|
| 1 | Entregar ficheiros de imagem reais (inventário `IMAGES.md`): ~6 por categoria (Noivas, Beauty, Workshops, Skincare) em alta resolução, com autorização/RGPD | Alta | ⏳ |
| 2 | Disponibilizar retrato "Sessão de Lisboa" para a página Meet Mariana (e hero) | Alta | ⏳ |
| 3 | Selecionar vídeos/reels a incluir no site | Média | ⏳ |
| 4 | Registar domínio e configurar email profissional | Média | ⏳ |
| 5 | Fornecer logótipo (SVG/PNG) — "A definir / Pelo designer" no BRIEF | Média | ⏳ |
| 6 | Fornecer testemunhos/reviews reais de clientes/noivas (espaço reservado na Home) | Média | ⏳ |
| 7 | Confirmar links reais de redes sociais (Instagram `@marianapita_makeup`) e se há WhatsApp/telefone para o Contacto | Média | ⏳ |
| 8 | Criar página Política de Privacidade & Cookies (RGPD) e respetivo link no footer | Média | ⏳ |
| 9 | Fornecer IDs do Google Analytics e Meta Pixel (blocos placeholder prontos no `Layout.astro` via `PUBLIC_GA_ID` / `PUBLIC_META_PIXEL_ID`) | Baixa | ⏳ |
| 10 | Deploy final: domínio na Cloudflare Pages, Search Console (tag pronta via `PUBLIC_GSC_VERIFICATION`), submissão do sitemap | Baixa | ⏳ |
| 11 | **Imagens / R2**: as galerias mantêm-se em `public/` estático (`astro:assets`); R2/upload remoto só se houver necessidade futura de gestão sem deploy | Baixa | ⏳ |