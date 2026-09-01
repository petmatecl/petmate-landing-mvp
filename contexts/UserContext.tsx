import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

// Sprint email-landing session-timeout fix (2026-08-25) — `isOrphanSafeRoute`
// migrado a `lib/authTransitRoutes.ts` como constante compartida con
// `SessionTimeout`. Antes ambos guards mantenían listas paralelas y era
// deuda por olvidar sincronizar cuando se agregara una nueva ruta de
// tránsito de auth. Ver comentario en el módulo compartido para historia
// completa del bug que motivó la centralización.
import { isOrphanSafeRoute } from '../lib/authTransitRoutes';

// Rutas que requieren sesion activa. Cuando SIGNED_OUT no-voluntario llega
// (token expiro, otra tab cambio de usuario), redirigimos al login solo si
// el usuario esta en una de estas — evita el redirect brusco cuando esta
// navegando en /explorar u otra pagina publica.
//
// Match exacto para /proveedor (dashboard) para no capturar /proveedor/[id]
// (ficha publica). Mismo criterio que getRedirectMessage() en login.tsx.
function isProtectedPath(path: string): boolean {
    const [pathNoQuery] = path.split('?');
    if (pathNoQuery === '/proveedor' || pathNoQuery === '/proveedor/') return true;
    // Batch REMATE-1 R2b: preservamos AMBAS rutas por ~24-48h para que la
    // navegación redirect 301 (/mis-solicitudes → /mis-reservas) siga
    // reconocida como path protegido durante la transición. El redirect en
    // next.config.js hace el trabajo de URL rewrite; este guard sigue
    // protegiendo la sesión en tránsito.
    if (pathNoQuery.startsWith('/mis-reservas')) return true;
    if (pathNoQuery.startsWith('/mis-solicitudes')) return true;
    if (pathNoQuery.startsWith('/usuario')) return true;
    if (pathNoQuery.startsWith('/admin')) return true;
    if (pathNoQuery.startsWith('/mensajes')) return true;
    if (pathNoQuery.startsWith('/favoritos')) return true;
    return false;
}

// Types
type Role = 'usuario' | 'proveedor' | 'admin';

interface UserProfile {
    nombre: string;
    apellido_p: string;
    apellido_m?: string;
    roles?: string[];
    foto_perfil?: string;
    aprobado?: boolean;
}

// UserCapabilities y GUEST_CAPABILITIES removidos en sprint role-degradation
// C1 (2026-09-01) — dead code sin consumers. Verificado por 3 vías de grep:
// (a) `capabilities` = 1 file (este mismo, cero consumers externos);
// (b) `UserCapabilities|GUEST_CAPABILITIES|canBook|...` = 2 files (UserContext
//     + lib/authService.ts, ambos DEFINEN pero ninguno IMPORTA del otro);
// (c) `useUser()` destructuring = 20 sitios, cero destructura `capabilities`.
// El sistema entero de `capabilities` quedó como dead code doble tras algún
// refactor sin cleanup. Anotado en BACKLOG para revisar remover lib/authService.ts
// también en sprint aparte.

export type OnboardingStep = 'EMAIL_VERIFIED' | 'ROLE_SELECTED' | 'PROFILE_BASIC' | 'COMPLETE';

interface UserContextType {
    user: any | null; // Supabase user
    profile: UserProfile | null;
    /**
     * Row completo de `proveedores` para el usuario actual (o null si el user
     * es solo tutor / no tiene perfil proveedor). Hidratado UNA sola vez al
     * inicializar la sesion para que `/proveedor` no tenga que refetcharlo.
     * Si el dashboard muta el row (saveProfile) debe llamar refreshProveedorRow
     * para mantener este cache fresco si se navega y vuelve.
     */
    proveedorRow: any | null;
    refreshProveedorRow: () => Promise<void>;
    roles: string[];
    activeRole: Role | null; // Keep for backwards compatibility (RoleSelectionInterceptor, GoogleAuthButton, login)
    /**
     * True si el usuario tiene fila en `usuarios_buscadores` (perfil tutor).
     * Reemplaza al `canSwitchMode` legacy (que combinaba tutor+proveedor
     * aprobado en un solo boolean). Ahora los consumidores derivan los items
     * de nav directamente por rol (`hasSeekerProfile` + `providerStatus`).
     */
    hasSeekerProfile: boolean;
    providerStatus: 'none' | 'pendiente' | 'aprobado';
    onboardingStatus: OnboardingStep;
    isLoading: boolean;
    isAuthenticated: boolean;
    activateProviderMode: () => void;
    switchRole: (role: Role) => void;
    refreshProfile: () => Promise<void>;
    logout: () => Promise<void>;
    softReset: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserContextProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [proveedorRow, setProveedorRow] = useState<any | null>(null);
    const [activeRole, setActiveRole] = useState<Role | null>(null);
    const [hasSeekerProfile, setHasSeekerProfile] = useState(false);
    const [providerStatus, setProviderStatus] = useState<'none' | 'pendiente' | 'aprobado'>('none');
    const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStep>('COMPLETE'); // Default optimistic

    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    // Bandera para distinguir el SIGNED_OUT que dispara `logout()`/`softReset()`
    // (voluntario — el caller ya redirige) del que llega por token expiry o por
    // otra tab que cambio de usuario (no-voluntario — nosotros redirigimos si
    // la ruta actual es protegida). Ref y no state para evitar re-renders y
    // para leer el valor mas fresco dentro del handler de auth.
    const isVoluntaryLogoutRef = useRef(false);

    // ═══════════════════════════════════════════════════════════════════════
    // SPRINT role-degradation C2 (2026-09-01) — RETRY IN-PLACE DEL HYDRATE
    // ═══════════════════════════════════════════════════════════════════════
    //
    // PROBLEMA QUE RESUELVE: cuando el Promise.all de las queries de perfil
    // en hydrateFromSession falla (red transitoria, error PostgREST, RLS
    // glitch, timeout CDN, etc.), el catch dejaba el estado degradado
    // (profile=null, providerStatus='none', etc.) HASTA QUE EL USUARIO
    // RECARGARA. El header pasaba de "Admin" a "Usuario", /admin rebotaba,
    // y no había forma automática de recuperarse. Además el usuario no
    // sabía que había pasado — silenciosa y persistente.
    //
    // DISEÑO — 4 intentos totales (initial + 3 retries), backoff entre cada:
    //
    //   t=0        attempt 0 (initial) — corre de una en el .then/case SIGNED_IN
    //   t=500ms    attempt 1 (retry #1)
    //   t=2500ms   attempt 2 (retry #2)  ← aviso "Reintentando..." en C3
    //   t=10500ms  attempt 3 (retry #3)  ← aviso final "no pudimos cargar" en C3
    //   fin.       no hay más — el estado queda degradado + aviso final visible.
    //
    // Total wall-clock máximo antes de agotar: ~10.5s.
    //
    // TRES DECISIONES CRÍTICAS A NO TOCAR:
    //
    // 1. RETRY SALE POR setTimeout — NO llamada directa recursiva.
    //    Motivo: regla P10 CLAUDE.md (sprint deadlock-fix 2026-08-28).
    //    El callback de onAuthStateChange corre DENTRO del lock del SDK
    //    Supabase Auth. Cualquier trabajo async al mismo cliente (queries
    //    de datos que necesitan token) provoca deadlock circular: re-adquirir
    //    lock que el callback tiene tomado, encolar en pendingInLock, jamás
    //    resolver. El setTimeout(fn, 0) — o cualquier delay > 0 — encola el
    //    hydrate como MACROTASK: el callback retorna sync, el lock se libera,
    //    y el hydrate corre FUERA del lock. Sacar el setTimeout y llamar
    //    hydrateFromSession(session, attempt+1) directo reintroduce el deadlock.
    //    Es el mismo mecanismo de PIEZA 1 del sprint deadlock-fix — no confundir
    //    con la PIEZA 2 (guard del ref, que se conserva por otra razón — ver #2).
    //
    // 2. hydratedUserIdRef NO SE TOCA en el catch.
    //    Motivo: el ref protege contra el LOOP DEL SIGNED_IN SILENTE del SDK
    //    (token refresh cada ~50 min, foco de tab, etc. — el SDK re-emite
    //    SIGNED_IN sin cambio de sesión real). El contador de retries protege
    //    contra el LOOP DEL MISMO ERROR. Son DOS problemas distintos con dos
    //    mecanismos distintos. Si alguien los fusiona después (ej. "limpiar
    //    el ref en el catch para que un SIGNED_IN posterior re-intente"),
    //    reabre uno de los dos loops según el fallo sea persistente o
    //    transitorio. Cero acoplamiento entre ambos.
    //
    // 3. CLEANUP con retryTimeoutRef + mountedRef.
    //    El setTimeout del retry puede dispararse después de que el árbol
    //    se desmontó (navegación a otra página que reset el provider en
    //    dev con StrictMode, cambio de user que remonta, etc.). Si el
    //    setState de un componente desmontado corriera, React tira warning
    //    y el trabajo se pierde. Guardar el timeout id en un ref permite
    //    cancelarlo en el cleanup del useEffect de mount. El mountedRef
    //    es cinturón adicional para el edge case donde el timeout ya
    //    disparó pero la callback todavía no corrió.
    //
    // OBSERVABILIDAD (TEMPORAL, remover antes del merge a main):
    //   console.log/error con prefix `[UserContext hydrate]` en cada
    //   attempt, retry schedule y exhaustion. Le permite al smoke ver
    //   exactamente qué attempt está corriendo. Sprint role-degradation
    //   C4 (Sentry) reemplaza estos logs con captureMessage + tag para
    //   filtrar en dashboard prod. Los console.log se sacan cuando C4
    //   aterrice.
    // ═══════════════════════════════════════════════════════════════════════
    const MAX_RETRIES = 3;
    const RETRY_BACKOFF_MS = [500, 2000, 8000] as const;
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef<boolean>(true);

    // ═══════════════════════════════════════════════════════════════════════
    // SPRINT deadlock-fix (2026-08-28) — DEADLOCK POR REENTRADA EN LOCK AUTH
    // ═══════════════════════════════════════════════════════════════════════
    //
    // CAUSA RAÍZ (verificada empíricamente por PO 2026-08-28 con setSession
    // + stack trace + timeout de las dos queries del Promise.all):
    //
    //   El handler de onAuthStateChange corre DENTRO del lock que el SDK
    //   Supabase Auth adquiere para operaciones que emiten eventos (setSession,
    //   refreshSession, autoRefresh, etc.). Ver
    //   node_modules/@supabase/auth-js/dist/main/GoTrueClient.js: setSession →
    //   _acquireLock → _setSession → _notifyAllSubscribers('SIGNED_IN').
    //
    //   Hacer trabajo async al mismo cliente supabase dentro del callback
    //   (queries de datos) provoca DEADLOCK CIRCULAR:
    //     - Las queries llaman fetchWithAuth → _getAccessToken → auth.getSession
    //     - auth.getSession llama _acquireLock → detecta lockAcquired=true →
    //       encola en pendingInLock → NUNCA resuelve porque el lock exterior
    //       está esperando a que las queries terminen.
    //
    //   Antipatrón oficial documentado por Supabase (issue #762): "Never use
    //   any async supabase call inside the callback of onAuthStateChange".
    //
    // POR QUÉ NOP APLICA a hydrate #1 (Canal 1 sano): se dispara desde
    //   supabase.auth.getSession().then(hydrateFromSession) — el .then corre
    //   DESPUÉS de que el lock se libera. Las queries hijas re-adquieren lock
    //   fresh sin conflicto.
    //
    // POR QUÉ NO SIRVIÓ el noOpLock preexistente: reemplaza this.lock
    //   (primitiva Web Locks vs no-op) pero NO evita la lógica lockAcquired +
    //   pendingInLock que corre igual con cualquier implementación de lock.
    //   Cierra un cuelgue distinto (Web Locks huérfanos), la reentrada queda
    //   abierta.
    //
    // FIX (2 piezas con roles DISTINTOS — no confundir):
    //
    //   PIEZA 1 — setTimeout(fn, 0) — CIERRA EL DEADLOCK (fix estructural).
    //     Encolar el hydrate como MACROTASK hace que el callback retorne
    //     sync, el lock del SDK se libere, y hydrateFromSession corra FUERA
    //     del lock. Las queries hijas re-adquieren lock fresh. Cero reentrada.
    //     Patrón oficial recomendado por Supabase auth-js.
    //     Si esto se saca, VUELVE EL BUG. No es opcional.
    //
    //   PIEZA 2 — hydratedUserIdRef guard — OPTIMIZACIÓN (NO protección).
    //     Evita re-hidratar cuando el SDK dispara SIGNED_IN silente para la
    //     misma sesión ya hidratada (comportamiento no documentado del SDK,
    //     precedente CLAUDE.md 2026-08-25 con SessionTimeout). Ahorra 2
    //     queries + re-render del árbol cada vez que el SDK re-emite.
    //     Si se saca esto, el deadlock SIGUE cerrado (PIEZA 1 lo cubre) —
    //     solo hay trabajo redundante. El guard NO reemplaza a la PIEZA 1.
    //
    // REF (no state) porque el handler de onAuthStateChange puede correr
    // entre renders y el state estar stale (race entre hydrate exitoso y
    // handler del próximo evento). Ref se actualiza en el mismo tick que
    // setUser, cero divergencia esperada — cualquier consumer que necesite
    // saber "qué user está actualmente hidratado" usa el ref.
    //
    // LIMPIEZA DEL REF (obligatoria en 3 puntos, para no bloquear re-login
    // legítimo con la misma cuenta):
    //   1. hydrateFromSession con !session?.user (guest) — resetea a null.
    //   2. Case SIGNED_OUT del handler — resetea a null.
    //   3. softReset (logout voluntario) — resetea a null.
    // ═══════════════════════════════════════════════════════════════════════
    const hydratedUserIdRef = useRef<string | null>(null);

    const roles = profile?.roles || ['usuario']; // Default to usuario

    // Calculate Onboarding Status
    const calculateOnboardingStatus = (u: any, p: UserProfile | null): OnboardingStep => {
        if (!u) return 'COMPLETE'; // Guest doesn't have onboarding per se

        // 1. Profile Exists
        if (!p) return 'PROFILE_BASIC';

        // 2. Basic Fields
        if (!p.nombre || !p.apellido_p) return 'PROFILE_BASIC';

        // 3. Roles Selected
        if (!p.roles || p.roles.length === 0) return 'ROLE_SELECTED';

        return 'COMPLETE';
    };

    const hydrateFromSession = async (session: any, attempt: number = 0) => {
        if (!session?.user) {
            // Sprint deadlock-fix — limpia el ref para que re-login futuro con
            // la misma cuenta post-guest hidrate (guard de identidad no bloquee).
            hydratedUserIdRef.current = null;
            // Sprint role-degradation C2 — cancelar cualquier retry pending.
            // Escenario: user logueado, queries del hydrate fallaron, retry
            // scheduled → user hace logout antes de que el retry dispare.
            // Sin cancelar, el retry corre hydrateFromSession(sessionVieja,
            // attempt+1) que hace setUser(session.user) con la sesión vieja
            // → user deslogueado queda con user!=null hasta que el retry se
            // agote. Bug sutil pero real.
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }
            setUser(null);
            setProfile(null);
            setProveedorRow(null);
            setActiveRole(null);
            setHasSeekerProfile(false);
            setProviderStatus('none');
            setOnboardingStatus('COMPLETE');
            setIsLoading(false);
            return;
        }

        // Session is valid — set user immediately
        setUser(session.user);
        // Sprint deadlock-fix — actualizar el ref en el MISMO tick que setUser.
        // El guard del case SIGNED_IN lee este ref para skipear hydrates
        // redundantes cuando el SDK dispara SIGNED_IN silente para la misma
        // sesión. Actualizamos ANTES del try/catch del Promise.all para que,
        // aunque las queries fallen, un SIGNED_IN silente subsecuente igual
        // se skipee (evita reintentos en loop del mismo hydrate ya fallido).
        hydratedUserIdRef.current = session.user.id;

        // 2. Profile queries — failure here should NOT log the user out.
        // Las dos queries son independientes (ambas filtran por session.user.id
        // y no consumen output mutuo) → Promise.all colapsa los dos round-trips
        // a la latencia del mas lento, no la suma. Antes eran secuenciales con
        // el await en serie y costaban 2x el RTT a Supabase en el path critico
        // de login.
        try {
            // Trae el row completo de proveedores para dedupar el fetch que
            // antes corria /proveedor/index.tsx checkProviderStatus. La carga
            // extra (cols completas vs 6) es despreciable; el round-trip que
            // ahorramos en Fase C del path critico NO lo es.
            const [proveedorRes, seekerRes] = await Promise.all([
                supabase
                    .from('proveedores')
                    .select('*')
                    .eq('auth_user_id', session.user.id)
                    .maybeSingle(),
                supabase
                    .from('usuarios_buscadores')
                    .select('id, nombre')
                    .eq('auth_user_id', session.user.id)
                    .maybeSingle(),
            ]);
            const proveedorData = proveedorRes.data;
            const seekerData = seekerRes.data;
            setProveedorRow(proveedorData ?? null);

            // Sprint orphan-fix (2026-08-18) — guard huérfano.
            // Auth activa + cero perfiles en ambas tablas = huérfano.
            // Redirigimos a /completar-registro para que el usuario elija
            // rol y complete su perfil. Solo si NO estamos ya en una ruta
            // "orphan-safe" (evita loops y permite navegación de tránsito).
            // Cubre TODAS las vías de entrada: Google OAuth, Auth API
            // pública Supabase, rollback fallido de /api/auth/signup, o
            // cualquier futura vía que cree auth.users sin perfil. Reemplaza
            // el rollback frágil de email-confirmado.tsx que llamaba
            // signOut() sin poder borrar auth.users.
            if (!proveedorData && !seekerData) {
                const currentPath = router.asPath;
                if (!isOrphanSafeRoute(currentPath)) {
                    router.replace(`/completar-registro?from=${encodeURIComponent(currentPath)}`);
                    // NO retornamos aquí — dejamos que el estado se hidrate
                    // como huérfano para que la página /completar-registro
                    // vea `user` disponible cuando aterrice.
                }
            }

            const hasApprovedProvider = proveedorData?.estado === 'aprobado';
            const statusOfProvider = proveedorData ? proveedorData.estado : 'none';
            const hasSeeker = !!seekerData;

            // Reconstruir un perfil general para compatibilidad
            let finalProfile: UserProfile | null = null;
            if (proveedorData) {
                finalProfile = {
                    nombre: proveedorData.nombre,
                    apellido_p: proveedorData.apellido_p,
                    roles: proveedorData.roles || ['proveedor'],
                    foto_perfil: proveedorData.foto_perfil,
                    aprobado: proveedorData.estado === 'aprobado'
                };
            } else if (seekerData) {
                finalProfile = {
                    nombre: seekerData.nombre,
                    apellido_p: '',
                    roles: ['usuario'],
                    aprobado: true
                };
            }

            const status = calculateOnboardingStatus(session.user, finalProfile);

            // Sprint role-degradation C2 — hydrate exitoso, cancelar retry
            // pending de intentos anteriores (defensivo — puede haber un
            // retry en cola de un hydrate previo del mismo o de otro user
            // si canal 2 disparó SIGNED_IN entre medio).
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }

            setProfile(finalProfile);
            setOnboardingStatus(status);
            setProviderStatus(statusOfProvider as 'none' | 'pendiente' | 'aprobado');

            // Expone si el usuario tiene perfil tutor — reemplaza al legacy
            // `canSwitchMode` (que solo era true si tenia AMBOS). Los items del
            // dropdown del header ahora se derivan directamente por rol.
            setHasSeekerProfile(hasSeeker);

            // --- Set activeRole Logic (legacy, para RoleSelectionInterceptor
            // y GoogleAuthButton / login). Se deriva del rol disponible mas
            // especifico: proveedor aprobado > usuario. Sin fallback a
            // localStorage porque el toggle Usuario/Ofreciendo (que era la
            // unica fuente que escribia pawnecta_active_mode) fue removido.
            if (finalProfile) {
                const validRoles = finalProfile.roles || ['usuario'];

                // Set Admin Role Dynamically from DB, NO HARDCODED EMAILS.
                if (proveedorData?.roles?.includes('admin') && proveedorData?.estado === 'aprobado') {
                    if (!validRoles.includes('admin')) {
                        validRoles.push('admin');
                    }
                }

                if (hasApprovedProvider) setActiveRole('proveedor');
                else setActiveRole('usuario');
            }

        } catch (err: any) {
            // Profile query failed — KEEP the user logged in, just with minimal state.
            // Sprint role-degradation C2 (2026-09-01) — retry in-place con contador
            // + backoff [500ms, 2s, 8s]. Ver comentario extenso donde se declaran
            // MAX_RETRIES y retryTimeoutRef. Sacar el setTimeout de acá reabre el
            // deadlock (regla P10). Limpiar el hydratedUserIdRef acá reabre el
            // loop del SIGNED_IN silente (sprint deadlock-fix PIEZA 2).
            console.error(
                `[UserContext hydrate] attempt ${attempt} failed:`,
                err?.message ?? err
            );
            setProfile(null);
            setProveedorRow(null);
            setHasSeekerProfile(false);
            setProviderStatus('none');

            if (attempt < MAX_RETRIES) {
                const backoffMs = RETRY_BACKOFF_MS[attempt];
                console.log(
                    `[UserContext hydrate] scheduling retry ${attempt + 1}/${MAX_RETRIES} in ${backoffMs}ms`
                );
                // Cancelar timeout previo si existía (defensivo — no debería
                // pasar, pero si dos hydrates entran en catch en paralelo, no
                // queremos dos setTimeouts corriendo).
                if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = setTimeout(() => {
                    retryTimeoutRef.current = null;
                    // Chequeo mounted defensivo por si el timeout disparó
                    // después del unmount (ej. cambio de user que remonta
                    // el provider). Sin este check, un setState post-unmount
                    // tira warning y el trabajo se pierde.
                    if (!mountedRef.current) return;
                    hydrateFromSession(session, attempt + 1);
                }, backoffMs);
            } else {
                console.log(
                    `[UserContext hydrate] exhausted after ${attempt + 1} attempts — user stays degraded until manual reload (C3 aviso pendiente)`
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;
        // Sprint role-degradation C2 — mountedRef espejo del `mounted` local
        // para que el setTimeout del retry (fuera del scope del useEffect)
        // pueda chequearlo. React StrictMode dispara mount→unmount→remount:
        // seteamos en true acá para que el remount arranque en buen estado
        // aunque el cleanup previo lo haya dejado en false.
        mountedRef.current = true;

        // Canal 1: lectura inicial sincrónica. Sin Promise.race ni timeout —
        // el noOpLock (lib/supabaseClient.ts) garantiza que getSession()
        // resuelve sin colgarse en Web Locks orphaned.
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (mounted) hydrateFromSession(session);
        });

        // Canal 2: cambios futuros. INITIAL_SESSION intencionalmente fuera
        // del switch — ya cubierto por el getSession() inicial. Doble
        // hidratación evitada.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;
                switch (event) {
                    case 'SIGNED_IN': {
                        // ═══════════════════════════════════════════════════
                        // SPRINT deadlock-fix (2026-08-28) — FIX EN 2 PIEZAS.
                        // Ver comentario extenso donde se declara
                        // hydratedUserIdRef. NO CONFUNDIR:
                        //   PIEZA 1 (setTimeout) — CIERRA EL DEADLOCK.
                        //   PIEZA 2 (guard) — OPTIMIZACIÓN, NO protección.
                        // Sacar la PIEZA 1 pensando que el guard alcanza
                        // reintroduce el bug.
                        // ═══════════════════════════════════════════════════

                        // PIEZA 2 — Guard de identidad (optimización).
                        // Skipea trabajo redundante cuando el SDK emite
                        // SIGNED_IN silente para la misma sesión ya hidratada.
                        // Cero relación con el fix del deadlock.
                        if (session?.user?.id && session.user.id === hydratedUserIdRef.current) {
                            break;
                        }

                        // PIEZA 1 — setTimeout(fn, 0) CIERRA EL DEADLOCK.
                        // Encolar como macrotask hace que el callback retorne
                        // sync → lock del SDK se libera → hydrateFromSession
                        // corre FUERA del lock → sus queries hijas
                        // (auth.getSession internamente) re-adquieren lock
                        // fresco sin conflicto. Antipatrón oficial Supabase.
                        setTimeout(() => {
                            // Chequeo mounted DENTRO del macrotask: el
                            // componente puede haberse desmontado entre el
                            // callback y la ejecución de este setTimeout.
                            // Sin este check corremos setState sobre árbol
                            // desmontado (React warnings + posible leak).
                            if (!mounted) return;
                            hydrateFromSession(session);
                        }, 0);
                        break;
                    }
                    case 'TOKEN_REFRESHED':
                        // No re-hidratar perfil (overhead innecesario).
                        break;
                    case 'SIGNED_OUT': {
                        // Sprint deadlock-fix — limpiar el ref ANTES de
                        // hidrate(null) para que un re-login con la MISMA
                        // cuenta post-logout hidrate (guard de identidad
                        // no bloquee: T3 de tests aceptación PO 2026-08-28).
                        hydratedUserIdRef.current = null;
                        // NOTA: hydrateFromSession(null) NO llama a supabase
                        // (early return del path guest hace solo setState).
                        // Cero riesgo de reentrada aunque el callback corra
                        // dentro del lock del SDK. Se mantiene await sync
                        // (a diferencia del SIGNED_IN que sí necesita
                        // setTimeout porque sus queries reentran al lock).
                        await hydrateFromSession(null);
                        // Voluntary logout: logout()/softReset() prendio la bandera
                        // y ya se encarga del redirect. Reset y salir.
                        if (isVoluntaryLogoutRef.current) {
                            isVoluntaryLogoutRef.current = false;
                            break;
                        }
                        // No-voluntary: token expiro o otra tab cambio de sesion
                        // (cross-fire dual-cuenta — ver CLAUDE.md > Testing con
                        // multiples cuentas). Redirigimos solo si el usuario esta
                        // en una ruta protegida — evitamos el redirect brusco en
                        // paginas publicas donde el guest puede seguir navegando.
                        const currentPath = router.asPath;
                        if (isProtectedPath(currentPath)) {
                            router.push(`/login?reason=expired&redirect=${encodeURIComponent(currentPath)}`);
                        }
                        break;
                    }
                    // INITIAL_SESSION: NO handler. Ya cubierto por getSession() arriba.
                }
            }
        );

        return () => {
            mounted = false;
            mountedRef.current = false;
            // Sprint role-degradation C2 — cancelar el retry pending si el
            // provider se desmonta antes de que dispare. Sin esto, el retry
            // arrancaría un hydrate sobre árbol muerto → setState en componente
            // desmontado (React warning) + trabajo perdido.
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }
            subscription.unsubscribe();
        };
    }, []);

    const switchRole = (role: Role) => {
        if (roles.includes(role)) {
            setActiveRole(role);
            window.localStorage.setItem('activeRole', role);
            if (role === 'proveedor') router.push('/proveedor');
            else if (role === 'admin') router.push('/admin');
            else router.push('/explorar');
        }
    };

    const activateProviderMode = () => {
        console.log("activateProviderMode called");
    };

    const refreshProfile = async () => {
        setIsLoading(true);
        const { data } = await supabase.auth.getSession();
        await hydrateFromSession(data?.session ?? null);
    };

    // refreshProveedorRow: re-fetch puntual del row de proveedores para
    // refrescar el cache del context tras una mutacion (ej. saveProfile en
    // el dashboard). No re-corre la hidratacion completa para no resetear
    // otros estados sin necesidad. Si el user no esta logueado, no-op.
    const refreshProveedorRow = async () => {
        if (!user?.id) return;
        const { data } = await supabase
            .from('proveedores')
            .select('*')
            .eq('auth_user_id', user.id)
            .maybeSingle();
        setProveedorRow(data ?? null);
    };

    // softReset: limpia estado + localStorage + signOut SIN forzar redirect.
    // Lo usa el caller cuando ya tiene un destino propio (ej. safety redirect
    // en /proveedor que va a /login con redirect=...). Logout completo seguia
    // con window.location.href = '/' y comia el destino del caller.
    const softReset = async () => {
        // Prende bandera ANTES del signOut para que el handler de SIGNED_OUT
        // lo lea como voluntario y no dispare el redirect a /login?reason=expired.
        isVoluntaryLogoutRef.current = true;
        // Sprint deadlock-fix — limpiar el ref para que re-login con la
        // misma cuenta post-logout voluntario hidrate (guard de identidad
        // no bloquee: T3 de tests aceptación PO 2026-08-28).
        hydratedUserIdRef.current = null;
        // Sprint role-degradation C2 — cancelar retry pending por si el
        // softReset se llamó durante un retry del hydrate anterior.
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }
        setUser(null);
        setProfile(null);
        setProveedorRow(null);
        setActiveRole(null);
        setHasSeekerProfile(false);
        setProviderStatus('none');

        window.localStorage.removeItem('activeRole');
        window.localStorage.removeItem('pm_auth_role_pending');
        window.localStorage.removeItem('pawnecta_pending_role');

        await supabase.auth.signOut();
    };

    const logout = async () => {
        await softReset();
        // Redirect con window.location para forzar recarga completa
        window.location.href = '/';
    };

    return (
        <UserContext.Provider value={{
            user,
            profile,
            proveedorRow,
            refreshProveedorRow,
            roles,
            activeRole,
            hasSeekerProfile,
            providerStatus,
            onboardingStatus,
            isLoading,
            isAuthenticated: !!user,
            activateProviderMode,
            switchRole,
            refreshProfile,
            logout,
            softReset
        }}>
            {children}
        </UserContext.Provider>
    );
}

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserContextProvider');
    }
    return context;
};
