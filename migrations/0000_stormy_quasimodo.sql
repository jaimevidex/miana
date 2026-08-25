CREATE TABLE `diagnostics` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
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
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`nome` text NOT NULL,
	`telefone` text NOT NULL,
	`email` text NOT NULL,
	`plano` text NOT NULL,
	`rotina` text,
	`rotina_frequencia` text,
	`preocupacoes` text,
	`pele_tipo` text,
	`status` text DEFAULT 'novo' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leads_token_unique` ON `leads` (`token`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`window_start` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);