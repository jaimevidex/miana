#!/usr/bin/env bash
# Apaga leads, clients e dados relacionados (emails, diagnóstico).
# Não toca em users, sessions, settings nem rate_limits.
#
# Uso:
#   ./scripts/clean-leads-clients.sh           # D1 local
#   ./scripts/clean-leads-clients.sh --remote  # produção (pede confirmação extra)

set -euo pipefail

DB_NAME="miana-db"
TARGET="--local"
LABEL="LOCAL"

if [[ "${1:-}" == "--remote" ]]; then
  TARGET="--remote"
  LABEL="PRODUCTION"
elif [[ -n "${1:-}" ]]; then
  echo "Uso: $0 [--remote]" >&2
  exit 1
fi

TABLES=(
  email_attachments
  email_messages
  conversations
  quote_emails
  diagnostics
  clients
  leads
)

d1() {
  npx wrangler d1 execute "$DB_NAME" "$TARGET" --command "$1"
}

count_table() {
  local table="$1"
  npx wrangler d1 execute "$DB_NAME" "$TARGET" --json --command "SELECT COUNT(*) AS n FROM ${table};" 2>/dev/null \
    | python3 -c "
import json, sys
raw = sys.stdin.read()
idx = raw.find('[')
if idx < 0:
    print('?')
    raise SystemExit(0)
data = json.loads(raw[idx:])
print(data[0]['results'][0]['n'])
"
}

echo "== Contagens atuais (${LABEL}) =="
for table in "${TABLES[@]}"; do
  echo "  ${table}: $(count_table "$table")"
done
echo

if [[ "$TARGET" == "--remote" ]]; then
  read -r -p "Isto apaga dados de PRODUÇÃO. Escreve CLEAN PRODUCTION para continuar: " confirm
  if [[ "$confirm" != "CLEAN PRODUCTION" ]]; then
    echo "Cancelado."
    exit 1
  fi
else
  read -r -p "Apagar leads/clients e dados relacionados em LOCAL? [y/N] " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Cancelado."
    exit 1
  fi
fi

echo
echo "== A apagar (${LABEL}) =="
for table in "${TABLES[@]}"; do
  echo "DELETE FROM ${table};"
  d1 "DELETE FROM ${table};"
done

echo
echo "== Contagens finais (${LABEL}) =="
for table in "${TABLES[@]}"; do
  echo "  ${table}: $(count_table "$table")"
done

echo
echo "Feito. users / sessions / settings / rate_limits mantidos."
echo "Fotos e anexos no R2 (template_attachments/ e leads/) não são apagados por este script."
