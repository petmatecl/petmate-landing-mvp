// pages/api/noop.ts
// ---------------------------------------------------------------------------
// Sprint form-post (2026-09-08) — endpoint destino de los `<form>` con
// credenciales/secretos cuando el navegador submitea antes de que React
// hidrate el onSubmit handler (pre-hydration submit).
//
// Cada `<form>` en la app con credenciales/secretos declara:
//   method="post" action="/api/noop"
//
// Motivación:
// - HTML default: si un `<form>` no tiene `method` explícito, submitea GET.
//   Si no tiene `action`, submitea al URL actual. La combinación default =
//   navegación GET al mismo URL con TODOS los campos como query string:
//   /login?email=user@x.com&password=super-secret
//   Las credenciales aterrizan en el URL bar del browser, en el server log
//   de Vercel (Referer/log rotation), en el histórico del navegador, en
//   cualquier third-party analytics que capture URLs.
// - React onSubmit hidrata post-load; el gap entre "form rendered" y
//   "onSubmit bound" puede ser 100ms-2s en cold-start de Vercel. Si el user
//   submitea con Enter en ese gap → default GET fires → creds leak.
//
// Fix: method="post" fuerza que el default submit sea POST (no GET); action
// apunta a este endpoint que devuelve 405 → el submit falla limpio, cero
// credenciales en URL, el user ve un mensaje de error del navegador y
// puede reintentar tras un instante (para entonces React ya hidrató).
//
// Este endpoint NUNCA debe procesar payload — es una superficie muda de
// rechazo por diseño. Cualquier POST/PUT/DELETE/PATCH devuelve 405 con
// header `Allow: GET` (indicando "solo GET aceptado, ergo estos verbos
// están rechazados"). GET también devuelve 405 (no hay recurso legítimo
// que servir acá).
// ---------------------------------------------------------------------------
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
    // Allow header vacío-implícito: cero métodos aceptados legítimamente.
    // Content-Type text/plain para no confundir con una API JSON.
    res.status(405).setHeader('Content-Type', 'text/plain; charset=utf-8').end('Method Not Allowed');
}
