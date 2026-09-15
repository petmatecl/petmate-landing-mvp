#!/usr/bin/env bash
# scripts/git-commit-verify.sh
# ---------------------------------------------------------------------------
# Verificador de staging pre-commit — sprint bloque-f item 11a
# (GIT-COMMIT-VERIFY, BACKLOG L1169).
#
# CONTEXTO:
#   Durante el sprint sentry-init (2026-08-11) un `git add pathspec-inexistente`
#   post-`git mv` emitió `fatal:` pero NO retornó exit no-cero al shell.
#   El `git commit` siguió con solo lo detectado en index pre-fallo, creando
#   un commit parcial invisible (1 archivo, 0 insertions, 0 deletions — solo
#   el rename). Es el mismo patrón que P8 codifica: "la interfaz reportó
#   éxito, el efecto no ocurrió".
#
# QUÉ HACE:
#   Toma una lista de rutas esperadas + verifica con `git diff --cached
#   --name-only` que TODAS estén en el index. Falla loud (exit 1) con
#   diagnóstico específico si falta alguna.
#
# CÓMO USAR:
#   ./scripts/git-commit-verify.sh <ruta1> <ruta2> ...
#
#   O leer de stdin (una ruta por línea):
#   echo "path/to/file1
#   path/to/file2" | ./scripts/git-commit-verify.sh -
#
#   Combinado con commit:
#   git add path1 path2 path3
#   ./scripts/git-commit-verify.sh path1 path2 path3 && git commit -m "..."
#
# EXIT CODES:
#   0 — todas las rutas esperadas están en el index staged.
#   1 — al menos una ruta esperada NO está en el index (falla loud).
#   2 — invocación inválida (0 argumentos ni stdin).
# ---------------------------------------------------------------------------

set -u

usage() {
    cat <<EOF
Uso: $0 <ruta1> [<ruta2> ...]
     echo -e "ruta1\\nruta2" | $0 -

Verifica que TODAS las rutas listadas estén en el git index staged.
Falla con exit 1 si falta alguna. Ver comentario en el archivo para
la historia del bug que motivó este helper.
EOF
}

# Leer lista esperada de args o stdin.
if [ $# -eq 0 ]; then
    usage >&2
    exit 2
fi

expected=()
if [ "$1" = "-" ]; then
    while IFS= read -r line; do
        [ -n "$line" ] && expected+=("$line")
    done
else
    for path in "$@"; do
        expected+=("$path")
    done
fi

if [ ${#expected[@]} -eq 0 ]; then
    echo "[git-commit-verify] ERROR: cero rutas esperadas (args vacíos y stdin vacío)." >&2
    usage >&2
    exit 2
fi

# Lista real del index.
staged=$(git diff --cached --name-only 2>/dev/null)
if [ -z "$staged" ]; then
    echo "[git-commit-verify] ERROR: el index staged está vacío." >&2
    echo "[git-commit-verify] Esperaba: ${#expected[@]} ruta(s)." >&2
    printf '  - %s\n' "${expected[@]}" >&2
    exit 1
fi

# Verificar cada ruta esperada contra el staging.
missing=()
for path in "${expected[@]}"; do
    if ! echo "$staged" | grep -Fxq "$path"; then
        missing+=("$path")
    fi
done

if [ ${#missing[@]} -gt 0 ]; then
    echo "[git-commit-verify] ERROR: ${#missing[@]} de ${#expected[@]} rutas esperadas NO están staged:" >&2
    printf '  - %s\n' "${missing[@]}" >&2
    echo "" >&2
    echo "[git-commit-verify] Staged actual:" >&2
    echo "$staged" | sed 's/^/  ✓ /' >&2
    echo "" >&2
    echo "[git-commit-verify] Diagnóstico: probable \`git add <ruta>\` falló silente" >&2
    echo "  (rename no-tracked, pathspec inexistente, .gitignore match, o error" >&2
    echo "  no-fatal que git no propagó al shell). Ver comentario en el archivo." >&2
    exit 1
fi

echo "[git-commit-verify] OK: ${#expected[@]} ruta(s) staged correctamente." >&2
exit 0
