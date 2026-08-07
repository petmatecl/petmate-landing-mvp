import { GetServerSideProps } from "next";
import { supabase } from "../lib/supabaseClient";

const STATIC_ROUTES = [
    "/", "/explorar", "/blog", "/faq", "/terminos", "/privacidad",
];

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
    // Fetch approved providers — la vista proveedores_publicos solo expone
    // aprobados por diseño (mismo patrón que /servicio/[id].tsx gSSP).
    const { data: proveedores, error: proveedoresError } = await supabase
        .from("proveedores_publicos")
        .select("id, updated_at");

    // Fetch active services (PL1-C, Sprint PRELAUNCH-1): además del filtro
    // activo=true, cruzamos con la vista proveedores_publicos para excluir
    // servicios cuyo proveedor no está aprobado. Sin este cruce, el sitemap
    // publica URLs que el gSSP responde con notFound:true → Google reindexa
    // 404s. La vista solo expone aprobados → filtro en memoria por proveedor_id.
    const { data: servicios, error: serviciosError } = await supabase
        .from("servicios_publicados")
        .select("id, updated_at, proveedor_id")
        .eq("activo", true);

    // Sweep #1 fix B2 (2026-08-07) — FAIL-LOUD:
    // Si cualquiera de los 2 fetches falla o retorna null, el sitemap SIN el
    // dataset completo NO debe servir XML "válido pero vacío" con 200 OK.
    // El bug pre-fix era: `|| []` colapsaba silencioso → sitemap con solo 6
    // STATIC_ROUTES + Cache-Control s-maxage=3600 → Google recrawls, sees
    // shrunken sitemap, drops previously-indexed /servicio/* + /proveedor/*
    // → catástrofe SEO silente por ≥1h. Fix: retornar HTTP 500 SIN
    // Cache-Control cacheable, que la CDN + Google no persistan el error.
    // El próximo crawl retornará al sitemap completo.
    if (proveedoresError || serviciosError || proveedores === null || servicios === null) {
        const errorSummary = [
            proveedoresError && `proveedores_publicos: ${proveedoresError.message}`,
            serviciosError && `servicios_publicados: ${serviciosError.message}`,
            proveedores === null && !proveedoresError && "proveedores fetch returned null",
            servicios === null && !serviciosError && "servicios fetch returned null",
        ].filter(Boolean).join(" | ");
        console.error(`[sitemap] fetch failure — aborting sitemap generation:`, errorSummary);
        res.setHeader("Content-Type", "text/plain");
        // Cache-Control: no-store — asegurar que la CDN NO cachee el error.
        // Recovery: próximo crawl regenera cuando la DB responda.
        res.setHeader("Cache-Control", "no-store");
        res.statusCode = 500;
        res.write(`Sitemap generation failed: ${errorSummary}`);
        res.end();
        return { props: {} };
    }

    const proveedoresAprobadosIds = new Set(proveedores.map(p => p.id));
    const serviciosPublicables = servicios.filter(
        s => proveedoresAprobadosIds.has(s.proveedor_id)
    );

    const now = new Date().toISOString().split('T')[0];

    let urls = STATIC_ROUTES.map(r =>
        `  <url><loc>https://pawnecta.com${r}</loc><lastmod>${now}</lastmod><priority>${r === '/' ? '1.0' : '0.7'}</priority></url>`
    );

    // Provider profiles (todos los aprobados).
    urls = urls.concat(proveedores.map(p =>
        `  <url><loc>https://pawnecta.com/proveedor/${p.id}</loc><lastmod>${(p.updated_at || now).split('T')[0]}</lastmod><priority>0.8</priority></url>`
    ));

    // Service pages — solo servicios activos de proveedores aprobados.
    urls = urls.concat(serviciosPublicables.map(s =>
        `  <url><loc>https://pawnecta.com/servicio/${s.id}</loc><lastmod>${(s.updated_at || now).split('T')[0]}</lastmod><priority>0.9</priority></url>`
    ));

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "text/xml");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate");
    res.write(xml);
    res.end();

    return { props: {} };
};

export default function Sitemap() { return null; }
