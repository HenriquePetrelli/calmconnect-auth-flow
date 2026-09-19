#!/usr/bin/env bash
# Fase 2/3 do plano de identidade visual (docs/visual/plano.md).
#
# Critério de aceite da Fase 3 (bloqueia o exit code), em src/**/*.tsx:
#   2. classes de paleta laranja cruas (bg-orange-500 etc.) fora de
#      scripts/sos-allowlist.txt;
#   3. classes *-sos (bg-sos-primary, text-sos-secondary, etc.) fora da mesma
#      allowlist — o laranja é exclusivo do SOS (regra 5 da seção 3 do plano);
#      só os arquivos do próprio fluxo de SOS podem usá-lo.
# Âmbar (amber-*) NÃO entra nessa checagem — é a família de cor do --warning,
# deliberadamente diferente do laranja de SOS (ver Fase 3 do plano).
#
# Informativo, NÃO bloqueia o exit code:
#   1. hex, rgb()/rgba() ou hsl() literais (cor deveria vir de um token
#      semântico). A Fase 3 migrou só o que envolvia laranja/marca; o resto
#      (paletas de humor, respiração, sons, gráficos — nenhuma delas laranja)
#      é débito técnico pré-existente, fora do escopo desta fase (regra do
#      laranja), fica para uma limpeza futura.
#
# Pronto para entrar em CI quando o CI existir (roadmap, sessão 25) — nesse
# caso, rodar com --strict para also bloquear a seção 1.

set -uo pipefail
cd "$(dirname "$0")/.."

ALLOWLIST="scripts/sos-allowlist.txt"
STRICT=0
[ "${1:-}" = "--strict" ] && STRICT=1
fail=0

is_allowed() {
  local file="$1"
  [ -f "$ALLOWLIST" ] && grep -qxF "$file" "$ALLOWLIST"
}

echo "== 1. Hex / rgb() / rgba() / hsl() literais em src/**/*.tsx (informativo) =="
literal_hits=$(grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsl\(" src --include=*.tsx | grep -v "hsl(var(" || true)
if [ -n "$literal_hits" ]; then
  echo "$literal_hits"
  [ "$STRICT" -eq 1 ] && fail=1
else
  echo "(nenhuma)"
fi

echo
echo "== 2. Classes de paleta laranja fora da allowlist =="
orange_hits=$(grep -rnoE "\b(bg|text|border|ring|from|to|via|fill|stroke)-orange-[0-9]{2,3}\b" src --include=*.tsx || true)
orange_fail=0
if [ -n "$orange_hits" ]; then
  while IFS= read -r line; do
    file="${line%%:*}"
    if ! is_allowed "$file"; then
      echo "$line"
      orange_fail=1
    fi
  done <<< "$orange_hits"
fi
[ "$orange_fail" -eq 0 ] && echo "(nenhuma fora da allowlist)"
[ "$orange_fail" -eq 1 ] && fail=1

echo
echo "== 3. Classes -sos fora da allowlist =="
sos_hits=$(grep -rnoE "\b(bg|text|border|ring|from|to|via|fill|stroke)-sos(-[a-z]+)?\b" src --include=*.tsx || true)
sos_fail=0
if [ -n "$sos_hits" ]; then
  while IFS= read -r line; do
    file="${line%%:*}"
    if ! is_allowed "$file"; then
      echo "$line"
      sos_fail=1
    fi
  done <<< "$sos_hits"
fi
[ "$sos_fail" -eq 0 ] && echo "(nenhuma fora da allowlist)"
[ "$sos_fail" -eq 1 ] && fail=1

if [ "$fail" -eq 1 ]; then
  echo
  echo "FALHOU: laranja fora do SOS, ou (em --strict) cor crua fora de token."
  exit 1
fi

echo
echo "OK: regra do laranja (Fase 3) respeitada."
