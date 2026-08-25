-- Migration 0001: Reorganização de leads/clients
-- 1. Nova tabela clients
-- 2. leads: adicionar type + form_data, token nullable
-- 3. diagnostics: adicionar client_id, lead_id nullable
-- 4. Nova tabela quote_emails

-- ─── Nova tabela: clients ───────────────────────────────────────────────────
CREATE TABLE `clients` (
  `id` text PRIMARY KEY NOT NULL,
  `lead_id` text NOT NULL,
  `type` text NOT NULL,
  `nome` text NOT NULL,
  `telefone` text NOT NULL,
  `email` text NOT NULL,
  `data` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);

-- ─── Nova tabela: quote_emails ──────────────────────────────────────────────
CREATE TABLE `quote_emails` (
  `id` text PRIMARY KEY NOT NULL,
  `lead_id` text NOT NULL,
  `html` text NOT NULL,
  `subject` text,
  `sent_at` integer NOT NULL,
  `sent_by` text,
  FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);

-- ─── Leads: adicionar type + form_data ──────────────────────────────────────
ALTER TABLE `leads` ADD `type` text NOT NULL DEFAULT 'skin-call';
ALTER TABLE `leads` ADD `form_data` text;

-- Backfill form_data para leads existentes (skin-call)
UPDATE `leads` SET `form_data` = json_object(
  'plano', `plano`,
  'rotina', `rotina`,
  'rotina_frequencia', `rotina_frequencia`,
  'preocupacoes', `preocupacoes`,
  'pele_tipo', `pele_tipo`
) WHERE `plano` IS NOT NULL;

-- ─── Diagnostics: adicionar client_id ───────────────────────────────────────
ALTER TABLE `diagnostics` ADD `client_id` text;

-- Tornar lead_id nullable (recriar tabela porque SQLite não suporta ALTER COLUMN)
CREATE TABLE `diagnostics_new` (
  `id` text PRIMARY KEY NOT NULL,
  `lead_id` text,
  `client_id` text,
  `idade` text,
  `situacao` text,
  `doenca_cronica` text,
  `alergias_alimentares` text,
  `alergias_cosmeticos` text,
  `medicacao_continua` text,
  `diagnostico_medico` text,
  `diagnostico_outro` text,
  `medicacao_oral` text,
  `medicacao_topica` text,
  `tratamentos_esteticos` text,
  `burnout_cutaneo` text,
  `vasos_visiveis` text,
  `rubor` text,
  `reacao_estacoes` text,
  `stress_nivel` text,
  `sono_tipo` text,
  `sono_lado` text,
  `sono_fronha` text,
  `agua_ingestao` text,
  `alimentacao` text,
  `exposicao_solar` text,
  `ambiente_fatores` text,
  `pele_acordar` text,
  `pele_2h` text,
  `pele_tarde` text,
  `pele_textura` text,
  `pele_cor` text,
  `pele_toque` text,
  `pele_ambiente` text,
  `pele_borbulhas` text,
  `pele_firmeza` text,
  `pele_contorno_olhos` text,
  `rotina_manha` text,
  `rotina_noite` text,
  `rotina_consistencia` text,
  `rotina_esfoliacao` text,
  `rotina_mascaras` text,
  `rotina_dispositivos` text,
  `rotina_favorito` text,
  `rotina_odeia` text,
  `rotina_maquilhagem_freq` text,
  `rotina_maquilhagem_retirar` text,
  `rotina_lavar_rosto` text,
  `rotina_pinceis` text,
  `rotina_telemovel` text,
  `rotina_mexer_rosto` text,
  `rotina_espremer` text,
  `rotina_depilacao` text,
  `preferencias_tempo` text,
  `preferencias_texturas` text,
  `preferencias_texturas_outro` text,
  `preferencias_dificuldades` text,
  `preferencias_dificuldades_outro` text,
  `preferencias_orcamento` text,
  `prioridade_1` text,
  `prioridade_2` text,
  `pergunta_nao_pode_ficar` text,
  `mais_alguma_coisa` text,
  `foto_frente` text,
  `foto_perfil_esq` text,
  `foto_perfil_dir` text,
  `consent` text,
  `page_saved` integer DEFAULT 0,
  `completed` integer DEFAULT 0,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `diagnostics_new` SELECT
  `id`, `lead_id`, `client_id`,
  `idade`, `situacao`, `doenca_cronica`, `alergias_alimentares`, `alergias_cosmeticos`,
  `medicacao_continua`, `diagnostico_medico`, `diagnostico_outro`, `medicacao_oral`,
  `medicacao_topica`, `tratamentos_esteticos`, `burnout_cutaneo`, `vasos_visiveis`,
  `rubor`, `reacao_estacoes`, `stress_nivel`, `sono_tipo`, `sono_lado`, `sono_fronha`,
  `agua_ingestao`, `alimentacao`, `exposicao_solar`, `ambiente_fatores`,
  `pele_acordar`, `pele_2h`, `pele_tarde`, `pele_textura`, `pele_cor`, `pele_toque`,
  `pele_ambiente`, `pele_borbulhas`, `pele_firmeza`, `pele_contorno_olhos`,
  `rotina_manha`, `rotina_noite`, `rotina_consistencia`, `rotina_esfoliacao`,
  `rotina_mascaras`, `rotina_dispositivos`, `rotina_favorito`, `rotina_odeia`,
  `rotina_maquilhagem_freq`, `rotina_maquilhagem_retirar`, `rotina_lavar_rosto`,
  `rotina_pinceis`, `rotina_telemovel`, `rotina_mexer_rosto`, `rotina_espremer`,
  `rotina_depilacao`, `preferencias_tempo`, `preferencias_texturas`,
  `preferencias_texturas_outro`, `preferencias_dificuldades`,
  `preferencias_dificuldades_outro`, `preferencias_orcamento`, `prioridade_1`,
  `prioridade_2`, `pergunta_nao_pode_ficar`, `mais_alguma_coisa`,
  `foto_frente`, `foto_perfil_esq`, `foto_perfil_dir`, `consent`,
  `page_saved`, `completed`, `created_at`, `updated_at`
FROM `diagnostics`;

DROP TABLE `diagnostics`;
ALTER TABLE `diagnostics_new` RENAME TO `diagnostics`;
