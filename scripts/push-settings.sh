#!/usr/bin/env bash
# Envia settings de templates da D1 local para produção.
# Um deploy normal não leva copy de emails - vive na tabela settings.
#
# Por defeito só keys email_* (copy, custom templates, anexos).
#   ./scripts/push-settings.sh
# Todas as settings excepto Google Calendar:
#   ./scripts/push-settings.sh --all
#
# Recomendado: just db-pull-settings → editar em local → este script.

set -euo pipefail

DB_NAME="miana-db"
MODE="templates"
if [[ "${1:-}" == "--all" ]]; then
  MODE="all"
elif [[ -n "${1:-}" ]]; then
  echo "Uso: $0 [--all]" >&2
  exit 1
fi

JSON_FILE="$(mktemp /tmp/miana-settings.XXXXXX.json)"
SQL_FILE="$(mktemp /tmp/miana-settings.XXXXXX.sql)"
BATCH_DIR="$(mktemp -d /tmp/miana-settings-batches.XXXXXX)"
cleanup() { rm -rf "$JSON_FILE" "$SQL_FILE" "$BATCH_DIR"; }
trap cleanup EXIT

d1_json() {
  local target="$1"
  local sql="$2"
  npx wrangler d1 execute "$DB_NAME" "$target" --json --command "$sql" 2>/dev/null
}

echo "== A ler settings locais =="
d1_json --local "SELECT key, value, updated_at FROM settings;" > "$JSON_FILE"

python3 - "$JSON_FILE" "$SQL_FILE" "$BATCH_DIR" "$MODE" <<'PY'
import json, pathlib, sys

json_path, sql_path, batch_dir, mode = sys.argv[1], sys.argv[2], pathlib.Path(sys.argv[3]), sys.argv[4]
raw = open(json_path, encoding="utf-8").read()
idx = raw.find("[")
if idx < 0:
    sys.stderr.write("Não foi possível ler o JSON da D1 local.\n")
    sys.exit(1)

rows = json.loads(raw[idx:])[0]["results"]

def is_google(key):
    return key.startswith("google_calendar_")

def is_template(key):
    return key.startswith("email_")

if mode == "templates":
    rows = [r for r in rows if is_template(r["key"])]
else:
    rows = [r for r in rows if not is_google(r["key"])]

if not rows:
    sys.stderr.write("Não há settings locais para enviar neste modo.\n")
    sys.exit(1)

def sql_str(value):
    return "'" + str(value).replace("'", "''") + "'"

keys = [r["key"] for r in rows]
in_list = ", ".join(sql_str(k) for k in keys)

stmts = []
for row in rows:
    stmts.append(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ("
        f"{sql_str(row['key'])}, {sql_str(row['value'])}, {int(row['updated_at'])});"
    )

if mode == "templates":
    stmts.append(
        f"DELETE FROM settings WHERE key LIKE 'email_%' AND key NOT IN ({in_list});"
    )
else:
    stmts.append(
        "DELETE FROM settings WHERE key NOT LIKE 'google_calendar_%' "
        f"AND key NOT IN ({in_list});"
    )

open(sql_path, "w", encoding="utf-8").write("\n".join(stmts) + "\n")

max_bytes = 40_000
batches, current, size = [], [], 0
for stmt in stmts:
    extra = len(stmt) + (1 if current else 0)
    if current and size + extra > max_bytes:
        batches.append("\n".join(current))
        current, size = [stmt], len(stmt)
    else:
        current.append(stmt)
        size += extra
if current:
    batches.append("\n".join(current))

for i, batch in enumerate(batches, 1):
    (batch_dir / f"{i:03d}.sql").write_text(batch, encoding="utf-8")

label = "templates (email_*)" if mode == "templates" else "settings (exceto Google Calendar)"
print(f"  {len(rows)} keys ({label})")
for row in sorted(rows, key=lambda r: r["key"]):
    print(f"  - {row['key']}")
print(f"  {len(stmts)} statements em {len(batches)} lotes")
PY

echo
if [[ "$MODE" == "templates" ]]; then
  echo "Isto substitui a copy de emails / templates custom / anexos em PRODUÇÃO."
  echo "Preços, contactos e Google Calendar ficam intocados."
else
  echo "Isto substitui preços, contactos e emails em PRODUÇÃO."
  echo "Google Calendar (token/email) fica intocado."
fi
echo "Anexos no R2 local não sobem - só as referências nas settings."
read -r -p "Escreve PUSH PRODUCTION para continuar: " confirm
if [[ "$confirm" != "PUSH PRODUCTION" ]]; then
  echo "Cancelado."
  exit 1
fi

echo
echo "== A aplicar em produção =="
# --file usa /import; o OAuth do wrangler login falha aí com code 10000.
# --command usa /query, que o token já tem.
shopt -s nullglob
batches=("$BATCH_DIR"/*.sql)
if [[ ${#batches[@]} -eq 0 ]]; then
  echo "Não há SQL para enviar." >&2
  exit 1
fi

i=0
for batch in "${batches[@]}"; do
  i=$((i + 1))
  echo "  lote $i/${#batches[@]}"
  npx wrangler d1 execute "$DB_NAME" --remote --yes --command "$(cat "$batch")"
done

echo
echo "Feito. Confirma um template em https://marianapita.pt/admin/settings"
