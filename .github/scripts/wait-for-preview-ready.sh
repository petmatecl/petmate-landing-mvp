#!/usr/bin/env bash
# .github/scripts/wait-for-preview-ready.sh
# ---------------------------------------------------------------------------
# Espera hasta que el preview URL de Vercel sirva la app de Pawnecta (no la
# UI "Deployment is building" de Vercel ni una pantalla SSO).
#
# Causa raíz (sprint authtoken-f2-fix 2026-11-27): el workflow de GitHub
# Actions arrancaba Playwright antes de que Vercel completara el build del
# preview. Durante la ventana de "building", Vercel sirve una página con
# `<h1>Deployment is building</h1>` que responde HTTP 200 → el step anterior
# "Wait for preview Ready" (que solo chequeaba HTTP 200) daba OK y Playwright
# hacía goto a una página vacía. Los setups `locator('#email').fill(...)`
# timeouteaban 30s en un DOM sin el form.
#
# Evidencia: traces de #237 attempt 1 (run 46011548176) y #238 attempt 1
# (run 46015088597) mostraron ambos el mismo DOM "Deployment is building" en
# `error-context.md`. Ver docs/sprints/auth-token-persist-fix-estructural-plan.md
# § 3.3 Fase 1.5.
#
# Uso:
#   PREVIEW_URL=https://pawnecta-landing-mvp-git-xxx.vercel.app \
#   BYPASS=<secret> \
#   bash .github/scripts/wait-for-preview-ready.sh
#
# Config:
#   MAX_ATTEMPTS (default 60) — 60 × 10s = 10 min max wait.
#   SLEEP_SECONDS (default 10).
#   READY_MARKER (default "Pawnecta") — string del HTML que indica "app servida".
#   BUILDING_MARKER (default "Deployment is building") — marker explícito de Vercel.
# ---------------------------------------------------------------------------
set -euo pipefail

: "${PREVIEW_URL:?PREVIEW_URL env var requerido}"
BYPASS="${BYPASS:-}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-60}"
SLEEP_SECONDS="${SLEEP_SECONDS:-10}"
READY_MARKER="${READY_MARKER:-Pawnecta}"
BUILDING_MARKER="${BUILDING_MARKER:-Deployment is building}"

# Bypass query param — Vercel protection enabled en previews.
if [ -n "$BYPASS" ]; then
    BYPASS_QP="?x-vercel-protection-bypass=${BYPASS}"
else
    BYPASS_QP=""
fi

echo "[wait-for-preview-ready] Target: ${PREVIEW_URL}"
echo "[wait-for-preview-ready] Max wait: $((MAX_ATTEMPTS * SLEEP_SECONDS))s"

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

for i in $(seq 1 "$MAX_ATTEMPTS"); do
    STATUS=$(curl -s -o "$TMP" -w "%{http_code}" -L "${PREVIEW_URL}/login${BYPASS_QP}" 2>/dev/null || echo "000")

    if [ "$STATUS" != "200" ]; then
        echo "  attempt $i/${MAX_ATTEMPTS}: HTTP $STATUS (esperando app ready)"
        sleep "$SLEEP_SECONDS"
        continue
    fi

    # HTTP 200 — chequear contenido.
    if grep -q "$BUILDING_MARKER" "$TMP"; then
        echo "  attempt $i/${MAX_ATTEMPTS}: HTTP 200 pero 'Deployment is building' aún presente"
        sleep "$SLEEP_SECONDS"
        continue
    fi

    if grep -q "$READY_MARKER" "$TMP"; then
        echo "[wait-for-preview-ready] READY tras $((i * SLEEP_SECONDS))s — app servida (marker '$READY_MARKER' encontrado)"
        exit 0
    fi

    # HTTP 200 sin marker ready ni building — puede ser SSO page de Vercel
    # o algún otro placeholder.
    echo "  attempt $i/${MAX_ATTEMPTS}: HTTP 200 sin marker '$READY_MARKER' (body desconocido)"
    sleep "$SLEEP_SECONDS"
done

echo "[wait-for-preview-ready] ERROR: preview NO ready tras $((MAX_ATTEMPTS * SLEEP_SECONDS))s"
echo "[wait-for-preview-ready] Último body (primeros 500 bytes):"
head -c 500 "$TMP" || true
echo ""
exit 1
