#!/usr/bin/env bash
# Copia todas as rows de settings de produção para a D1 local.
# Substitui a tabela local por completo (keys que só existem em local desaparecem).
# Não toca em leads, clients, users nem sessions.
#
# Uso: ./scripts/pull-settings.sh

set -euo pipefail

DB_NAME="miana-db"
JSON_FILE="$(mktemp /tmp/miana-settings.XXXXXX.json)"
SQL_FILE="$(mktemp /tmp/miana-settings.XXXXXX.sql)"
cleanup() { rm -f "$JSON_FILE" "$SQL_FILE"; }
trap cleanup EXIT

d1_json() {
  local target="$1"
  local sql="$2"
  npx wrangler d1 execute "$DB_NAME" "$target" --json --command "$sql" 2>/dev/null
}

echo "== A ler settings de produção =="
d1_json --remote "SELECT key, value, updated_at FROM settings;" > "$JSON_FILE"

python3 - "$JSON_FILE" "$SQL_FILE" <<'PY'
import json, sys

json_path, sql_path = sys.argv[1], sys.argv[2]
raw = open(json_path, encoding="utf-8").read()
idx = raw.find("[")
if idx < 0:
    sys.stderr.write("Não foi possível ler o JSON da D1 remota.\n")
    sys.exit(1)

payload = json.loads(raw[idx:])
rows = payload[0]["results"]
if not rows:
    sys.stderr.write("Produção não tem settings.\n")
    sys.exit(1)

def sql_str(value):
    return "'" + str(value).replace("'", "''") + "'"

lines = [
    "-- Gerado por scripts/pull-settings.sh",
    "DELETE FROM settings;",
]
for row in rows:
    key = sql_str(row["key"])
    value = sql_str(row["value"])
    updated_at = int(row["updated_at"])
    lines.append(
        f"INSERT INTO settings (key, value, updated_at) VALUES ({key}, {value}, {updated_at});"
    )

open(sql_path, "w", encoding="utf-8").write("\n".join(lines) + "\n")

print(f"  {len(rows)} keys")
for row in sorted(rows, key=lambda r: r["key"]):
    print(f"  - {row['key']}")
PY

echo
echo "Isto inclui copy de emails, preços e o refresh token do Google Calendar, se existir."
read -r -p "Substituir TODAS as settings LOCAIS pelas de produção? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Cancelado."
  exit 1
fi

echo
echo "== A aplicar na D1 local =="
npx wrangler d1 execute "$DB_NAME" --local --file="$SQL_FILE"

echo
echo "== Contagem local =="
d1_json --local "SELECT COUNT(*) AS n FROM settings;" | python3 -c "
import json, sys
raw = sys.stdin.read()
idx = raw.find('[')
data = json.loads(raw[idx:])
print('  settings:', data[0]['results'][0]['n'])
"

echo
echo "Feito. Anexos de email no R2 de produção não são copiados - só as referências nas settings."
