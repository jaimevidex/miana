-- Leads with an outbound response should no longer appear as new.
-- Restricting the update to novo makes this migration idempotent and preserves final states.

UPDATE leads
SET
  status = 'pendente',
  updated_at = CAST(strftime('%s', 'now') AS integer) * 1000
WHERE status = 'novo'
  AND EXISTS (
    SELECT 1
    FROM conversations c
    JOIN email_messages m ON m.conversation_id = c.id
    WHERE c.lead_id = leads.id
      AND m.direction = 'outbound'
  );
