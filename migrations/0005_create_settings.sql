-- Migration 0005: Criar tabela settings para configuração admin.

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Preços padrão
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES
  ('price_bridal_hair', '250', strftime('%s','now') * 1000),
  ('price_bridal_makeup', '250', strftime('%s','now') * 1000),
  ('price_bridal_pack', '475', strftime('%s','now') * 1000),
  ('price_beauty_hair', '60', strftime('%s','now') * 1000),
  ('price_beauty_makeup', '60', strftime('%s','now') * 1000),
  ('price_beauty_pack', '110', strftime('%s','now') * 1000),
  ('price_skin_session1', '80', strftime('%s','now') * 1000),
  ('price_skin_session2', '150', strftime('%s','now') * 1000),
  ('price_skin_session3', '210', strftime('%s','now') * 1000),
  ('price_skin_session4', '260', strftime('%s','now') * 1000),
  ('price_education_workshop', '150', strftime('%s','now') * 1000),
  -- Tempos
  ('time_setup', '15', strftime('%s','now') * 1000),
  ('time_bridal', '60', strftime('%s','now') * 1000),
  ('time_guest', '45', strftime('%s','now') * 1000),
  -- Contactos
  ('contact_email', 'hello@marianapita.pt', strftime('%s','now') * 1000),
  ('contact_phone', '', strftime('%s','now') * 1000),
  ('contact_address', '', strftime('%s','now') * 1000);
