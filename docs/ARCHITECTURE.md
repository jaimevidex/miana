# Architecture

## Runtime

```
Browser (Astro pages)
  → POST /api/lead | GET /diagnostico | /admin/*
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

- **Lead** - form submission (`skin-call` | `bridal` | `beauty` | `education`). Status: `novo` | `pendente` | `aceite` | `eliminado`. Type-specific fields in `form_data` JSON.
- **Client** - created when a quote is accepted (or manually). Optional `lead_id` (nullable for manual clients).
- **Conversation** - email thread per lead (continues on the client after accept).
- **Email messages / attachments** - outbound and inbound, stored in D1 + R2.
- **Diagnostic** - Skin Call questionnaire; photos in R2; linked to lead and/or client.
- **Settings** - key/value prices, timing, contacts, payment placeholders, Google refresh token.
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
| `worker/diagnostico.ts` | Diagnostic multi-page UI |
| `worker/email.ts` | Delivery |
| `worker/email-inbound.ts` | Cloudflare Email Worker ingest |
| `worker/conversation.ts` | Chat threads, send, inbound match |
| `worker/google-calendar.ts` | OAuth + Meet events |
| `worker/admin/chat.ts` | Chat UI |
| `worker/templates/*` | Quote, terms, schedule HTML (already wrapped - do not double-wrap) |
| `worker/pricing.ts` | Pricing/timing/contacts from settings + fallbacks |
| `worker/scheduling.ts` | Duration suggestions from timing settings |
| `worker/auth/*` | PBKDF2 + sessions + cookies |
| `worker/db/*` | Drizzle |

## Lead lifecycle

1. Form → `POST /api/lead` → D1 + owner notification (not in chat)  
2. Admin chat: orçamento → termos → aceitar (client row, same conversation)  
3. Skin Call: marcar sessões → Meet + link `/diagnostico?token=`  
4. Diagnostic complete → owner notification  

## Security notes

- Admin session: HttpOnly cookie, SameSite=Lax  
- State-changing `/api/admin/*` requires matching `csrf_token` cookie + `X-CSRF-Token` header  
- Honeypot + D1 rate limit on public lead endpoint  
- Diagnostic page: invalid tokens fail closed outside local/dev  
