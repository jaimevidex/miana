-- Fix: recreate leads table without old NOT NULL columns (plano, rotina, etc.)

CREATE TABLE `leads_new` (
  `id` text PRIMARY KEY NOT NULL,
  `token` text NOT NULL DEFAULT '',
  `type` text NOT NULL DEFAULT 'skin-call',
  `nome` text NOT NULL,
  `telefone` text NOT NULL,
  `email` text NOT NULL,
  `status` text DEFAULT 'novo' NOT NULL,
  `form_data` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

INSERT INTO `leads_new` (`id`, `token`, `type`, `nome`, `telefone`, `email`, `status`, `form_data`, `created_at`, `updated_at`)
SELECT `id`,
  COALESCE(`token`, ''),
  COALESCE(`type`, 'skin-call'),
  `nome`, `telefone`, `email`,
  COALESCE(`status`, 'novo'),
  `form_data`,
  `created_at`, `updated_at`
FROM `leads`;

DROP TABLE `leads`;
ALTER TABLE `leads_new` RENAME TO `leads`;

CREATE UNIQUE INDEX `leads_token_unique` ON `leads` (`token`);
