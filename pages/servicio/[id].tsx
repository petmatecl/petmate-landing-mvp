import { GetServerSideProps } from 'next';
import { supabase } from '../../lib/supabaseClient';
import { mapRpcToServiceResult } from '../../lib/serviceMapper';
import { ServiceResult } from '../../components/Explore/ServiceCard';
import ServiceDetailView from '../../components/Servicio/ServiceDetailView';

interface ServiceDetailProps {
    service: any;
    reviews: any[];
    otrosServicios: ServiceResult[];
}

export default function ServicioPage(props: ServiceDetailProps) {
    return <ServiceDetailView {...props} />;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { id } = context.params as { id: string };

    try {
        // Fetch Service details
        const { data: service, error: serviceError } = await supabase
            .from('servicios_publicados')
            .select(`
                *,
                proveedores!inner(
                    id, auth_user_id, nombre, apellido_p, nombre_publico, rut_verificado, foto_perfil, comuna,
                    mostrar_whatsapp, mostrar_telefono, mostrar_email, telefono, email_publico, created_at,
                    tipo_entidad, razon_social, nombre_fantasia, giro, anios_experiencia,
                    certificaciones, sitio_web, instagram, primera_ayuda, galeria, perfil_completo, bio
                ),
                categorias_servicio!inner(
                    nombre, slug, icono
                )
            `)
            .eq('id', id)
            .eq('activo', true)
            .eq('proveedores.estado', 'aprobado')
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

        // Fetch Reviews
        const { data: reviews, error: reviewsError } = await supabase
            .from('evaluaciones')
            .select(`
                *,
                usuarios_buscadores(nombre)
            `)
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
