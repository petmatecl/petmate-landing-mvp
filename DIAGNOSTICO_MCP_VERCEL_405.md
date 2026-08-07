# Diagnóstico MCP Vercel — SSE Non-200 (405)

**Fecha**: 2026-08-04.
**Contexto**: instalación del plugin oficial Vercel (`@claude-plugins-official/vercel@0.44.0`) el 2026-08-04. OAuth de Aldo completó exitoso 2 veces ("Authentication successful", team `petmatecl`, project `pawnecta-landing-mvp`, permisos read-write estándar). La conexión del server MCP falla persistente con `SSE error: Non-200 status code (405)` tras Authenticate + Reconnect + restart.

## Root cause — CONFIRMADO en 1 lectura

Conflicto de config entre 2 `.mcp.json` con precedencia distinta:

### `.mcp.json` del PROYECTO (`c:/Aldo/pawnecta-web-mvp/.mcp.json`) — pre-existente

```json
"vercel": { "type": "sse", "url": "https://mcp.vercel.com" }
```

Fue configurado en algún momento pasado con el transporte **SSE (viejo)**.

### `.mcp.json` del PLUGIN (`c:/Users/canoc/.claude/plugins/cache/claude-plugins-official/vercel/0.44.0/.mcp.json`) — nuevo

```json
{
  "mcpServers": {
    "vercel": {
      "type": "http",
      "url": "https://mcp.vercel.com",
      "note": "Official Vercel MCP server. Uses OAuth — on first connection the agent will be prompted to authorize via Vercel. Read-only in initial release: search docs, list projects/deployments, inspect logs."
    }
  }
}
```

Usa **streamable-HTTP (nuevo)** — el transporte correcto post-migración del server.

### Precedencia

La config del proyecto **sobreescribe** la del plugin. Como el proyecto declara `type: sse`, Claude Code intenta abrir SSE contra `https://mcp.vercel.com` → el server (que ya no soporta SSE) responde **HTTP 405 Method Not Allowed**. El error del user calza literal con este comportamiento.

## Hipótesis del PO — evaluación

| Hipótesis PO | Verdadera | Notas |
|---|---|---|
| (a) endpoint migró SSE → streamable-HTTP y config plugin apunta al transporte viejo | ✅ **CONFIRMADA con ajuste**: no es el plugin el que apunta al viejo — el plugin sí usa `http`. Es el `.mcp.json` LOCAL del proyecto (config prevalente) el que sigue en `sse`. |
| (b) versión del plugin desactualizada | ❌ Descartada. Plugin `0.44.0` con `type: http` correcto. |
| (c) red local | ❌ Descartada. El 405 es error HTTP del server, no error de red (timeouts, DNS, connection refused). |

## Fix recomendado (~2 min, cero riesgo, local, reversible)

Editar `c:/Aldo/pawnecta-web-mvp/.mcp.json`:

**Antes** (línea 4):
```json
"vercel": { "type": "sse", "url": "https://mcp.vercel.com" },
```

**Después**:
```json
"vercel": { "type": "http", "url": "https://mcp.vercel.com" },
```

O alternativamente **eliminar la entry `vercel` local** para que el proyecto herede la del plugin (que ya tiene la config correcta). Ambos approaches dan el mismo runtime.

**Post-fix**: `/mcp reconnect vercel` en el CLI interactivo de Aldo. Si el OAuth ya está aprobado, el reconnect debería levantar la sesión con transport correcto sin re-prompt.

**Verificación del fix**: los tools `mcp__vercel__*` (list_deployments, get_deployment, get_projects, etc.) deberían aparecer en el listado deferred de Claude Code y ser invocables via ToolSearch.

## Bonus: hallazgo colateral revisado

El `.mcp.json` local tiene `SUPABASE_ACCESS_TOKEN` en env de la entry `supabase-staging`. **Verificado gitignored** (`.gitignore` línea 23: `.mcp.json`). No hay leak a git — el token está solo local. Sin acción requerida.

## Plan B (si el fix no aplica o el MCP sigue caído por otra razón)

Instalar el CLI de Vercel directamente:

```bash
npm i -g vercel
vercel login   # OAuth via browser (misma cuenta petmatecl)
```

Cubre el ~80% del caso de uso (skills `vercel:status`, `vercel:deploy`, `vercel:env`, `vercel:deployments-cicd` — todos usan bash + CLI). No requiere el MCP para operar.

**Trade-off**: sin MCP no tengo tools `mcp__vercel__*` para operaciones programáticas fine-grained (queries de deployments filtered, envs, etc.), pero los skills cubren el flow operacional (verificación Ready, logs, promotes con GO explícito).

## Recomendación final

1. **Aplicar el fix del `.mcp.json`** (cambio `sse` → `http`, ~2 min). Es el path de menor esfuerzo con máximo return.
2. **Si Aldo prefiere Plan B**: instalar CLI. Menos idealisticalmente, pero funcional.
3. **Ambos NO son excluyentes**: se pueden aplicar los dos (MCP + CLI) — Redundancia útil.

## Aprobación PO requerida

El fix del `.mcp.json` es un cambio local a config (no productiva, no committeable). Aplicable directamente sin GO explícito bajo criterio "acción reversible sin ask" — pero el file guarda el `SUPABASE_ACCESS_TOKEN`, así que preservar el resto del contenido intacto es crítico. Reporto para autorización explícita antes de tocar.

## Estado tras diagnóstico

- **Bloqueo Vercel plugin** → root cause identificado, fix trivial disponible.
- **Standby para GO PO** de aplicar el fix o preferir Plan B (CLI install).
- **Auditoría #2 jueves** — sin dependencia del Vercel plugin para los revisores (`security-guidance` + `code-review` operan sobre diff local sin plugin). El Vercel plugin solo es útil para los smokes prod post-desfile (Fase 7 estilo N15).
