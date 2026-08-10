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

## Fase 2 — Backend / funnel Skin Call (aguarda domínio `marianapita.pt` Active)

> A proposta: quando alguém submete o skin-call, guardar o email e enviar um email ao lead com link para um formulário de diagnóstico privado, pré-preenchido; só esse diagnóstico gera o "pedido real" no backend.

### Bloqueio
- [ ] Domínio `marianapita.pt` ficar **Active** + DNS (SPF/DKIM/DMARC) configurado — sem isto o Cloudflare Email não envia

### Arquitetura
- [ ] `wrangler.toml`: sair do estático puro → Worker com `assets` + `kv_namespaces` (`LEADS`)
- [ ] KV `LEADS`: gravar lead (nome/email/telefone/plano) com `token` único, TTL **48h**

### Endpoints (Worker)
- [ ] `POST /api/lead`: grava lead + devolve link `/diagnostico?token=…`
- [ ] `GET /diagnostico?token=…`: página privada pré-preenchida (dados vindos do token, não do browser)

### Email (Cloudflare Email)
- [ ] Binding `send_email` no Worker (remetente `no-reply@marianapita.pt`)
- [ ] Conteúdo: "Olá, vi que estás interessada na Skin Call, estamos quase lá… Quando tiveres 5 minutos preenche apenas este formulário de diagnóstico de pele para eu perceber o plano mais indicado para ti." + botão para o link
- [ ] Enquanto domínio não Active: `EMAIL_ENABLED=false` em modo stub/flag

### Stage 2 (diagnóstico)
- [ ] Reintroduzir as questões de rotina de pele (removidas do skin-call) como o formulário de diagnóstico
- [ ] Só o diagnóstico submete como "pedido real" (Web3Forms/backend), com nome/email/plano
- [ ] Stage 1 envia aviso leve ao dono; stage 2 o pedido completo (decisão: "receber nos dois")

### Segurança / RGPD
- [ ] Manter honeypot `botcheck` + rate-limit/anti-spam no Worker
- [ ] Consentimento "Vou receber um email com link privado" antes do submit do stage 1
- [ ] Limpeza automática via TTL 48h

### Melhorias de backend recomendadas
- [ ] Centralizar os 3 formulários no nosso Worker (eliminar dependência Web3Forms)
- [ ] Confirmação automática ao cliente em Bridal/Education (paridade com o funnel Skin Call)
- [ ] Rate-limit real por IP/email
- [ ] Visual custom dos radios (bolinha/ring burgundy) — baixo esforço

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
| 9 | Fornecer IDs do Google Analytics e Meta Pixel (blocos placeholder no código) | Baixa | ⏳ |
| 10 | Deploy final: domínio na Cloudflare Pages, Search Console, submissão do sitemap | Baixa | ⏳ |
| 11 | **Imagens / R2**: as galerias mantêm-se em `public/` estático (`astro:assets`); R2/upload remoto só se houver necessidade futura de gestão sem deploy | Baixa | ⏳ |