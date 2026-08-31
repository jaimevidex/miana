# Miana - Technical backlog

Active engineering backlog. Client-facing asks live in [docs/CLIENT-TODO.md](docs/CLIENT-TODO.md). Tickets SO: Notion DB (see [docs/DEV.md](docs/DEV.md)).

## Foundations (in progress)

- [x] ECC global Cursor (`~/.cursor/`, minimal)
- [x] Docs: README, ARCHITECTURE, DEV, CLIENT-TODO
- [x] Project Cursor rules
- [x] GitHub CI + deploy workflow + issue/PR templates
- [x] Wire Notion DB URL into docs
- [x] Critical bug fixes (timestamps, settings→scheduling, pricing SOT, CSRF, email wrap, diag bypass, manual client FK)
- [x] Worker modularization (`routes/`, thin `index.ts`, `services/quotes`)

## Follow-ups after foundations

- [x] Apply migrations `0003`-`0009` on remote (`npx wrangler d1 migrations apply miana-db --remote`)
- [ ] Further split `admin.ts` / `diagnostico.ts` if they keep growing
- [ ] Optional Notion MCP in Cursor
- [ ] Optional: GitHub auto-deploy secrets later (not required - use `just deploy`)

## Product backlog

1. [x] Bridal form: bride makeup/hair/pack + guests qty por serviço + dual MUA/hair schedule
2. Four statuses + three lead actions - verify UI parity
3. Editable quote templates per type
4. Manual client create - nullable `lead_id` done; verify UI
5. Diagnostic invite from client (Skin Call)
6. Beauty (Guests & Events) form: alinhar qty por serviço como bridal (se pedido)
7. Edit all lead/client fields
8. Settings dashboard completeness
9. General polish (blur-up LQIP, email copy, diagnostic UX)

## Principles

- Each change independently deployable when possible
- Pricing/timing/contacts: Settings DB is source of truth; code fallbacks only
- Local email: Mailpit; production: Resend
- No secrets in git (seed via CLI args only)

## Commands

See [docs/DEV.md](docs/DEV.md) and `just --list`.
