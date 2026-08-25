// Schema Drizzle ORM para D1 — users, leads, clients, diagnostics, sessions, rate_limits.

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ─── Users (admin dashboard) ────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
});

// ─── Leads (todos os formulários) ───────────────────────────────────────────
export const leads = sqliteTable('leads', {
  id: text('id').primaryKey(),
  token: text('token'),
  type: text('type').notNull(), // skin-call | bridal-beauty | education
  nome: text('nome').notNull(),
  telefone: text('telefone').notNull(),
  email: text('email').notNull(),
  status: text('status').default('novo').notNull(),
  formData: text('form_data'), // JSON blob com dados específicos do formulário
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
});

// ─── Clients (criados ao aceitar orçamento) ─────────────────────────────────
export const clients = sqliteTable('clients', {
  id: text('id').primaryKey(),
  leadId: text('lead_id').notNull().references(() => leads.id),
  type: text('type').notNull(), // skin-call | bridal-beauty | education
  nome: text('nome').notNull(),
  telefone: text('telefone').notNull(),
  email: text('email').notNull(),
  data: text('data'), // JSON com dados do cliente (copiados da lead + extras)
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
});

// ─── Diagnostics (Skin Call — avaliação de pele) ────────────────────────────
export const diagnostics = sqliteTable('diagnostics', {
  id: text('id').primaryKey(),
  leadId: text('lead_id'),
  clientId: text('client_id').references(() => clients.id),
  // Página 1 — Identificação
  idade: text('idade'),
  // Página 1 — Histórico
  situacao: text('situacao'),
  doencaCronica: text('doenca_cronica'),
  alergiasAlimentares: text('alergias_alimentares'),
  alergiasCosmeticos: text('alergias_cosmeticos'),
  medicacaoContinua: text('medicacao_continua'),
  // Página 1 — Histórico Dermatológico
  diagnosticoMedico: text('diagnostico_medico'),
  diagnosticoOutro: text('diagnostico_outro'),
  medicacaoOral: text('medicacao_oral'),
  medicacaoTopica: text('medicacao_topica'),
  tratamentosEsteticos: text('tratamentos_esteticos'),
  burnoutCutaneo: text('burnout_cutaneo'),
  vasosVisiveis: text('vasos_visiveis'),
  rubor: text('rubor'),
  reacaoEstacoes: text('reacao_estacoes'),
  // Página 2 — Estilo & Hábitos
  stressNivel: text('stress_nivel'),
  sonoTipo: text('sono_tipo'),
  sonoLado: text('sono_lado'),
  sonoFronha: text('sono_fronha'),
  aguaIngestao: text('agua_ingestao'),
  alimentacao: text('alimentacao'),
  exposicaoSolar: text('exposicao_solar'),
  ambienteFatores: text('ambiente_fatores'),
  // Página 2 — A Tua Pele
  peleAcordar: text('pele_acordar'),
  pele2h: text('pele_2h'),
  peleTarde: text('pele_tarde'),
  peleTextura: text('pele_textura'),
  peleCor: text('pele_cor'),
  peleToque: text('pele_toque'),
  peleAmbiente: text('pele_ambiente'),
  peleBorbulhas: text('pele_borbulhas'),
  peleFirmeza: text('pele_firmeza'),
  peleContornoOlhos: text('pele_contorno_olhos'),
  // Página 3 — Rotina Atual
  rotinaManha: text('rotina_manha'),
  rotinaNoite: text('rotina_noite'),
  rotinaConsistencia: text('rotina_consistencia'),
  rotinaEsfoliacao: text('rotina_esfoliacao'),
  rotinaMascaras: text('rotina_mascaras'),
  rotinaDispositivos: text('rotina_dispositivos'),
  rotinaFavorito: text('rotina_favorito'),
  rotinaOdeia: text('rotina_odeia'),
  rotinaMaquilhagemFreq: text('rotina_maquilhagem_freq'),
  rotinaMaquilhagemRetirar: text('rotina_maquilhagem_retirar'),
  rotinaLavarRosto: text('rotina_lavar_rosto'),
  rotinaPinceis: text('rotina_pinceis'),
  rotinaTelemovel: text('rotina_telemovel'),
  rotinaMexerRosto: text('rotina_mexer_rosto'),
  rotinaEspremer: text('rotina_espremer'),
  rotinaDepilacao: text('rotina_depilacao'),
  // Página 3 — Preferências & Expectativas
  preferenciasTempo: text('preferencias_tempo'),
  preferenciasTexturas: text('preferencias_texturas'),
  preferenciasTexturasOutro: text('preferencias_texturas_outro'),
  preferenciasDificuldades: text('preferencias_dificuldades'),
  preferenciasDificuldadesOutro: text('preferencias_dificuldades_outro'),
  preferenciasOrcamento: text('preferencias_orcamento'),
  prioridade1: text('prioridade_1'),
  prioridade2: text('prioridade_2'),
  perguntaNaoPodeFicar: text('pergunta_nao_pode_ficar'),
  maisAlgumaCoisa: text('mais_alguma_coisa'),
  // Fotos (paths R2)
  fotoFrente: text('foto_frente'),
  fotoPerfilEsq: text('foto_perfil_esq'),
  fotoPerfilDir: text('foto_perfil_dir'),
  // Consentimento
  consent: text('consent'),
  // Controlo
  pageSaved: integer('page_saved').default(0),
  completed: integer('completed').default(0),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
});

// ─── Quote Emails (histórico de orçamentos enviados) ────────────────────────
export const quoteEmails = sqliteTable('quote_emails', {
  id: text('id').primaryKey(),
  leadId: text('lead_id').notNull().references(() => leads.id),
  html: text('html').notNull(),
  subject: text('subject'),
  sentAt: integer('sent_at').notNull(),
  sentBy: text('sent_by'),
});

// ─── Sessions (auth) ────────────────────────────────────────────────────────
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'number' }).notNull(),
});

// ─── Rate Limits (substitui KV) ─────────────────────────────────────────────
export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(0),
  windowStart: integer('window_start').notNull(),
});
