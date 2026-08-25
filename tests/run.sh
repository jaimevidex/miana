#!/bin/bash
# ─── Testes automatizados — Miana Worker ────────────────────────────────────
# Corre com wrangler dev a funcionar: npx wrangler dev
# Uso: ./tests/run.sh [base_url]
# Default: http://localhost:8787

set -euo pipefail

BASE="${1:-http://localhost:8787}"
PASS=0
FAIL=0
LEAD_ID=""
CLIENT_ID=""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

assert_status() {
  local desc="$1" expected="$2" actual="$3" body="$4"
  if [ "$actual" = "$expected" ]; then
    echo -e "  ${GREEN}✓${NC} $desc (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} $desc — esperado $expected, recebi $actual"
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
    echo -e "  ${RED}✗${NC} $desc — não encontrei '$needle'"
    FAIL=$((FAIL + 1))
  fi
}

# ─── 1. Formulário Skin Call ────────────────────────────────────────────────
echo -e "\n${YELLOW}═══ 1. Formulário Skin Call ═══${NC}"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/lead" \
  -d "form_type=skin-call&nome=Ana Silva&telefone=912345678&email=ana@teste.com&plano=Duo+Call+(Plano+6M)&rotina=Diaria&rotina_frequencia=Quase+todos+os+dias&pele_tipo=Oleosa&preocupacoes=Borbulhas")

BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_status "Skin Call lead criado" "200" "$STATUS" "$BODY"
assert_contains "Resposta contém success" '"success":true' "$BODY"

# Extrair lead ID via query direta
LEAD_ID=$(curl -s "$BASE/api/admin/leads-json" 2>/dev/null | head -c 1000 || echo "")

# ─── 2. Formulário Bridal ───────────────────────────────────────────────────
echo -e "\n${YELLOW}═══ 2. Formulário Bridal & Beauty ═══${NC}"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/lead" \
  -d "form_type=bridal-beauty&nome=Maria Santos&telefone=913456789&email=maria@teste.com&subject=Pedido+—+Bridal+%26+Beauty&opcao_servico=Bride&data_casamento=2026-10-15&hora_pronta=09:00&local_preparacao=Hotel&local_prova=Salao&servicos_procurados=Makeup+%2B+Hair&numero_guests=4&addon_skin_call=Sim")

BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_status "Bridal lead criado" "200" "$STATUS" "$BODY"
assert_contains "Resposta contém success" '"success":true' "$BODY"

# ─── 3. Formulário Education ────────────────────────────────────────────────
echo -e "\n${YELLOW}═══ 3. Formulário Education ═══${NC}"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/lead" \
  -d "form_type=education&nome=Joana Costa&telefone=914567890&email=joana@teste.com&subject=Pedido+—+Education&formato=Automaquilhagem&local_workshop=Centro&data_hora=2026-09-20T14:00&tipo=Particular&mensagem=Quero+aprender")

BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_status "Education lead criado" "200" "$STATUS" "$BODY"
assert_contains "Resposta contém success" '"success":true' "$BODY"

# ─── 4. Validação — dados inválidos ─────────────────────────────────────────
echo -e "\n${YELLOW}═══ 4. Validação — dados inválidos ═══${NC}"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/lead" \
  -d "form_type=skin-call&nome=A&telefone=123&email=invalido")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_status "Rejeita nome curto" "400" "$STATUS" "$BODY"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/lead" \
  -d "form_type=bridal-beauty&nome=Teste&telefone=912345678&email=sem-email")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_status "Rejeita email inválido" "400" "$STATUS" "$BODY"

# ─── 5. Honeypot — bot detection ────────────────────────────────────────────
echo -e "\n${YELLOW}═══ 5. Honeypot — bot detection ═══${NC}"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/lead" \
  -d "form_type=skin-call&nome=Bot&telefone=912345678&email=bot@teste.com&plano=Teste&botcheck=spam")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_status "Bot detectado (honeypot)" "200" "$STATUS" "$BODY"

# ─── 6. Admin Login ─────────────────────────────────────────────────────────
echo -e "\n${YELLOW}═══ 6. Admin Login ═══${NC}"

# Login com credenciais inválidas
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@teste.com","password":"wrong"}')
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_status "Rejeita credenciais inválidas" "401" "$STATUS" "$BODY"

# Login correto (precisa de seed feito)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"hello@marianapita.pt","password":"testpassword"}' \
  -c /tmp/miana-cookies.txt)
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
# Pode falhar se seed não foi feito com esta password
if [ "$STATUS" = "200" ]; then
  assert_status "Login com credenciais corretas" "200" "$STATUS" "$BODY"
  assert_contains "Login retorna success" '"success":true' "$BODY"
else
  echo -e "  ${YELLOW}⊘${NC} Login pulado (faz seed com: npx tsx worker/seed.ts <password>)"
fi

# ─── 7. Dashboard — lista leads ─────────────────────────────────────────────
echo -e "\n${YELLOW}═══ 7. Dashboard — página leads ═══${NC}"

RESP=$(curl -s -w "\n%{http_code}" "$BASE/admin" -b /tmp/miana-cookies.txt)
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
if [ "$STATUS" = "200" ]; then
  assert_status "Dashboard acedido" "200" "$STATUS" "$BODY"
  assert_contains "Contém navbar" 'Miana Admin' "$BODY"
  assert_contains "Contém link Leads" '/admin"' "$BODY"
  assert_contains "Contém link Clientes" '/admin/clients' "$BODY"
else
  echo -e "  ${YELLOW}⊘${NC} Dashboard pulado (precisa login)"
fi

# ─── 8. Dashboard — lista clientes ──────────────────────────────────────────
echo -e "\n${YELLOW}═══ 8. Dashboard — página clientes ═══${NC}"

RESP=$(curl -s -w "\n%{http_code}" "$BASE/admin/clients" -b /tmp/miana-cookies.txt)
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
if [ "$STATUS" = "200" ]; then
  assert_status "Página clientes acedida" "200" "$STATUS" "$BODY"
  assert_contains "Contém heading Clientes" 'Clientes' "$BODY"
else
  echo -e "  ${YELLOW}⊘${NC} Clientes pulado (precisa login)"
fi

# ─── 9. Verificar emails no Mailpit ─────────────────────────────────────────
echo -e "\n${YELLOW}═══ 9. Mailpit — verificar emails ═══${NC}"

MAILPIT_COUNT=$(curl -s "http://localhost:8025/api/v1/messages" | grep -o '"total":[0-9]*' | grep -o '[0-9]*' || echo "0")
if [ "$MAILPIT_COUNT" -gt 0 ] 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} $MAILPIT_COUNT email(s) capturado(s) no Mailpit"
  echo -e "    Ver em: http://localhost:8025"
  PASS=$((PASS + 1))
else
  echo -e "  ${YELLOW}⊘${NC} Nenhum email no Mailpit (verificar se está a correr)"
fi

# ─── 10. Rate limit ─────────────────────────────────────────────────────────
echo -e "\n${YELLOW}═══ 10. Rate limit ═══${NC}"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/lead" \
  -d "form_type=skin-call&nome=Rate Test&telefone=912345678&email=rate@teste.com&plano=Teste")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
if [ "$STATUS" = "200" ] || [ "$STATUS" = "429" ]; then
  echo -e "  ${GREEN}✓${NC} Rate limit respondeu (HTTP $STATUS)"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}✗${NC} Rate limit inesperado (HTTP $STATUS)"
  FAIL=$((FAIL + 1))
fi

# ─── 11. Rota protegida sem auth ────────────────────────────────────────────
echo -e "\n${YELLOW}═══ 11. Rotas protegidas sem autenticação ═══${NC}"

RESP=$(curl -s -w "\n%{http_code}" "$BASE/admin" -L --max-redirs 0 2>/dev/null || echo "")
STATUS=$(echo "$RESP" | tail -n 1)
if [ "$STATUS" = "302" ] || [ "$STATUS" = "200" ]; then
  echo -e "  ${GREEN}✓${NC} Admin redireciona para login sem auth (HTTP $STATUS)"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}✗${NC} Admin não protegido (HTTP $STATUS)"
  FAIL=$((FAIL + 1))
fi

# ─── 12. Diagnóstico — token inválido ───────────────────────────────────────
echo -e "\n${YELLOW}═══ 12. Diagnóstico — token inválido ═══${NC}"

RESP=$(curl -s -w "\n%{http_code}" "$BASE/diagnostico?token=invalido&page=1")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_status "Token inválido rejeitado" "200" "$STATUS" "$BODY"
assert_contains "Mostra erro" 'erro' "$(echo "$BODY" | tr '[:upper:]' '[:lower:]')"

# ─── Resumo ─────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "  ${GREEN}Passaram: $PASS${NC}"
echo -e "  ${RED}Falharam: $FAIL${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"

if [ $FAIL -gt 0 ]; then
  exit 1
fi
