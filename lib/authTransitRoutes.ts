/**
 * Rutas de tránsito de autenticación — el user está en un flow que
 * involucra sesión (login, signup, recuperación, confirmación de correo,
 * completar registro post-huérfano, logout de seguridad).
 *
 * Sprint email-landing session-timeout fix (2026-08-25) — consumida por
 * DOS guards paralelos que decidían por su cuenta qué rutas excluir:
 *   - `contexts/UserContext.tsx isOrphanSafeRoute`: decide si redirigir
 *     usuarios huérfanos (auth activa + cero perfiles) a `/completar-registro`.
 *   - `components/SessionTimeout.tsx`: decide si aplicar chequeo de
 *     inactividad al mount + suscribe a SIGNED_IN para no expulsar
 *     usuarios en medio de un flow de auth con sesión recién creada.
 *
 * Historia del bug que originó la constante:
 *   - Sprint email-landing loader fix (2026-08-25, commit c8296a1)
 *     eliminó `setSession()` explícito de `pages/email-confirmado.tsx`
 *     (era race source del loader pegado). El race fix destapó que
 *     `SessionTimeout` no excluía `/email-confirmado` — antes lo
 *     salvaba un race accidental donde `getSession()` del
 *     `SessionTimeout` corría más rápido que el SDK global consumiendo
 *     el hash. Con el race resuelto, la sesión se hidrataba a tiempo
 *     para que el `handleLogout` del `SessionTimeout` la detectara y
 *     redirigiera al usuario recién confirmado a `/security-logout`
 *     con copy "cerramos sesión por inactividad" — 29 segundos post-
 *     signup, sin inactividad real.
 *   - Root cause: 2 guards independientes con listas separadas → la
 *     próxima ruta de tránsito auth se olvidaba de agregar a una.
 *
 * Fix estructural: constante única. Cualquier ruta nueva se agrega
 * ACÁ. Los guards importan y consultan sin decidir su propia lista.
 */
export const AUTH_TRANSIT_ROUTES: ReadonlySet<string> = new Set([
    '/login',
    '/register',
    '/logout',
    '/security-logout',
    '/completar-registro',
    '/email-confirmado',
    '/forgot-password',
    '/reset-password',
]);

/**
 * Rutas informativas públicas — accesibles sin sesión ni perfil, pero
 * NO son parte del flow de auth (no ejercitan `getSession`, no reciben
 * SIGNED_IN, no piden credenciales). Se listan aparte porque los guards
 * las tratan distinto:
 *   - `isOrphanSafeRoute` (UserContext): las incluye para permitir que
 *     un user autenticado sin perfil pueda leer Términos/Privacidad
 *     sin ser redirigido a `/completar-registro`.
 *   - `SessionTimeout`: NO las excluye — el chequeo de inactividad
 *     debe aplicar aunque el user esté leyendo estas páginas (es
 *     comportamiento esperado del guard de sesión).
 */
export const INFORMATIONAL_PUBLIC_ROUTES: ReadonlySet<string> = new Set([
    '/terminos',
    '/privacidad',
    '/quienes-somos',
]);

/**
 * Normaliza un path: separa querystring/hash, quita trailing slash
 * salvo en la raíz `/`. Comparación estricta contra el Set.
 */
function normalizePath(path: string): string {
    const [pathNoQuery] = path.split('?');
    const [pathNoHash] = pathNoQuery.split('#');
    if (pathNoHash.length > 1 && pathNoHash.endsWith('/')) {
        return pathNoHash.slice(0, -1);
    }
    return pathNoHash;
}

/**
 * True si el path es una ruta de flow de auth (login, signup,
 * confirmación, recuperación, etc). Guards que dependen de sesión
 * deben excluir estas rutas — el user está justamente estableciendo
 * o cerrando sesión, cualquier chequeo estricto de "hay sesión válida"
 * puede reventar el flow.
 */
export function isAuthTransitRoute(path: string): boolean {
    return AUTH_TRANSIT_ROUTES.has(normalizePath(path));
}

/**
 * True si el path es "orphan-safe": user autenticado sin perfil puede
 * navegarla sin ser redirigido. Es superset de auth-transit + páginas
 * informativas públicas. Consumido por `UserContext hydrateFromSession`.
 */
export function isOrphanSafeRoute(path: string): boolean {
    const normalized = normalizePath(path);
    return AUTH_TRANSIT_ROUTES.has(normalized)
        || INFORMATIONAL_PUBLIC_ROUTES.has(normalized);
}
