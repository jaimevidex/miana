-- Conversas de email (chat na dashboard) + backfill de quote_emails

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  lead_id TEXT UNIQUE REFERENCES leads(id),
  client_id TEXT UNIQUE REFERENCES clients(id),
  last_message_at INTEGER NOT NULL,
  unread_inbound_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS email_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  direction TEXT NOT NULL,
  subject TEXT,
  html TEXT,
  text TEXT,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  rfc_message_id TEXT,
  in_reply_to TEXT,
  references_header TEXT,
  resend_id TEXT,
  template_kind TEXT,
  sent_by TEXT,
  sent_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_messages_conversation ON email_messages(conversation_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_email_messages_rfc_id ON email_messages(rfc_message_id);

CREATE TABLE IF NOT EXISTS email_attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES email_messages(id),
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  r2_key TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_attachments_message ON email_attachments(message_id);

-- Uma conversa por lead que já teve orçamento enviado (id = lead_id no backfill)
INSERT INTO conversations (id, lead_id, client_id, last_message_at, unread_inbound_count, created_at, updated_at)
SELECT
  q.lead_id,
  q.lead_id,
  (SELECT c.id FROM clients c WHERE c.lead_id = q.lead_id LIMIT 1),
  MAX(q.sent_at),
  0,
  MIN(q.sent_at),
  MAX(q.sent_at)
FROM quote_emails q
GROUP BY q.lead_id;

INSERT INTO email_messages (
  id, conversation_id, direction, subject, html, text,
  from_address, to_address, rfc_message_id, in_reply_to, references_header,
  resend_id, template_kind, sent_by, sent_at
)
SELECT
  q.id,
  conv.id,
  'outbound',
  q.subject,
  q.html,
  '',
  'hello@marianapita.pt',
  COALESCE((SELECT l.email FROM leads l WHERE l.id = q.lead_id), ''),
  NULL,
  NULL,
  NULL,
  NULL,
  'quote',
  q.sent_by,
  q.sent_at
FROM quote_emails q
JOIN conversations conv ON conv.lead_id = q.lead_id;
