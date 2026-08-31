# Miana - Mariana Pita Makeup

Site e backoffice da maquilhadora profissional [marianapita.pt](https://marianapita.pt).

**Stack:** Astro 4 (marketing estático) + Cloudflare Worker (API, admin SSR, funil Skin Call) + D1 + R2 + Resend.

## O que é

| Superfície | Tecnologia | Função |
|------------|------------|--------|
| Site público | Astro + Tailwind → `dist/` | Páginas, galeria, formulários |
| API / funil | Worker (`worker/`) | Leads, diagnóstico, orçamentos, emails |
| Admin | Worker SSR HTML | Dashboard leads/clientes/settings |
| Dados | Cloudflare D1 (Drizzle) | users, leads, clients, diagnostics, sessions, settings |
| Fotos | R2 bucket `media` | Diagnósticos (`diagnostics/`) |
| Email | Resend (prod) / Mailpit (local) | Notificações + orçamentos |

## Documentação

| Doc | Conteúdo |
|-----|----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Data flow, bindings, módulos |
| [docs/DEV.md](docs/DEV.md) | Dev loop, ECC, migrations, CI |
| [docs/CLIENT-TODO.md](docs/CLIENT-TODO.md) | Escalation / feedback da cliente (PT) |
| [TODO.md](TODO.md) | Backlog técnico activo |
| [docs/BRIEF.md](docs/BRIEF.md) | Brief cliente |
| [docs/DESIGN.md](docs/DESIGN.md) | Design system |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deploy / DNS / secrets |

Tickets: Notion DB (source of truth) - ver links em `docs/DEV.md` e `docs/CLIENT-TODO.md`.

## Quick start

```bash
npm install
cp .env.example .env   # PUBLIC_* para o Astro
# .dev.vars para o Worker (RESEND_API_KEY placeholder, etc.)

just dev               # Mailpit + build Astro + wrangler :8787
# UI emails: http://localhost:8026
# App:      http://localhost:8787
```

Só frontend (sem API): `just dev-astro` → `:4321`.

## Comandos úteis

```bash
just worker-check      # tsc worker
npm test               # ./tests/run.sh (precisa de just dev a correr)
just deploy            # build + wrangler deploy
npx wrangler d1 migrations apply miana-db --local
npx tsx worker/seed.ts '<password>'   # seed admin - nunca commits passwords
```

## Estrutura

```
src/           Astro pages + components
worker/        Cloudflare Worker (router, admin, email, templates, db)
migrations/    Drizzle SQL → D1
tests/         Shell integration tests
docs/          Product + engineering docs
.cursor/rules/ Project Cursor rules (on top of global ECC)
```

## Admin

- Local: `http://localhost:8787/admin/login`
- Prod: `https://marianapita.pt/admin/login`
- Seed: `npx tsx worker/seed.ts '<secure-password>'` then apply generated SQL to D1
