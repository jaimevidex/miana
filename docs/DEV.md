# Developer guide

## Prerequisites

- Node 20+
- [just](https://github.com/casey/just)
- [wrangler](https://developers.cloudflare.com/workers/wrangler/) (via npx)
- [Mailpit](https://mailpit.axllent.org/) for local email (`brew install mailpit`)

## Dev modes

| Command | Port | Use |
|---------|------|-----|
| `just dev-astro` | 4321 | UI only (no Worker API) |
| `just dev` | 8787 | Full stack: build Astro → wrangler + Mailpit |
| `just down` | - | Stop wrangler + Mailpit |

Mailpit UI: http://localhost:8026 (SMTP `:1026`).

Full-stack currently rebuilds Astro before `wrangler dev` (no HMR for Worker-served pages). For CSS/markup iteration on marketing pages, use `just dev-astro`.

## Env

1. Copy `.env.example` → `.env` (`PUBLIC_*` for Astro build)
2. Create `.dev.vars` for Worker local (gitignored):

```
EMAIL_ENABLED=true
RESEND_API_KEY=REPLACE_ME
OWNER_EMAIL=hello@marianapita.pt
SITE_URL=http://localhost:8787
FROM_EMAIL=hello@marianapita.pt
```

## Database

```bash
npx wrangler d1 migrations apply miana-db --local
npx wrangler d1 migrations apply miana-db --remote   # production
npx tsx worker/seed.ts '<password>'                 # writes seed SQL - apply manually
```

Never commit real passwords. Rotate if they were ever committed.

## Tests

```bash
just dev          # terminal 1
npm test          # terminal 2 - ./tests/run.sh
npx tsx tests/email-match.ts
./tests/flow.sh   # admin e2e (needs seeded user)
npm run worker:check
```

## Email inbound (Cloudflare Email Routing)

Outbound vai de `hello@marianapita.pt` (Resend). Respostas entram no Worker via Email Routing (handler `email` em `worker/index.ts`) e uma cópia deve continuar na caixa hello@.

1. Confirmar MX actual (provavelmente Google). Email Routing exige MX Cloudflare.
2. Activar Email Routing; destino verificado = caixa actual; regra `hello@` → este Worker **e** o destino.
3. Opcional: `EMAIL_FORWARD_TO` se o Worker tiver de fazer `message.forward()`.
4. Local: Mailpit para outbound. Inbound: `npx tsx tests/email-match.ts` e, com `just dev`, `POST /api/admin/dev/inbound` (só local).

## ECC (Cursor, global)

Installed under `~/.cursor/` (agents `ecc-*`, rules `ecc-*`, skills non-colliding with Cloudflare skills).

- Memory: `ECC_AGENT_DATA_HOME=$HOME/.cursor/ecc` (also in `~/.zshrc`)
- Notes: `~/.cursor/ecc/INSTALL.md`
- Update: staging install with `npx ecc-universal@2.2.0 install --profile minimal --target cursor`, then promote without overwriting Cloudflare skills
- Do **not** stack Claude Code `/plugin install ecc@ecc` on top of this Cursor install

Project-specific rules live in `.cursor/rules/` (this repo) and override/extend ECC.

## Notion

- **Tickets source of truth:** [Miana Notion DB](https://www.notion.so/3c95ea0216878000af96c1d13c1d01b7?v=3c95ea02168780158192000c4e55e858)
- Suggested properties: `Status`, `Tipo` (`dev` | `cliente`), `Priority`, `GitHub` (optional link)
- Repo mirrors: [TODO.md](../TODO.md) (dev), [CLIENT-TODO.md](CLIENT-TODO.md) (client escalation)
- Optional: Notion MCP in Cursor for read-only ticket context - no bidirectional API sync

## GitHub

- CI: typecheck + build on PR/push (`.github/workflows/ci.yml`)
- Deploy: **manual** via `just deploy` (wrangler CLI logged in locally) - no GitHub Secrets needed
- Optional auto-deploy: `.github/workflows/deploy.yml` is `workflow_dispatch` only; enable later if you add `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`
- Issue templates: bug, feature, client-feedback
- PR template under `.github/`

Enable branch protection on `main` when ready (require CI).

## Deploy (manual)

```bash
just deploy
# or: npm run build && npx wrangler deploy
```

See also [DEPLOYMENT.md](DEPLOYMENT.md).
