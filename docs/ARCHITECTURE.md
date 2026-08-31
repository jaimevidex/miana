# Architecture

## Runtime

```
Browser (Astro pages)
  → POST /api/lead | GET /diagnostico | /admin/*
  → Cloudflare Worker (worker/index.ts)
       ├── Public: leads, diagnostic funnel
       ├── Admin SSR (worker/admin/*) + Admin API
       ├── D1 (Drizzle schema in worker/db/schema.ts)
       ├── R2 DIAG_PHOTOS (diagnostics/)
       └── Email (Resend / Mailpit)
  → Fallback: env.ASSETS → Astro dist/
```

## Bindings (`wrangler.toml`)

| Binding | Type | Purpose |
|---------|------|---------|
| `ASSETS` | Static assets | Astro `dist/` |
| `DB` | D1 | App database |
| `DIAG_PHOTOS` | R2 | Diagnostic photos |

Env vars: `EMAIL_ENABLED`, `OWNER_EMAIL`, `SITE_URL`, `FROM_EMAIL`, `FROM_NAME`, `ADMIN_URL` (optional). Secrets: `RESEND_API_KEY`.

## Domain model

- **Lead** - form submission (`skin-call` | `bridal` | `beauty` | `education`). Status: `novo` | `pendente` | `aceite` | `eliminado`. Type-specific fields in `form_data` JSON.
- **Client** - created when a quote is accepted (or manually). Optional `lead_id` (nullable for manual clients).
- **Diagnostic** - Skin Call questionnaire; photos in R2; linked to lead and/or client.
- **Settings** - key/value prices, timing, contacts (admin UI).
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
| `worker/templates/*` | Quote HTML (already wrapped - do not double-wrap) |
| `worker/pricing.ts` | Pricing/timing/contacts from settings + fallbacks |
| `worker/scheduling.ts` | Duration suggestions from timing settings |
| `worker/auth/*` | PBKDF2 + sessions + cookies |
| `worker/db/*` | Drizzle |

## Lead lifecycle

1. Form → `POST /api/lead` → D1 + owner notification  
2. Admin sends quote → status `pendente` + `quote_emails` row  
3. Accept → client row + status `aceite`  
4. Skin Call: diagnostic invite from client → `/diagnostico?token=` → R2 photos + notify  

## Security notes

- Admin session: HttpOnly cookie, SameSite=Lax  
- State-changing `/api/admin/*` requires matching `csrf_token` cookie + `X-CSRF-Token` header  
- Honeypot + D1 rate limit on public lead endpoint  
- Diagnostic page: invalid tokens fail closed outside local/dev  
