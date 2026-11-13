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

# Bypass via HEADERS, no query params. Motivación (sprint ci-warmup iter 4,
# 2026-11-13): el iter 3 pasaba el bypass en query string sin URL-encode
# (`?x-vercel-protection-bypass=$BYPASS`). Si el token contiene chars que
# requieren encoding (+, /, =), Vercel rechaza el bypass y responde 302 a
# `vercel.com/sso-api`. Con `curl -L` (que iter 3 usaba), curl seguia el
# redirect y terminaba con 200 OK del HTML del SSO de Vercel (lang="en-US",
# clases "dash") — false positive sutil que el grep "Pawnecta" si detectaba
# correctamente (ver log del run 43467993397). Fix: headers sin encoding +
# sin `-L`. Alineado con withBypass() de los tests Playwright, que usa
# encodeURIComponent en query porque el browser no permite set custom
# headers facil; curl no tiene esa limitacion.
BYPASS_HEADERS=()
if [ -n "$BYPASS" ]; then
  BYPASS_HEADERS+=(-H "x-vercel-protection-bypass: $BYPASS")
  BYPASS_HEADERS+=(-H "x-vercel-set-bypass-cookie: samesitenone")
else
  echo "[WARMUP] AVISO: BYPASS vacio — preview protegido retornara 401/302, warmup fallara"
fi

DEADLINE_S=60
# MAX_DEADLINE se activa automaticamente si detectamos que el preview esta
# todavia en build de Vercel ("Deployment is building" en el body). Un build
# fresh de Next en Vercel tarda ~2-3 min; 60s no alcanza y 240s cubre el P99.
# Cambio adaptive una sola vez por invocacion — si pasa a 240s y sigue sin
# aparecer la app, falla loud igual.
MAX_DEADLINE_S=240
DEADLINE=$(( $(date +%s) + DEADLINE_S ))
extended=0

echo "[WARMUP] inicio · BASE=$BASE_URL · paths=${PATHS[*]} · deadline=${DEADLINE_S}s (adaptive hasta ${MAX_DEADLINE_S}s si preview building)"

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
    # SIN `-L`. Si Vercel rechaza bypass, responde 3xx a sso-api; un `-L`
    # seguiria el redirect y terminaria con 200 OK del SSO page (iter 3 bug).
    status=$(curl -sS -o "$TMP_BODY" -w "%{http_code}" --max-time 15 "${BYPASS_HEADERS[@]}" "${BASE_URL}${path}" || echo "000")
    t1=$(date +%s%3N)
    elapsed=$((t1 - t0))
    # 3xx = bypass rechazado → error de config del CI, no es cuestion de reintentar.
    case "$status" in
      3[0-9][0-9])
        echo "[WARMUP] bypass rechazado en $path: status $status (Vercel redirige a sso-api). Token PLAYWRIGHT_BYPASS puede estar invalido, vencido o faltar." >&2
        rm -f "$TMP_BODY"
        exit 1
        ;;
    esac
    if [ "$status" = "200" ] && grep -q "$APP_MARKER" "$TMP_BODY" 2>/dev/null; then
      echo "[WARMUP] attempt=$attempt GET $path -> $status (+app) in ${elapsed}ms"
      done_arr[$i]=1
    elif [ "$status" = "200" ] && grep -q "Deployment is building" "$TMP_BODY" 2>/dev/null; then
      # Pantalla Vercel "Deployment is building" — el preview aun no termino
      # su build. Trigger del workflow (pull_request synchronize) corre
      # inmediato sin esperar `deployment_status success`, entonces este
      # escenario es esperable en PRs frescos o pushes nuevos a un branch.
      # Extender deadline a MAX_DEADLINE_S una sola vez para dar oxigeno.
      echo "[WARMUP] attempt=$attempt GET $path -> $status (Vercel building) in ${elapsed}ms"
      if [ "$extended" = "0" ]; then
        DEADLINE=$(( $(date +%s) + MAX_DEADLINE_S - DEADLINE_S ))
        extended=1
        echo "[WARMUP] 'Deployment is building' detectado — deadline extendido a ${MAX_DEADLINE_S}s totales"
      fi
      pending=1
    elif [ "$status" = "200" ]; then
      # 200 OK pero body sin "Pawnecta" ni "building" → landing generica, SSO, otro.
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
