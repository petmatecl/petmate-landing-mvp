#!/usr/bin/env bash
# scripts/ci-warmup.sh
# ---------------------------------------------------------------------------
# Warmup del preview Vercel antes de Playwright. Sprint ci-warmup (2026-11-13).
#
# Uso:
#   bash scripts/ci-warmup.sh <BASE_URL> <BYPASS_TOKEN> <path1> [path2] [path3...]
#
# Hace GET a cada path con el query bypass de Deployment Protection. Retry
# por path hasta que responda 200. Deadline global: 60s para TODOS los paths.
# Si algun path no alcanza 200 dentro del deadline, exit 1 con mensaje claro
# "[WARMUP] preview no responde" (vs los timeouts confusos downstream en
# Playwright setup). Log de tiempo por request para diagnostico de cold start.
#
# Objetivo (PO 2026-11-13): reducir fallos recurrentes de arranque en frio
# vistos esta semana (goto 17s, ECONNRESET, ERR_TIMED_OUT en specs). El
# warmup amortiza la hidratacion de React chunks + warm-up del pool Vercel
# + conexiones Supabase edge; Playwright llega con el preview caliente.
# ---------------------------------------------------------------------------

set -o pipefail

BASE_URL="${1:?[WARMUP] falta BASE_URL (primer arg)}"
BYPASS="${2:-}"
shift 2
PATHS=("$@")

if [ ${#PATHS[@]} -lt 1 ]; then
  echo "[WARMUP] falta al menos 1 path (uso: $0 BASE_URL BYPASS /path1 [/path2 ...])" >&2
  exit 1
fi

# Query string del bypass. Sin BYPASS, el GET a preview protegido retorna
# el HTML del SSO de Vercel con 401 — nunca llegaria a 200 y el warmup
# fallaria sin razon util. BYPASS vacio queda explicito en el log.
if [ -n "$BYPASS" ]; then
  QS="?x-vercel-protection-bypass=$BYPASS&x-vercel-set-bypass-cookie=samesitenone"
else
  QS=""
  echo "[WARMUP] AVISO: BYPASS vacio — preview protegido retornara 401, warmup fallara"
fi

DEADLINE_S=60
DEADLINE=$(( $(date +%s) + DEADLINE_S ))

echo "[WARMUP] inicio · BASE=$BASE_URL · paths=${PATHS[*]} · deadline=${DEADLINE_S}s"

# done_arr[i]=1 cuando PATHS[i] ya respondio 200.
done_arr=()
for _ in "${PATHS[@]}"; do done_arr+=(0); done

all_ok=0
attempt=0
TMP_BODY=$(mktemp)
trap 'rm -f "$TMP_BODY"' EXIT
# Marcador esperado en el HTML real de la app. Si falta, el 200 vino de
# la pantalla de Vercel "Deployment is building" (preview aun no listo) o
# de una landing generica. El spec share-mobile (run 43463116657) fallo
# por este false positive: warmup acepto 200 de "Deployment is building"
# → setup auth + share-mobile fallaron porque el DOM era de Vercel, no
# de Pawnecta. Fix del PR ci-warmup iter 2 (2026-11-13): grep del marcador.
APP_MARKER="Pawnecta"

while [ "$(date +%s)" -lt "$DEADLINE" ]; do
  attempt=$((attempt + 1))
  pending=0
  for i in "${!PATHS[@]}"; do
    if [ "${done_arr[$i]}" = "1" ]; then continue; fi
    path="${PATHS[$i]}"
    t0=$(date +%s%3N)
    status=$(curl -sS -o "$TMP_BODY" -w "%{http_code}" -L --max-time 15 "${BASE_URL}${path}${QS}" || echo "000")
    t1=$(date +%s%3N)
    elapsed=$((t1 - t0))
    if [ "$status" = "200" ] && grep -q "$APP_MARKER" "$TMP_BODY" 2>/dev/null; then
      echo "[WARMUP] attempt=$attempt GET $path -> $status (+app) in ${elapsed}ms"
      done_arr[$i]=1
    elif [ "$status" = "200" ]; then
      # 200 OK pero body sin "Pawnecta" → pantalla Vercel "building" o similar.
      preview=$(head -c 120 "$TMP_BODY" 2>/dev/null | tr '\n' ' ' | tr -s ' ')
      echo "[WARMUP] attempt=$attempt GET $path -> $status (sin app) in ${elapsed}ms · body=\"${preview}...\""
      pending=1
    else
      echo "[WARMUP] attempt=$attempt GET $path -> $status in ${elapsed}ms"
      pending=1
    fi
  done
  if [ "$pending" -eq 0 ]; then
    all_ok=1
    break
  fi
  # Pausa breve entre rondas para no saturar durante retries.
  sleep 2
done

if [ "$all_ok" -ne 1 ]; then
  echo "[WARMUP] preview no responde 200 en todos los paths dentro de ${DEADLINE_S}s" >&2
  echo "[WARMUP] estado final:" >&2
  for i in "${!PATHS[@]}"; do
    pstatus=$([ "${done_arr[$i]}" = "1" ] && echo OK || echo PENDING)
    echo "  ${PATHS[$i]} -> $pstatus" >&2
  done
  exit 1
fi

echo "[WARMUP] preview despierto (${#PATHS[@]}/${#PATHS[@]} paths OK en $attempt intento(s))"
