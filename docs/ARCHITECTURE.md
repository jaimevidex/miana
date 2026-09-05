# Architecture

## Runtime

```
Browser (Astro pages: PT unprefixed, EN under `/en/`)
  → POST /api/lead (`locale`) | GET /diagnostico | /admin/*
  → Cloudflare Worker (worker/index.ts)
       ├── Public: leads, diagnostic funnel
       ├── Admin SSR (worker/admin/*) + Admin API
       ├── D1 (Drizzle schema in worker/db/schema.ts)
       ├── R2 DIAG_PHOTOS (diagnostics/ + email-attachments/)
       └── Email (Resend / Mailpit outbound; Cloudflare Email Routing inbound)
  → Fallback: env.ASSETS → Astro dist/
```

## Bindings (`wrangler.toml`)

| Binding | Type | Purpose |
|---------|------|---------|
| `ASSETS` | Static assets | Astro `dist/` |
| `DB` | D1 | App database |
| `DIAG_PHOTOS` | R2 | Diagnostic photos and email attachments |

Env vars: `EMAIL_ENABLED`, `OWNER_EMAIL`, `SITE_URL`, `FROM_EMAIL` (hello@), `FROM_NAME`, `ADMIN_URL` (optional), `EMAIL_FORWARD_TO` (optional inbound copy). Secrets: `RESEND_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## Domain model

- **Lead** - form submission (`skin-call` | `bridal` | `beauty` | `education`). Status: `novo` | `pendente` | `aceite` | `eliminado`. Type-specific fields in `form_data` JSON. `locale` is `pt` | `en` (from the public form hidden field; default `pt`).
- **Client** - created when a quote is accepted (or manually). Optional `lead_id` (nullable for manual clients). `locale` is copied from the lead on accept (editable in Dados Pessoais).
- **Conversation** - email thread per lead (continues on the client after accept).
- **Email messages / attachments** - outbound and inbound, stored in D1 + R2.
- **Diagnostic** - Skin Call questionnaire; photos in R2; linked to lead and/or client.
- **Settings** - key/value prices, timing, contacts, payment placeholders, Google refresh token, and editable client-email copy (subject + constructed body with `{{bloco}}` for generated tables/buttons). PT keys stay `email_*_subject` / `email_*_body`; EN keys are `*_en`. Settings → Emails has a PT | EN toggle. A fixed logo signature (email / Instagram / site icons) is appended by `wrapEmail`, not stored in the body.
- **Sessions / rate_limits** - auth and abuse control in D1 (not KV).

Timestamps are **milliseconds** since epoch (`Date.now()`).

## Worker modules

| Path | Role |
|------|------|
| `worker/photos.ts` | Diagnostic photo keys, type sniffing, admin photo URLs |
| `worker/http.ts` | Auth/CSRF/CORS helpers |
| `worker/routes/handlers.ts` | Public + admin API handlers |
| `worker/services/quotes.ts` | Quote HTML/subject |
| `worker/admin.ts` | Admin HTML SSR |
| `worker/admin/settings.ts` | Settings page: section tabs + email copy editors |
| `worker/diagnostico.ts` | Diagnostic multi-page UI (copy follows lead/client `locale`) |
| `worker/i18n/diagnostico.ts` | PT/EN diagnostic chrome, option labels, field labels |
| `worker/locale.ts` | `pt` \| `en` parse helpers |
| `src/i18n/*` | Public site dictionaries + path helpers |
| `worker/email.ts` | Delivery |
| `worker/email-inbound.ts` | Cloudflare Email Worker ingest |
| `worker/conversation.ts` | Chat threads, send, inbound match |
| `worker/google-calendar.ts` | OAuth + Meet events |
| `worker/admin/chat.ts` | Chat UI |
| `worker/templates/*` | Quote, terms, schedule HTML (already wrapped - do not double-wrap) |
| `worker/email-copy.ts` | Editable email subjects/copy from settings + fallbacks + `EMAIL_FLOW_REGISTRY`. EN keys are `email_*_subject_en` / `email_*_body_en` (`getEmailCopy(env, locale)`) |
| `worker/email-copy-en.ts` | English fallbacks for client templates |
| `public/email/` | Signature logo + icon PNGs used in client email footers |
| `worker/pricing.ts` | Pricing/timing/contacts from settings + fallbacks |
| `worker/scheduling.ts` | Duration suggestions from timing settings |
| `worker/auth/*` | PBKDF2 + sessions + cookies |
| `worker/db/*` | Drizzle |

## Lead lifecycle

1. Form → `POST /api/lead` → D1 + owner notification (not in chat). No automatic client email.  
2. Bridal chat: introdutório (+ PDF serviços) → resposta da noiva → orçamento → termos → aceitar  
3. Beauty / Education / Skin Call chat: orçamento → termos → aceitar  
4. Skin Call (client page): marcar sessões → Meet + link `/diagnostico?token=`  
5. Diagnostic complete → owner notification  

See [EMAIL-FLOWS.md](EMAIL-FLOWS.md) for the full template hierarchy.

## Public i18n

- PT URLs have no prefix (`/servicos/bridal`). EN uses `/en/` with the same slugs (`/en/servicos/bridal`).
- Astro `i18n`: `defaultLocale: 'pt'`, `prefixDefaultLocale: false`. Sitemap hreflang: `pt-PT` / `en-GB`.
- Navbar `PT | EN` switches the equivalent path. The URL is the source of truth (no homepage auto-redirect).
- Forms send hidden `locale=pt|en`. Option **values** stored in `form_data` stay in the current strings; only visible labels translate.
- Admin UI stays Portuguese. Client-facing emails and `/diagnostico` follow `leads.locale` / `clients.locale`, with a composer PT | EN override that does not persist.
- Internal emails (novo pedido, diagnóstico preenchido) stay PT. Annex PDFs stay PT.

## Security notes

- Admin session: HttpOnly cookie, SameSite=Lax  
- State-changing `/api/admin/*` requires matching `csrf_token` cookie + `X-CSRF-Token` header  
- Honeypot + D1 rate limit on public lead endpoint  
- Diagnostic page: invalid tokens fail closed outside local/dev  
