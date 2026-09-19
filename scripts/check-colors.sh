#!/usr/bin/env bash
# Fase 2 do plano de identidade visual (docs/visual/plano.md).
#
# Falha se encontrar, em src/**/*.tsx:
#   1. hex, rgb()/rgba() ou hsl() literais (cor deveria vir de um token semântico,
#      via var(--token) ou uma classe Tailwind mapeada em tailwind.config.ts);
#   2. classes de paleta laranja/âmbar cruas (bg-orange-500, text-amber-600, etc.)
#      fora de scripts/sos-allowlist.txt;
#   3. classes *-sos (bg-sos-primary, text-sos-secondary, etc.) fora da mesma allowlist
#      — o laranja é exclusivo do SOS (regra 5 da seção 3 do plano); só os arquivos
#      do próprio fluxo de SOS podem usá-lo.
#
# Estado esperado hoje (fim da Fase 2): FALHA. O app ainda tem cores cruas em
# dezenas de arquivos (129 ocorrências de hex/rgb/hsl + 68 de paleta Tailwind,
# ver docs/visual/00-inventario.md §2). Este script é o critério de aceite da
# Fase 3, que faz a migração; só deve passar limpo ao final dela. Fica pronto
# para entrar em CI quando o CI existir (roadmap, sessão 25).

set -uo pipefail
cd "$(dirname "$0")/.."

ALLOWLIST="scripts/sos-allowlist.txt"
fail=0

is_allowed() {
  local file="$1"
  [ -f "$ALLOWLIST" ] && grep -qxF "$file" "$ALLOWLIST"
}

echo "== 1. Hex / rgb() / rgba() / hsl() literais em src/**/*.tsx =="
literal_hits=$(grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsl\(" src --include=*.tsx | grep -v "hsl(var(" || true)
if [ -n "$literal_hits" ]; then
  echo "$literal_hits"
  fail=1
else
  echo "(nenhuma)"
fi

echo
echo "== 2. Classes de paleta laranja/âmbar fora da allowlist =="
orange_hits=$(grep -rnoE "\b(bg|text|border|ring|from|to|via|fill|stroke)-(orange|amber)-[0-9]{2,3}\b" src --include=*.tsx || true)
if [ -n "$orange_hits" ]; then
  while IFS= read -r line; do
    file="${line%%:*}"
    if ! is_allowed "$file"; then
      echo "$line"
      fail=1
    fi
  done <<< "$orange_hits"
fi
[ "$fail" -eq 0 ] && echo "(nenhuma fora da allowlist)"

echo
echo "== 3. Classes -sos fora da allowlist =="
sos_hits=$(grep -rnoE "\b(bg|text|border|ring|from|to|via|fill|stroke)-sos(-[a-z]+)?\b" src --include=*.tsx || true)
if [ -n "$sos_hits" ]; then
  while IFS= read -r line; do
    file="${line%%:*}"
    if ! is_allowed "$file"; then
      echo "$line"
      fail=1
    fi
  done <<< "$sos_hits"
fi

if [ "$fail" -eq 1 ]; then
  echo
  echo "FALHOU: cores fora do padrão de tokens encontradas acima."
  exit 1
fi

echo
echo "OK: nenhuma cor fora do padrão encontrada."
