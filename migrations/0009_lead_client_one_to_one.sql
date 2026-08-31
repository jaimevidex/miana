-- 1:1 lead ↔ cliente (lead_id único; NULL continua permitido para clientes manuais)
-- Alinha leads que já têm cliente para status aceite (exceto eliminado)

DELETE FROM clients
WHERE lead_id IS NOT NULL
  AND rowid NOT IN (
    SELECT MIN(rowid) FROM clients WHERE lead_id IS NOT NULL GROUP BY lead_id
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_lead_id ON clients(lead_id);

UPDATE leads
SET status = 'aceite', updated_at = CAST(strftime('%s','now') AS integer) * 1000
WHERE id IN (SELECT lead_id FROM clients WHERE lead_id IS NOT NULL)
  AND status NOT IN ('aceite', 'eliminado');
