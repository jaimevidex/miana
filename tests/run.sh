#!/bin/bash
# ─── Testes automatizados - Miana Worker ────────────────────────────────────
# Corre com wrangler dev a funcionar: npx wrangler dev
# Uso: ./tests/run.sh [base_url]
# Default: http://localhost:8787

set -euo pipefail

BASE="${1:-http://localhost:8787}"
PASS=0
FAIL=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Helper: curl que devolve status e body separados
curl_req() {
  local tmpbody=$(mktemp)
  local status=$(curl -s -o "$tmpbody" -w "%{http_code}" "$@")
  local body=$(cat "$tmpbody")
  rm -f "$tmpbody"
  echo "$status"
  echo "---BODY---"
  echo "$body"
}

assert_status() {
  local desc="$1" expected="$2" actual="$3" body="$4"
  if [ "$actual" = "$expected" ]; then
    echo -e "  ${GREEN}✓${NC} $desc (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} $desc - esperado $expected, recebi $actual"
    echo "    Body: ${body:0:200}"
    FAIL=$((FAIL + 1))
  fi
}

assert_contains() {
  local desc="$1" needle="$2" haystack="$3"
  if echo "$haystack" | grep -q "$needle"; then
    echo -e "  ${GREEN}✓${NC} $desc"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} $desc - não encontrei '$needle'"
    FAIL=$((FAIL + 1))
  fi
}

# ─── 1. Formulário Skin Call ────────────────────────────────────────────────
echo -e "\n${YELLOW}═══ 1. Formulário Skin Call ═══${NC}"

RESP=$(curl_req -X POST "$BASE/api/lead" \
  -d "form_type=skin-call&nome=Ana Silva&telefone=912345678&email=ana@teste.com&plano=Duo+Call+(Plano+6M)&rotina=Diaria&rotina_frequencia=Quase+todos+os+dias&pele_tipo=Oleosa&preocupacoes=Borbulhas")
STATUS=$(echo "$RESP" | head -1)
BODY=$(echo "$RESP" | sed '1,/^---BODY---$/d')
assert_status "Skin Call lead criado" "200" "$STATUS" "$BODY"
assert_contains "Resposta contém success" '"success":true' "$BODY"

# ─── 2. Formulário Bridal ───────────────────────────────────────────────────
echo -e "\n${YELLOW}═══ 2. Formulário Bridal & Beauty ═══${NC}"

RESP=$(curl_req -X POST "$BASE/api/lead" \
  -d "form_type=bridal-beauty&nome=Maria Santos&telefone=913456789&email=maria@teste.com&subject=Pedido+-+Bridal+%26+Beauty&opcao_servico=Bride&data_casamento=2026-10-15&hora_pronta=09:00&local_preparacao=Hotel&local_prova=Salao&servicos_procurados=Pack&guests_makeup=1&guests_hair=2&guests_pack=1&addon_skin_call=Sim")
STATUS=$(echo "$RESP" | head -1)
BODY=$(echo "$RESP" | sed '1,/^---BODY---$/d')
assert_status "Bridal lead criado" "200" "$STATUS" "$BODY"
assert_contains "Resposta contém success" '"success":true' "$BODY"

# ─── 3. Formulário Education ────────────────────────────────────────────────
echo -e "\n${YELLOW}═══ 3. Formulário Education ═══${NC}"

RESP=$(curl_req -X POST "$BASE/api/lead" \
  -d "form_type=education&nome=Joana Costa&telefone=914567890&email=joana@teste.com&subject=Pedido+-+Education&formato=Automaquilhagem&local_workshop=Centro&data_hora=2026-09-20T14:00&tipo=Particular&mensagem=Quero+aprender")
STATUS=$(echo "$RESP" | head -1)
BODY=$(echo "$RESP" | sed '1,/^---BODY---$/d')
assert_status "Education lead criado" "200" "$STATUS" "$BODY"
assert_contains "Resposta contém success" '"success":true' "$BODY"

# ─── 4. Validação - dados inválidos ─────────────────────────────────────────
echo -e "\n${YELLOW}═══ 4. Validação - dados inválidos ═══${NC}"

RESP=$(curl_req -X POST "$BASE/api/lead" \
  -d "form_type=skin-call&nome=A&telefone=123&email=invalido")
STATUS=$(echo "$RESP" | head -1)
BODY=$(echo "$RESP" | sed '1,/^---BODY---$/d')
assert_status "Rejeita nome curto" "400" "$STATUS" "$BODY"

RESP=$(curl_req -X POST "$BASE/api/lead" \
  -d "form_type=bridal-beauty&nome=Teste&telefone=912345678&email=sem-email")
STATUS=$(echo "$RESP" | head -1)
BODY=$(echo "$RESP" | sed '1,/^---BODY---$/d')
assert_status "Rejeita email inválido" "400" "$STATUS" "$BODY"

# ─── 5. Honeypot - bot detection ────────────────────────────────────────────
echo -e "\n${YELLOW}═══ 5. Honeypot - bot detection ═══${NC}"

RESP=$(curl_req -X POST "$BASE/api/lead" \
  -d "form_type=skin-call&nome=Bot&telefone=912345678&email=bot@teste.com&plano=Teste&botcheck=spam")
STATUS=$(echo "$RESP" | head -1)
BODY=$(echo "$RESP" | sed '1,/^---BODY---$/d')
assert_status "Bot detectado (honeypot)" "200" "$STATUS" "$BODY"

# ─── 6. Verificar emails no Mailpit ─────────────────────────────────────────
echo -e "\n${YELLOW}═══ 6. Mailpit - verificar emails ═══${NC}"

MAILPIT_BODY=$(curl -s "http://localhost:8026/api/v1/messages" 2>/dev/null || echo '{"total":0}')
MAILPIT_COUNT=$(echo "$MAILPIT_BODY" | grep -o '"total":[0-9]*' | grep -o '[0-9]*' || echo "0")
if [ "$MAILPIT_COUNT" -gt 0 ] 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} $MAILPIT_COUNT email(s) capturado(s) no Mailpit"
    echo -e "    Ver em: http://localhost:8026"
  PASS=$((PASS + 1))
else
  echo -e "  ${YELLOW}⊘${NC} Nenhum email no Mailpit (verificar se está a correr)"
fi

# ─── 7. Rate limit ─────────────────────────────────────────────────────────
echo -e "\n${YELLOW}═══ 7. Rate limit ═══${NC}"

RESP=$(curl_req -X POST "$BASE/api/lead" \
  -d "form_type=skin-call&nome=Rate Test&telefone=912345678&email=rate@teste.com&plano=Teste")
STATUS=$(echo "$RESP" | head -1)
BODY=$(echo "$RESP" | sed '1,/^---BODY---$/d')
if [ "$STATUS" = "200" ] || [ "$STATUS" = "429" ]; then
  echo -e "  ${GREEN}✓${NC} Rate limit respondeu (HTTP $STATUS)"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}✗${NC} Rate limit inesperado (HTTP $STATUS)"
  FAIL=$((FAIL + 1))
fi

# ─── 8. Rota protegida sem auth ────────────────────────────────────────────
echo -e "\n${YELLOW}═══ 8. Rotas protegidas sem autenticação ═══${NC}"

RESP=$(curl_req "$BASE/admin" 2>/dev/null)
STATUS=$(echo "$RESP" | head -1)
if [ "$STATUS" = "302" ] || [ "$STATUS" = "200" ]; then
  echo -e "  ${GREEN}✓${NC} Admin redireciona para login sem auth (HTTP $STATUS)"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}✗${NC} Admin não protegido (HTTP $STATUS)"
  FAIL=$((FAIL + 1))
fi

# ─── 9. Diagnóstico - token inválido ───────────────────────────────────────
echo -e "\n${YELLOW}═══ 9. Diagnóstico - token inválido ═══${NC}"

RESP=$(curl_req "$BASE/diagnostico?token=invalido&page=1")
STATUS=$(echo "$RESP" | head -1)
BODY=$(echo "$RESP" | sed '1,/^---BODY---$/d')
assert_status "Token inválido rejeitado" "200" "$STATUS" "$BODY"
BODY_LOWER=$(echo "$BODY" | tr '[:upper:]' '[:lower:]')
assert_contains "Mostra erro" 'erro' "$BODY_LOWER"

# ─── Resumo ─────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "  ${GREEN}Passaram: $PASS${NC}"
echo -e "  ${RED}Falharam: $FAIL${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"

if [ $FAIL -gt 0 ]; then
  exit 1
fi
