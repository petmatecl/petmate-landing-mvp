import { GetServerSideProps } from 'next';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { mapRpcToServiceResult } from '../../lib/serviceMapper';
import { fetchProveedoresPublicosByIds } from '../../lib/supabase/queries/proveedoresPublicos';
import { ServiceResult } from '../../components/Explore/ServiceCard';
import ServiceDetailView from '../../components/Servicio/ServiceDetailView';
import { useTrackVisit } from '../../lib/hooks/useTrackVisit';
import { trackEvent } from '../../lib/gtag';

interface ServiceDetailProps {
    service: any;
    reviews: any[];
    otrosServicios: ServiceResult[];
    // Rediseno Commit 4: rating global del proveedor (todas sus evaluaciones,
    // no solo este servicio) para la tarjeta resumen Zona B.
    globalRatingPromedio: number;
    globalTotalEvaluaciones: number;
}

export default function ServicioPage(props: ServiceDetailProps) {
    const isExample = props.service?.proveedores?.es_ejemplo === true;
    useTrackVisit('servicio', props.service?.id, props.service?.proveedores?.auth_user_id);
    // Sprint ANALYTICS-1: ficha_vista — trigger canónico del funnel demanda,
    // params {servicio_id, categoria} según taxonomía PO. Fire una vez al
    // mount de la ficha (que el gSSP ya resolvió → service.id existe).
    // Servicios EJEMPLO NO cuentan (data ruidosa para el dashboard prod).
    // Gate PL2: no-op silencioso en staging/preview/dev.
    useEffect(() => {
        if (isExample) return;
        if (!props.service?.id) return;
        trackEvent('ficha_vista', {
            servicio_id: props.service.id,
            categoria: props.service.categorias_servicio?.slug || '(desconocida)',
        });
    }, [isExample, props.service?.id, props.service?.categorias_servicio?.slug]);
    return <ServiceDetailView {...props} isExample={isExample} />;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { id } = context.params as { id: string };

    try {
        // Fetch Service details. El embed proveedores!inner(...) se reemplaza
        // por hidratacion via vista proveedores_publicos (post-RLS fix junio 2026
        // — PostgREST no puede materializar el embed contra la tabla base).
        // El filtro original .eq('proveedores.estado','aprobado') queda implicito
        // porque la vista solo expone aprobados (si el proveedor no esta en la
        // vista → service.proveedores = null → redirect a /explorar).
        const { data: service, error: serviceError } = await supabase
            .from('servicios_publicados')
            .select(`
                *,
                proveedor_id,
                categorias_servicio!inner(
                    nombre, slug, icono
                )
            `)
            .eq('id', id)
            .eq('activo', true)
            .maybeSingle();

        if (serviceError || !service) {
            // PL1-A + PL1-B1 (Sprint PRELAUNCH-1): servicio inexistente/inactivo es
            // caso ESPERADO (bots crawleando UUIDs viejos de servicios retirados) —
            // no un error de app. Log a nivel info sin volcar `null` colgando.
            // Retornamos notFound:true (HTTP 404) en vez de redirect 307 →
            // rompe el ciclo de 307-fantasmas que Google reindexa perpetuamente.
            if (serviceError) {
                console.warn(`[servicio/${id}] fetch error:`, serviceError.message);
            } else {
                console.info(`[servicio/${id}] no encontrado o inactivo → 404`);
            }
            return { notFound: true };
        }

        // Hidratacion del proveedor desde la vista publica.
        const provMap = await fetchProveedoresPublicosByIds(
            [service.proveedor_id],
            `id, auth_user_id, nombre, apellido_p, nombre_publico, rut_verificado, foto_perfil, comuna,
             mostrar_whatsapp, mostrar_telefono, mostrar_email, telefono, email_publico, created_at,
             tipo_entidad, razon_social, nombre_fantasia, giro, anios_experiencia,
             certificaciones, sitio_web, instagram, primera_ayuda, galeria, perfil_completo, bio, es_ejemplo`,
        );
        const proveedorHidratado = provMap.get(service.proveedor_id) ?? null;
        if (!proveedorHidratado) {
            // Equivalente al !inner original + filtro estado='aprobado' del embed
            // anterior. Si el proveedor no esta aprobado, la ficha no se muestra.
            // PL1-B1: mismo tratamiento que servicio inexistente — 404 en vez de
            // redirect 307, para no perpetuar el ciclo de 307-fantasmas.
            console.info(`[servicio/${id}] proveedor no aprobado → 404`);
            return { notFound: true };
        }
        // Preservar el shape original: service.proveedores (key plural como
        // estaba en el embed) — el render usa props.service.proveedores.X.
        (service as any).proveedores = proveedorHidratado;

        // Fetch Reviews de este servicio (para el hero + Zona C).
        const { data: reviews, error: reviewsError } = await supabase
            .from('evaluaciones')
            .select('*')
            .eq('servicio_id', id)
            .eq('estado', 'aprobado')
            .order('created_at', { ascending: false });

        // Rediseno Commit 4: rating global del proveedor (todas sus evaluaciones,
        // no solo este servicio) para la tarjeta resumen Zona B. Query separada
        // porque `reviews` de arriba filtra por servicio_id.
        const { data: reviewsGlobalProv } = await supabase
            .from('evaluaciones')
            .select('rating')
            .eq('proveedor_id', service.proveedor_id)
            .eq('estado', 'aprobado');
        let globalRatingPromedio = 0;
        let globalTotalEvaluaciones = 0;
        if (reviewsGlobalProv && reviewsGlobalProv.length > 0) {
            globalTotalEvaluaciones = reviewsGlobalProv.length;
            globalRatingPromedio = reviewsGlobalProv.reduce((acc, r: any) => acc + r.rating, 0) / globalTotalEvaluaciones;
        }

        // Fetch servicios similares: misma categoría, misma comuna, distinto proveedor
        const categoriaSlug = service.categorias_servicio?.slug;
        const comuna = service.proveedores?.comuna;
        const proveedorId = service.proveedores?.id;
        let otrosServicios: ServiceResult[] = [];

        if (categoriaSlug && comuna) {
            const { data: similarRaw } = await supabase.rpc('buscar_servicios', {
                p_categoria_slug: categoriaSlug,
                p_comuna: comuna,
                p_limit: 6,
                p_offset: 0,
            });

            otrosServicios = (similarRaw || [])
                .filter((s: any) => s.proveedor_id !== proveedorId && s.id !== id)
                .slice(0, 3)
                .map(mapRpcToServiceResult);
        }

        return {
            props: {
                service,
                reviews: reviews || [],
                otrosServicios,
                globalRatingPromedio,
                globalTotalEvaluaciones,
            }
        };

    } catch (e) {
        console.error("Error en getServerSideProps de servicio", e);
        return {
            redirect: {
                destination: '/explorar',
                permanent: false,
            },
        };
    }
};
