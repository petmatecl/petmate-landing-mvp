import { GetServerSideProps } from 'next';
import { supabase } from '../../lib/supabaseClient';
import { mapRpcToServiceResult } from '../../lib/serviceMapper';
import { fetchProveedoresPublicosByIds } from '../../lib/supabase/queries/proveedoresPublicos';
import { ServiceResult } from '../../components/Explore/ServiceCard';
import ServiceDetailView from '../../components/Servicio/ServiceDetailView';
import { useTrackVisit } from '../../lib/hooks/useTrackVisit';

interface ServiceDetailProps {
    service: any;
    reviews: any[];
    otrosServicios: ServiceResult[];
}

export default function ServicioPage(props: ServiceDetailProps) {
    const isExample = props.service?.proveedores?.es_ejemplo === true;
    useTrackVisit('servicio', props.service?.id, props.service?.proveedores?.auth_user_id);
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
            console.error("Servicio no encontrado o inactivo", serviceError);
            return {
                redirect: {
                    destination: '/explorar',
                    permanent: false,
                },
            };
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
            return {
                redirect: {
                    destination: '/explorar',
                    permanent: false,
                },
            };
        }
        // Preservar el shape original: service.proveedores (key plural como
        // estaba en el embed) — el render usa props.service.proveedores.X.
        (service as any).proveedores = proveedorHidratado;

        // Fetch Reviews
        const { data: reviews, error: reviewsError } = await supabase
            .from('evaluaciones')
            .select('*')
            .eq('servicio_id', id)
            .eq('estado', 'aprobado')
            .order('created_at', { ascending: false });

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
