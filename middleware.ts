import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ----------------------------------------------------------------------------
// Batch REMATE-1 R2a (2026-08-11) — Bot patterns → 404 real.
//
// Motivación (PO 2026-08-11): scans automatizados de bots buscando
// vulnerabilidades WordPress/PHP/CMS reciben respuesta 200 desde el catch-all
// de Next.js en algunas rutas (ej. `/wp-content/uploads` HTTP 200 verificado).
// El 200 ensucia logs de errores prod + invita al escaneo (para el bot, 200
// = "hay algo aquí, seguir tanteando"). Fix: middleware chico que responde
// 404 real ANTES del route handler → bots dejan de encontrar señal + logs
// limpios.
//
// Diseño mínimo — solo patterns canónicos de bot conocidos que NO colisionan
// con rutas legítimas de Pawnecta. Ver `matcher` en la config export abajo.
// Zero false positive contra el catálogo actual de rutas (verificado por
// P6-espíritu contra pages/ y app/).
//
// Runtime: Edge por default (middleware.ts). Cero cold start para el 404 →
// bots reciben la respuesta al instante sin invocar server function.
// ----------------------------------------------------------------------------

export function middleware(_request: NextRequest) {
    // Este middleware SOLO recibe requests que matchean el matcher de abajo.
    // Todos los que llegan aquí son patterns de bot → respuesta 404 uniforme.
    return new NextResponse(null, { status: 404 });
}

export const config = {
    // Matcher: paths de scan automatizado conocidos. Ordenados por frecuencia
    // observada en logs prod (~2026-08). Actualizar la lista solo si aparecen
    // nuevos patterns constantes en Vercel Logs sin cobertura acá.
    //
    // No incluye `/.env`, `/.git*`, `/api/*` porque:
    // - dotfiles: Vercel platform ya los bloquea con 404 explícito
    //   (verificado 2026-08-11).
    // - `/api/*`: rutas legítimas del proyecto — router de Next.js maneja.
    //
    // No usa wildcards abiertos (`(.*)`) para no arrastrar rutas legítimas.
    matcher: [
        // WordPress admin/login.
        '/wp-admin/:path*',
        '/wp-login.php',
        '/wp-content/:path*',
        '/wp-includes/:path*',
        '/wordpress/:path*',
        // XML-RPC endpoint (WordPress attack surface clásico).
        '/xmlrpc.php',
        // CMSs alternativos comunes en scans.
        '/administrator/:path*',
        '/phpmyadmin/:path*',
        '/joomla/:path*',
        '/drupal/:path*',
        // Archivos PHP arbitrarios en la raíz (proyecto es Next.js — no hay
        // .php legítimos).
        '/:file(.+\\.php)',
    ],
};
