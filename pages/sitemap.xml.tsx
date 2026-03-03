import { GetServerSideProps } from "next";
import { supabase } from "../lib/supabaseClient";

const STATIC_ROUTES = [
    "/", "/explorar", "/quienes-somos",
    "/hospedaje", "/guarderia-diurna", "/paseo",
    "/visita-domicilio", "/peluqueria", "/adiestramiento",
    "/veterinaria", "/traslado",
];

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
    const { data: proveedores } = await supabase
        .from("proveedores")
        .select("comunas_cobertura")
        .eq("estado", "aprobado");

    const categorias = [
        "hospedaje", "guarderia-diurna", "paseo", "visita-domicilio",
        "peluqueria", "adiestramiento", "veterinaria", "traslado",
    ];

    const comunas = new Set<string>();
    proveedores?.forEach(p => {
        if (Array.isArray(p.comunas_cobertura)) {
            p.comunas_cobertura.forEach((c: string) =>
                comunas.add(c.toLowerCase().replace(/ /g, "-"))
            );
        }
    });

    const dinamicas = categorias.flatMap(cat =>
        Array.from(comunas).map(com => `/${cat}/${com}`)
    );

    const allRoutes = [...STATIC_ROUTES, ...dinamicas];
    const urls = allRoutes
        .map(r => `  <url><loc>https://pawnecta.com${r}</loc></url>`)
        .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.setHeader("Content-Type", "text/xml");
    res.write(xml);
    res.end();

    return { props: {} };
};

export default function Sitemap() { return null; }
