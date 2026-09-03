// ============================================================================
// components/Shared/HydrationToast.tsx
// ----------------------------------------------------------------------------
// Sprint role-degradation C3 (2026-09-03) — aviso al usuario cuando el
// hydrate del perfil está reintentando o falló definitivamente.
//
// SEPARACIÓN DE RESPONSABILIDADES:
//   - UserContext expone `hydrationState: 'ok' | 'retrying' | 'failed'`
//     (side-effect free, cero conocimiento de la UI de aviso).
//   - Este componente OBSERVA el state via useUser() y dispara toasts
//     de sonner según transiciones. Si mañana cambiamos de sonner a
//     otra librería, o migramos a banner sticky, se toca solo este file.
//
// TRANSICIONES:
//   'ok'       → toast.dismiss(TOAST_ID)          (no-op si no existía)
//   'retrying' → toast.warning('Reintentando...') (duration Infinity)
//   'failed'   → toast.warning('No pudimos...')   (con botón Recargar)
//
// El toast USA SIEMPRE el mismo `id`. Sonner UPDATE el toast existente
// en vez de crear uno nuevo → transición 'retrying' → 'failed' cambia
// texto in-place sin flash.
//
// CIERRE MANUAL POR EL USUARIO (precisión B del PO 2026-09-03):
//   `closeButton: true` habilita la X que sonner renderea nativo. El
//   user que decide seguir navegando degradado puede cerrar el toast y
//   listo. No re-aparece hasta que `hydrationState` CAMBIE de valor
//   (useEffect depende de hydrationState — cerrar sonner no cambia el
//   state). Si transiciona a 'failed' desde 'retrying', el toast
//   re-aparece con el nuevo texto porque el useEffect se re-dispara
//   por cambio del dep. Correcto: es un mensaje nuevo, no un spam.
//
// RECUPERACIÓN SILENCIOSA (requisito 1 del PO 2026-09-03):
//   Si el retry pesca (path exitoso post Promise.all en UserContext),
//   `setHydrationState('ok')` se llama → useEffect dispara
//   `toast.dismiss(TOAST_ID)` → toast desaparece sin acción del user.
//
// RESET ENTRE SESIONES (precisión A del PO 2026-09-03):
//   El reset a 'ok' vive en el UserContext en 4 puntos: (a) al inicio
//   de un hydrate nuevo (attempt=0), (b) en el path guest de
//   hydrateFromSession (cubre SIGNED_OUT), (c) en el path exitoso, y
//   (d) en softReset (logout voluntario). Ver comentarios in-place
//   en UserContext.tsx.
// ============================================================================

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useUser } from '../../contexts/UserContext';

const TOAST_ID = 'role-degradation';

export default function HydrationToast() {
    const { hydrationState } = useUser();

    useEffect(() => {
        if (hydrationState === 'retrying') {
            toast.warning('Reintentando cargar tus datos...', {
                id: TOAST_ID,
                duration: Infinity,
                closeButton: true,
            });
        } else if (hydrationState === 'failed') {
            toast.warning(
                'No pudimos cargar todos tus datos. Puede que veas menos opciones de las habituales.',
                {
                    id: TOAST_ID,
                    duration: Infinity,
                    closeButton: true,
                    action: {
                        label: 'Recargar',
                        onClick: () => window.location.reload(),
                    },
                }
            );
        } else {
            // 'ok' — dismiss del toast si estaba visible. No-op si no existía.
            toast.dismiss(TOAST_ID);
        }
    }, [hydrationState]);

    // Componente sin UI propia — el efecto vive en los toasts que dispara.
    return null;
}
