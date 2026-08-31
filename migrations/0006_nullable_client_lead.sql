-- Migration 0006: Allow manual clients without a lead (nullable lead_id).

PRAGMA foreign_keys=OFF;

CREATE TABLE clients_new (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id),
  type TEXT NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT NOT NULL,
  data TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT INTO clients_new (id, lead_id, type, nome, telefone, email, data, created_at, updated_at)
SELECT id,
  CASE WHEN lead_id IS NULL OR lead_id = '' THEN NULL ELSE lead_id END,
  type, nome, telefone, email, data, created_at, updated_at
FROM clients;

DROP TABLE clients;
ALTER TABLE clients_new RENAME TO clients;

PRAGMA foreign_keys=ON;
