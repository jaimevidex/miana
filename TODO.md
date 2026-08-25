# Backoffice Dashboard + D1 + R2 — Plano de Migração

## Visão Geral

Migrar de KV para D1 (base de dados), ativar R2 para fotos, e criar um dashboard admin com autenticação email+password.

**Stack:**
- D1 (Cloudflare SQLite) + Drizzle ORM
- R2 (Cloudflare object storage) para fotos
- Autenticação email+password via WebCrypto (PBKDF2)
- Dashboard server-rendered pelo Worker
- 2 utilizadores max (criados via seed script)

---

## 1. Infraestrutura — `wrangler.toml`

### O que muda
- **Adicionar D1**: binding `DB`, database name `miana-db`
- **Ativar R2**: binding `DIAG_PHOTOS`, bucket name `diagnostics`
- **Manter KV**: ainda necessário para rate limiting (TTL automático)

### Configuração final
```toml
[[d1_databases]]
binding = "DB"
database_name = "miana-db"
database_id = "<ID_AFTER_CREATE>"
migrations_dir = "migrations"

[[r2_buckets]]
binding = "DIAG_PHOTOS"
bucket_name = "media"

[[kv_namespaces]]
binding = "LEADS"
id = "5dda5a40cac64dd586445d4ec701cabb"
preview_id = "5dda"
```

---

## 2. Schema D1 — Drizzle ORM

### Tabela `users`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | TEXT PK | UUID |
| email | TEXT UNIQUE | Email do utilizador |
| password_hash | TEXT | Hash PBKDF2 |
| name | TEXT | Nome |
| created_at | INTEGER | Unix timestamp |

### Tabela `leads`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | TEXT PK | UUID |
| token | TEXT UNIQUE | Token de acesso ao diagnóstico |
| nome | TEXT | Nome completo |
| telefone | TEXT | Contacto |
| email | TEXT | Email |
| plano | TEXT | Plano escolhido |
| rotina | TEXT | Rotina de pele (Stage 1) |
| rotina_frequencia | TEXT | Regularidade |
| preocupacoes | TEXT | Preocupações (JSON array) |
| pele_tipo | TEXT | Tipo de pele (JSON array) |
| status | TEXT DEFAULT 'novo' | Estado no pipeline |
| created_at | INTEGER | Unix timestamp |
| updated_at | INTEGER | Unix timestamp |

### Pipeline de estados
```
novo → orcamento_enviado → aguarda_resposta → em_analise → proposta_enviada → aceite → em_curso → concluido
                                                                                          ↘ recusado
```

### Tabela `diagnostics`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | TEXT PK | UUID |
| lead_id | TEXT FK | Referência ao lead |
| ... ~70 campos | TEXT | Todos os campos do formulário (1 por campo) |
| foto_frente | TEXT | Path R2 |
| foto_perfil_esq | TEXT | Path R2 |
| foto_perfil_dir | TEXT | Path R2 |
| page_saved | INTEGER | Última página guardada (0-3) |
| completed | INTEGER | Formulário completo (0/1) |
| created_at | INTEGER | Unix timestamp |
| updated_at | INTEGER | Unix timestamp |

### Índices
- `idx_leads_token` ON leads(token)
- `idx_leads_status` ON leads(status)
- `idx_leads_email` ON leads(email)
- `idx_diagnostics_lead` ON diagnostics(lead_id)

---

## 3. Autenticação

### Ficheiros
- `worker/auth/password.ts` — PBKDF2 via WebCrypto (hash + verify)
- `worker/auth/session.ts` — create, validate, destroy sessions (D1)
- `worker/auth/cookies.ts` — set/clear HttpOnly cookies

### Rotas
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/admin/login` | Página de login |
| POST | `/api/admin/login` | Validar credenciais |
| POST | `/api/admin/logout` | Destruir sessão |
| GET | `/admin` | Dashboard (protegido) |
| GET | `/admin/lead/:id` | Detalhe lead (protegido) |

### Seed script
- `worker/seed.ts` — Criar user admin inicial
- Executa: `npx wrangler d1 execute miana-db --file=seed.sql`

---

## 4. Dashboard — UI

### Login (`/admin/login`)
- Email + password
- Botão "Entrar"
- Mensagem de erro

### Lista de leads (`/admin`)
- Tabela: Nome, Email, Plano, Estado, Data
- Filtro por estado
- Badge colorido por estado
- Click → detalhe

### Detalhe do lead (`/admin/lead/:id`)
- Dados pessoais
- Respostas do diagnóstico (organizadas por secção)
- Fotos (3 imagens do R2)
- Botões para mudar estado
- Link para voltar à lista

---

## 5. Ficheiros a criar/modificar

### Novos
| Ficheiro | Descrição |
|----------|-----------|
| `worker/db/schema.ts` | Schema Drizzle ORM |
| `worker/db/index.ts` | Instância Drizzle |
| `worker/auth/password.ts` | Hash/verify passwords |
| `worker/auth/session.ts` | Gestão de sessões |
| `worker/auth/cookies.ts` | Gestão de cookies |
| `worker/admin.ts` | Renderização HTML do dashboard |
| `worker/seed.ts` | Seed script para user admin |
| `migrations/` | Migrations D1 |

### Modificados
| Ficheiro | O que muda |
|----------|-----------|
| `wrangler.toml` | Adicionar D1 + R2 bindings |
| `worker/lib.ts` | Adicionar `DB: D1Database` ao Env |
| `worker/index.ts` | Migrar handlers para D1 + adicionar rotas admin |
| `worker/email.ts` | Dados vêm de D1 |
| `worker/diagnostico.ts` | Dados vêm de D1 |

---

## 6. Ordem de implementação

| # | Tarefa | Dependências |
|---|--------|--------------|
| 1 | Criar D1 database + R2 bucket no dashboard Cloudflare | Nenhuma |
| 2 | Instalar Drizzle ORM + configurar schema | #1 |
| 3 | Criar `worker/db/schema.ts` | #2 |
| 4 | Gerar migrations D1 | #3 |
| 5 | Criar `worker/auth/*` (password, session, cookies) | #4 |
| 6 | Criar seed script para user admin | #4 |
| 7 | Atualizar `wrangler.toml` com D1 + R2 bindings | #1 |
| 8 | Atualizar `worker/lib.ts` (Env interface) | #7 |
| 9 | Migrar `handleLead` para D1 | #3, #8 |
| 10 | Migrar `handleDiagnosticoSave` para D1 | #3, #8 |
| 11 | Migrar `handleDiagnostico` para D1 + R2 | #3, #8 |
| 12 | Migrar `handleDiagnosticPage` para D1 | #3, #8 |
| 13 | Criar login page + auth routes | #5, #6 |
| 14 | Criar dashboard page (lista de leads) | #13 |
| 15 | Criar detalhe do lead | #14 |
| 16 | Criar endpoint para servir fotos R2 | #11 |
| 17 | Criar endpoint para mudar estado | #14 |
| 18 | Testar fluxo completo | #17 |

---

## 7. Riscos e considerações

| Risco | Mitigação |
|-------|-----------|
| KV → D1 migration | Manter KV para rate limiting (TTL nativo). D1 não tem TTL |
| Fotos R2 sem auth | Fotos servidas via Worker com validação de sessão |
| Sessões expiram | 7 dias, HttpOnly cookies |
| D1 max 100 bound params | Bulk inserts em batches de ~95 |
| User seed script | Executar uma vez após criar D1 |

---

## 8. Dependências novas

```json
{
  "dependencies": {
    "drizzle-orm": "^0.30.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.21.0"
  }
}
```

---

## 9. Comandos úteis

```bash
# Criar D1 database
npx wrangler d1 create miana-db

# Criar R2 bucket
npx wrangler r2 bucket create media

# Gerar migrations
npx drizzle-kit generate

# Aplicar migrations (local)
npx wrangler d1 migrations apply miana-db --local

# Aplicar migrations (produção)
npx wrangler d1 migrations apply miana-db --remote

# Seed script
npx wrangler d1 execute miana-db --file=seed.sql

# Deploy
npm run build && npx wrangler deploy
```
