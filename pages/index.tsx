import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useId, useRef, useEffect } from "react";
import { mapJoinToServiceResult } from "../lib/serviceMapper";
import { ServiceResult } from "../components/Explore/ServiceCard";
import { COMUNAS_CHILE } from "../lib/comunas";
import {
  Home, Sun, Footprints, MapPin, Scissors, Award, Stethoscope, Car, Camera,
  ShieldCheck, UserCheck, MessageCircle, Search, FileText, UserPlus, PlusCircle, Users,
  BadgeCheck, Sparkles, ChevronLeft, ChevronRight
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { fetchProveedoresPublicosByIds } from "../lib/supabase/queries/proveedoresPublicos";
import { toast } from "sonner";

import SearchBar from "../components/Home/SearchBar";
import StepCard from "../components/Home/StepCard";
// Sprint home-carrusel punto 4 (2026-11-12): HomeVisitorCounter removido
// del render con la eliminación de la SECCIÓN 7. El fetch del valor
// `totalVisitasMes` se mantiene en getStaticProps por si otras secciones
// futuras lo reutilizan sin re-escribir la query.
import ServicePlaceholderCard from "../components/Explore/ServicePlaceholderCard";

// ─── PrelaunchDemandCapture ─────────────────────────────────────────────────
function PrelaunchDemandCapture() {
  const [email, setEmail] = useState('');
  const [comuna, setComuna] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      const res = await fetch('/api/waitlist/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, comuna, rol: 'tutor' }),
      });
      const data = await res.json();

      if (data.ok) {
        setDone(true);
      } else {
        toast.error('No pudimos guardar tu correo, intenta de nuevo');
      }
    } catch (err) {
      toast.error('No pudimos guardar tu correo, intenta de nuevo');
    }
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 border-y border-slate-200">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-semibold text-slate-900 tracking-tight mb-4">Sé el primero en enterarte</h2>
        <p className="text-slate-600 max-w-xl mx-auto mb-8">
          Estamos activando proveedores en cada categoría y comuna. Deja tu correo y te avisamos cuando haya opciones disponibles cerca tuyo.
        </p>

        {done ? (
          <div className="bg-accent-50 border border-accent-200 rounded-2xl px-8 py-10">
            <p className="text-accent-800 font-semibold text-lg">¡Listo! Te avisamos en cuanto haya proveedores en tu zona.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <input
              type="email"
              required
              placeholder="Tu correo electrónico"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="flex-1 h-12 px-4 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 placeholder:text-slate-400 transition-colors"
            />
            <select
              value={comuna}
              onChange={e => setComuna(e.target.value)}
              className="h-12 px-4 border border-slate-200 rounded-xl bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 transition-colors"
            >
              <option value="">Mi comuna...</option>
              {COMUNAS_CHILE.slice(0, 20).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              type="submit"
              className="h-12 px-6 bg-accent-600 hover:bg-accent-700 text-white font-semibold rounded-xl transition-colors text-sm shrink-0"
            >
              Avisarme
            </button>
          </form>
        )}
        <p className="text-xs text-slate-400 mt-4">Sin spam. Solo te contactamos cuando tengamos proveedores disponibles.</p>
      </div>
    </section>
  );
}

const FALLBACK_HOME: Record<string, string> = {
  cuidado: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&auto=format&fit=crop&q=70",
  // Aliases backwards-compat: servicios legacy con categoria_slug viejo
  // siguen renderizando imagen mientras el SQL de re-clasificacion no
  // se haya aplicado todavia en BD.
  hospedaje: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&auto=format&fit=crop&q=70",
  domicilio: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=400&auto=format&fit=crop&q=70",
  guarderia: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&auto=format&fit=crop&q=70",
  paseos: "https://images.unsplash.com/photo-1601979031925-424e53b6caaa?w=400&auto=format&fit=crop&q=70",
  peluqueria: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=400&auto=format&fit=crop&q=70",
  adiestramiento: "https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=400&auto=format&fit=crop&q=70",
  veterinario: "https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=400&auto=format&fit=crop&q=70",
  traslado: "https://images.unsplash.com/photo-1544568100-847a948585b9?w=400&auto=format&fit=crop&q=70",
  default: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&auto=format&fit=crop&q=70",
};

// ─── Shared card ─────────────────────────────────────────────────────────────
function ServiceCardItem({ s }: { s: any }) {
  const foto = (s.fotos && s.fotos.length > 0) ? s.fotos[0]
    : s.proveedor_foto || FALLBACK_HOME[s.categoria_slug] || FALLBACK_HOME['default'];
  return (
    <a
      href={`/servicio/${s.servicio_id ?? s.id}`}
      className="group cursor-pointer bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col h-full"
    >
      <div className="w-full h-44 overflow-hidden bg-slate-100 relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={foto}
          alt={s.titulo}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            const fallback = FALLBACK_HOME[s.categoria_slug] || FALLBACK_HOME['default'];
            if (img.src !== fallback) img.src = fallback;
          }}
        />
        {s.categoria_nombre && (
          <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-medium text-slate-700 max-w-[60%] truncate">
            {s.categoria_nombre}
          </div>
        )}
        {s.total_evaluaciones > 0 ? (
          <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold text-slate-700 shadow-sm flex items-center gap-1">
            <svg className="w-3 h-3 text-amber-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            {Number(s.rating_promedio).toFixed(1)}
            <span className="text-slate-500 font-normal">({s.total_evaluaciones})</span>
          </div>
        ) : (
          <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full text-[10px] font-medium text-slate-400 shadow-sm">
            Sin reseñas aún
          </div>
        )}
        {s.destacado && (
          <div className="absolute top-2.5 left-2.5 bg-amber-400 text-amber-900 text-[10px] font-medium px-2 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 shadow-sm">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            Destacado
          </div>
        )}
        {s.proveedor_es_ejemplo && (
          <div
            title="Este es un proveedor de ejemplo, no real. Regístrate para publicar tu servicio."
            aria-label="Proveedor de ejemplo"
            className="absolute bottom-2.5 left-2.5 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-medium px-2 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 shadow-sm"
          >
            <Sparkles size={10} aria-hidden="true" /> Ejemplo
          </div>
        )}
        {s.proveedor_perfil_completo && (
          <div title="Perfil completo" aria-label="Perfil completo" className="absolute bottom-2.5 right-2.5 bg-accent-50 text-accent-800 border border-accent-200 w-7 h-7 rounded-full flex items-center justify-center shadow-sm">
            <BadgeCheck size={14} aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <p className="text-sm font-semibold text-slate-900 line-clamp-2 min-h-[2.5em] leading-snug group-hover:text-accent-600 transition-colors mb-1">
          {s.titulo}
        </p>
        {s.proveedor_nombre && (
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 rounded-full overflow-hidden bg-accent-100 shrink-0 flex items-center justify-center">
              {s.proveedor_foto ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={s.proveedor_foto} alt={s.proveedor_nombre} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[9px] font-semibold text-accent-700">{s.proveedor_nombre.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <p className="text-xs text-slate-500 truncate">{s.proveedor_nombre}</p>
          </div>
        )}
        {s.proveedor_comuna && (
          <p className="text-xs text-slate-400 truncate">{s.proveedor_comuna}</p>
        )}
        {s.precio_desde > 0 && (
          <p className="text-sm font-semibold text-slate-900 mt-auto pt-3 border-t border-slate-100">
            ${s.precio_desde.toLocaleString('es-CL')}
            <span className="text-xs font-normal text-slate-400"> /{s.unidad_precio}</span>
          </p>
        )}
      </div>
    </a>
  );
}

// ─── Horizontal carousel helper (sprint home-carrusel 2026-11-12) ─────────────
// Scroll horizontal con snap + flechas con estado disabled en extremos.
// Keyboard: ArrowLeft/ArrowRight scrollea un ancho de card. Swipe mobile
// nativo del browser. Scrollbar oculta por CSS inline (Tailwind no tiene
// clase estándar). Placeholder va al final de los children.
function HorizontalScroller({ children, ariaLabel }: { children: React.ReactNode; ariaLabel: string }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canPrev, setCanPrev] = useState(false);
    const [canNext, setCanNext] = useState(false);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const update = () => {
            setCanPrev(el.scrollLeft > 4);
            setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
        };
        update();
        el.addEventListener('scroll', update, { passive: true });
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => { el.removeEventListener('scroll', update); ro.disconnect(); };
    }, [children]);

    const scrollByCard = (dir: 1 | -1) => {
        const el = scrollRef.current;
        if (!el) return;
        const card = el.children[0] as HTMLElement | undefined;
        const w = card?.clientWidth ?? 300;
        el.scrollBy({ left: dir * (w + 16), behavior: 'smooth' });
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); scrollByCard(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); scrollByCard(1); }
    };

    return (
        <div className="relative">
            <div
                ref={scrollRef}
                role="group"
                aria-label={ariaLabel}
                tabIndex={0}
                onKeyDown={onKeyDown}
                className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded-xl"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {children}
            </div>
            {/* Scrollbar hide WebKit */}
            <style jsx>{`div[role="group"]::-webkit-scrollbar { display: none; }`}</style>
            {/* Flechas: solo visibles con contenido excedente. En mobile se ocultan
                — el swipe nativo cubre la UX. */}
            <button
                type="button"
                onClick={() => scrollByCard(-1)}
                disabled={!canPrev}
                aria-label={`Anterior en ${ariaLabel}`}
                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-md items-center justify-center text-slate-700 hover:bg-slate-50 disabled:opacity-0 disabled:pointer-events-none transition-opacity z-10"
            >
                <ChevronLeft size={20} strokeWidth={2.2} aria-hidden="true" />
            </button>
            <button
                type="button"
                onClick={() => scrollByCard(1)}
                disabled={!canNext}
                aria-label={`Siguiente en ${ariaLabel}`}
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-md items-center justify-center text-slate-700 hover:bg-slate-50 disabled:opacity-0 disabled:pointer-events-none transition-opacity z-10"
            >
                <ChevronRight size={20} strokeWidth={2.2} aria-hidden="true" />
            </button>
        </div>
    );
}

// Clase estándar de card del carrusel: shrink-0 + snap-start + ancho fijo
// consistente entre FranjaDual y FranjaCategoria. 280 px mobile, 300 px
// sm+ para caber ~3-4 cards en lg antes de recortar.
const CAROUSEL_CARD_CLS = 'shrink-0 snap-start w-[280px] sm:w-[300px]';

/**
 * Orden canónico de las tarjetas del carrusel del home.
 *
 * Sprint home-carrusel punto 2 (PO 2026-11-12):
 *   1. Proveedores con identidad verificada primero (`proveedor_verificado`).
 *   2. Servicios con foto Y descripción completas (foto >=1, descripción
 *      > 20 chars) sobre los que falte alguno.
 *   3. Más recientes primero dentro de cada grupo (`created_at desc`).
 *
 * Decisión documentada para poder ajustar post-launch sin arqueología:
 * ver BACKLOG entry `CAROUSEL-RANK` para iteración futura (ej. boost de
 * reviews altas, service featured, A/B test).
 *
 * Sort estable (Array.prototype.sort estable desde ES2019).
 */
function rankForCarousel<T extends { proveedor_verificado?: boolean; fotos?: string[]; descripcion?: string; created_at?: string }>(list: T[]): T[] {
    return [...list].sort((a, b) => {
        const av = a.proveedor_verificado ? 1 : 0;
        const bv = b.proveedor_verificado ? 1 : 0;
        if (av !== bv) return bv - av;
        const ac = ((a.fotos?.length ?? 0) > 0 && (a.descripcion?.length ?? 0) > 20) ? 1 : 0;
        const bc = ((b.fotos?.length ?? 0) > 0 && (b.descripcion?.length ?? 0) > 20) ? 1 : 0;
        if (ac !== bc) return bc - ac;
        const at = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bt - at;
    });
}

/** Tope de tarjetas por franja. PO 2026-11-12: subir de 4 a 8. */
const CAROUSEL_MAX = 8;

// ─── Dual category block: 2 categories merged, grid layout, no scroll ─────────
function FranjaDual({
  titulo, IconA, IconB, serviciosA, serviciosB, slugA, slugB,
  onVerTodosA, onVerTodosB, labelA, labelB,
  onVerMas,
}: {
  titulo: string; IconA: any; IconB: any;
  serviciosA: any[]; serviciosB: any[];
  slugA: string; slugB: string;
  onVerTodosA: () => void; onVerTodosB: () => void;
  labelA: string; labelB: string;
  onVerMas: () => void;
}) {
  const titleId = useId();
  // Interleave A, B, A, B hasta CAROUSEL_MAX (8). Luego rankForCarousel
  // aplica el orden canónico (verificado > completo > reciente).
  const interleaved: any[] = [];
  let ai = 0, bi = 0;
  while (interleaved.length < CAROUSEL_MAX && (ai < serviciosA.length || bi < serviciosB.length)) {
    if (ai < serviciosA.length) interleaved.push(serviciosA[ai++]);
    if (interleaved.length < CAROUSEL_MAX && bi < serviciosB.length) interleaved.push(serviciosB[bi++]);
  }
  const combined = rankForCarousel(interleaved);
  const total = serviciosA.length + serviciosB.length;
  if (total === 0) return null;

  return (
    <section aria-labelledby={titleId} className="bg-slate-50 py-3 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <IconA className="w-5 h-5 text-slate-400" />
                <IconB className="w-4 h-4 text-accent-600" />
              </div>
              <h2 id={titleId} className="text-base font-semibold text-slate-900">{titulo}</h2>
              <span className="text-xs text-slate-400 font-medium">
                {total} disponible{total !== 1 ? 's' : ''}
              </span>
              {/* Sprint home-carrusel punto 1 (PO 2026-11-12): botón flecha
                  redondo reemplazado por link "Ver todos →" para no
                  confundirse con las flechas prev/next del carrusel. */}
              <span className="text-xs text-slate-300" aria-hidden="true">·</span>
              <Link
                href={`/explorar?categoria=${slugA},${slugB}`}
                className="text-xs font-semibold text-accent-700 hover:text-accent-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded"
                aria-label={`Ver todos los servicios de ${titulo}`}
              >
                Ver todos →
              </Link>
            </div>
          </div>
          {/* Sprint home-carrusel (2026-11-12) — grid → scroll horizontal
              una fila + flechas con estado + swipe mobile. Placeholder
              ausente va al FINAL del scroll (no en celda vacía). */}
          <HorizontalScroller ariaLabel={titulo}>
            {combined.map((s: any, i: number) => (
              <div key={`${s.servicio_id ?? s.id}-${i}`} className={CAROUSEL_CARD_CLS}>
                <ServiceCardItem s={s} />
              </div>
            ))}
            {serviciosA.length === 0 && (
              <div key={`placeholder-${slugA}`} className={CAROUSEL_CARD_CLS}>
                <ServicePlaceholderCard categoriaSlug={slugA} variant="compact" />
              </div>
            )}
            {serviciosB.length === 0 && (
              <div key={`placeholder-${slugB}`} className={CAROUSEL_CARD_CLS}>
                <ServicePlaceholderCard categoriaSlug={slugB} variant="compact" />
              </div>
            )}
          </HorizontalScroller>
        </div>
      </div>
    </section>
  );
}

// ─── Single-category fallback (grid, no scroll) ───────────────────────────────
function FranjaCategoria({
  categoria, servicios, onVerTodos,
}: {
  categoria: { slug: string; nombre: string; Icon: any };
  servicios: any[];
  onVerTodos: () => void;
}) {
  const titleId = useId();
  // Sprint home-carrusel punto 2: hasta CAROUSEL_MAX (8) con ranking.
  const visible = rankForCarousel(servicios).slice(0, CAROUSEL_MAX);
  if (visible.length === 0) return null;
  return (
    <section aria-labelledby={titleId} className="bg-slate-50 py-3 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <categoria.Icon className="w-5 h-5 text-slate-400" />
              <h2 id={titleId} className="text-base font-semibold text-slate-900">{categoria.nombre}</h2>
              <span className="text-xs text-slate-400 font-medium">
                {servicios.length} disponible{servicios.length !== 1 ? 's' : ''}
              </span>
              {/* Sprint home-carrusel punto 1 (PO 2026-11-12): flecha redonda
                  reemplazada por link "Ver todos →". */}
              <span className="text-xs text-slate-300" aria-hidden="true">·</span>
              <Link
                href={`/explorar?categoria=${categoria.slug}`}
                className="text-xs font-semibold text-accent-700 hover:text-accent-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded"
                aria-label={`Ver todos los servicios de ${categoria.nombre}`}
              >
                Ver todos →
              </Link>
            </div>
          </div>
          {/* Sprint home-carrusel (2026-11-12) — scroll horizontal una fila. */}
          <HorizontalScroller ariaLabel={categoria.nombre}>
            {visible.map((s: any, i: number) => (
              <div key={`${s.servicio_id ?? s.id}-${i}`} className={CAROUSEL_CARD_CLS}>
                <ServiceCardItem s={s} />
              </div>
            ))}
          </HorizontalScroller>
        </div>
      </div>
    </section>
  );
}


interface HomePageProps {
  featuredServices: any[];
  stats: {
    servicios: number;
    proveedores: number;
    comunas: number;
    categorias: number;
  };
  categoryCounts: Record<string, number>;
  totalVisitasMes: number;
}

export default function HomePage({ featuredServices, stats, categoryCounts, totalVisitasMes }: HomePageProps) {
  const router = useRouter();

  const categoriasEstaticas = [
    { slug: 'cuidado', nombre: 'Cuidado y Hospedaje', descripcion: 'En tu casa, en la del cuidador o en un recinto', Icon: Home },
    { slug: 'guarderia', nombre: 'Guardería diurna', descripcion: 'Cuidado profesional durante el día', Icon: Sun },
    { slug: 'paseos', nombre: 'Paseo', descripcion: 'Paseos individuales o grupales cerca', Icon: Footprints },
    { slug: 'peluqueria', nombre: 'Peluquería', descripcion: 'Baño, corte y estética especializada', Icon: Scissors },
    { slug: 'adiestramiento', nombre: 'Adiestramiento', descripcion: 'Entrenamiento y corrección conductual', Icon: Award },
    { slug: 'veterinario', nombre: 'Veterinaria', descripcion: 'Consultas y atención médica cercana', Icon: Stethoscope },
    { slug: 'traslado', nombre: 'Traslado', descripcion: 'Transporte seguro para tu mascota', Icon: Car },
    { slug: 'fotografia', nombre: 'Fotografía', descripcion: 'Sesiones fotográficas profesionales para tu mascota', Icon: Camera },
  ].map(cat => ({
    ...cat,
    count: categoryCounts[cat.slug] ?? 0,
    estado: ((categoryCounts[cat.slug] ?? 0) > 0 ? 'activa' : 'proxima') as 'activa' | 'proxima',
  }));

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>Pawnecta — Marketplace de servicios para mascotas</title>
        <meta name="description" content="Encuentra paseadores, cuidadores y veterinarios cerca de ti. Busca por comuna y contacta directo. Gratis en lanzamiento." />
        <link rel="canonical" href="https://pawnecta.com" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pawnecta.com" />
        <meta property="og:title" content="Pawnecta — Marketplace de servicios para mascotas" />
        <meta property="og:description" content="Encuentra paseadores, cuidadores y veterinarios cerca de ti." />
        <meta property="og:image" content="https://pawnecta.com/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Pawnecta — Marketplace de servicios para mascotas" />
        <meta name="twitter:description" content="Proveedores en tu comuna." />
        <meta name="twitter:image" content="https://pawnecta.com/og-image.jpg" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Pawnecta",
              "url": "https://pawnecta.com",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://pawnecta.com/explorar?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </Head>

      {/* ═══════════════════════════════════════════
          SECCIÓN 1 — HERO
          fondo slate-50, dos columnas
      ═══════════════════════════════════════════ */}
      <section className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20
                        flex flex-col lg:flex-row items-center gap-10">

          {/* Texto + buscador */}
          <div className="flex-1 max-w-xl w-full">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900
                           leading-tight tracking-tight mb-4">
              Servicios para tu mascota,{" "}
              <span className="text-accent-700">cerca de ti</span>
            </h1>
            <p className="text-lg text-slate-500 mb-8">
              Encuentra a alguien de confianza para tu mascota, en tu barrio.
            </p>
            <SearchBar variant="hero" />
            <p className="text-sm text-slate-500 mt-4">
              ¿Ofreces servicios para mascotas?{" "}
              <Link href="/register?rol=proveedor"
                className="text-accent-700 font-semibold hover:underline">
                Publica gratis →
              </Link>
            </p>
          </div>

          {/* Imagen */}
          {/* Sprint PERF-1 Bucket C (2026-08-07) — H5 baseline: home
              wasted image bytes 835 KB. El container es max-w-lg (~512px)
              con h-64 mobile / h-[400px] lg. Servir w=900 era ~2× el
              tamaño necesario. Fix: w=640 (nítido incluso en retina 2×
              del container real) + q=75 (calidad indistinguible vs q=80
              a este tamaño). Reduce ~40-50% del peso del hero.
              fetchpriority="high" refuerza LCP prioridad (H5 no lo tenía
              — Bucket A del sprint lo trae por default en el ficha; en
              el home también aplica). */}
          <div className="flex-1 w-full max-w-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=640&auto=format&fit=crop&q=75"
              alt="Mascota con su dueña"
              className="w-full h-64 lg:h-[400px] object-cover rounded-3xl shadow-xl"
              // @ts-expect-error React 18 fetchpriority en <img>: prop existe en el DOM.
              fetchpriority="high"
              onError={(e) => {
                const HERO_FALLBACKS = [
                  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=640&auto=format&fit=crop&q=75",
                  "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=640&auto=format&fit=crop&q=75",
                ];
                const img = e.currentTarget as HTMLImageElement;
                const tried = Number(img.dataset.fallbackIndex ?? 0);
                if (tried < HERO_FALLBACKS.length) {
                  img.dataset.fallbackIndex = String(tried + 1);
                  img.src = HERO_FALLBACKS[tried];
                }
              }}
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECCIÓN 2 — FRANJAS POR CATEGORÍA (pares)
          Sprint home-carrusel (2026-11-12): subida antes de
          "Por qué confiar" (swap de orden) — las franjas van
          primero porque son el acceso directo al catálogo; el
          bloque de confianza pasa a servir de refuerzo DESPUÉS
          de ver los servicios reales.
      ═══════════════════════════════════════════ */}
      {(() => {
        if (!featuredServices || featuredServices.length === 0) return <PrelaunchDemandCapture />;
        const por: Record<string, any[]> = {};
        featuredServices.forEach((s: any) => {
          const slug = s.categoria_slug || 'default';
          if (!por[slug]) por[slug] = [];
          if (por[slug].length < 10) por[slug].push(s);
        });
        const get = (slug: string) => por[slug] || [];
        const totalAll = featuredServices.length;
        if (totalAll === 0) return <PrelaunchDemandCapture />;

        const pairs: Array<{
          titulo: string; IconA: any; IconB: any;
          slugA: string; slugB: string; labelA: string; labelB: string;
        }> = [
            { titulo: 'Cuidado y Guardería', IconA: Home, IconB: Sun, slugA: 'cuidado', slugB: 'guarderia', labelA: 'Cuidado y Hospedaje', labelB: 'Guardería' },
            { titulo: 'Paseos y Adiestramiento', IconA: Footprints, IconB: Award, slugA: 'paseos', slugB: 'adiestramiento', labelA: 'Paseos', labelB: 'Adiestramiento' },
            { titulo: 'Veterinario y Peluquería', IconA: Stethoscope, IconB: Scissors, slugA: 'veterinario', slugB: 'peluqueria', labelA: 'Veterinario', labelB: 'Peluquería' },
            { titulo: 'Traslado y Fotografía', IconA: Car, IconB: Camera, slugA: 'traslado', slugB: 'fotografia', labelA: 'Traslado', labelB: 'Fotografía' },
          ];

        return (
          <div className="bg-white">
            {pairs.map((p) => {
              const sA = get(p.slugA);
              const sB = get(p.slugB);
              if (sA.length + sB.length === 0) return null;
              return (
                <FranjaDual
                  key={`${p.slugA}-${p.slugB}`}
                  titulo={p.titulo}
                  IconA={p.IconA}
                  IconB={p.IconB}
                  serviciosA={sA}
                  serviciosB={sB}
                  slugA={p.slugA}
                  slugB={p.slugB}
                  labelA={p.labelA}
                  labelB={p.labelB}
                  onVerTodosA={() => router.push(`/explorar?categoria=${p.slugA}`)}
                  onVerTodosB={() => router.push(`/explorar?categoria=${p.slugB}`)}
                  onVerMas={() => router.push(`/explorar?categoria=${p.slugA},${p.slugB}`)}
                />
              );
            })}
          </div>
        );
      })()}


      {/* ═══════════════════════════════════════════
          SECCIÓN 2.5 — POR QUÉ CONFIAR EN PAWNECTA
          Sprint home-carrusel (2026-11-12): movida de ANTES de las
          franjas (sección 1.5 pre-sprint) a DESPUÉS de las franjas.
          Lógica: usuario ve primero los servicios reales, luego
          encuentra el refuerzo de confianza.
      ═══════════════════════════════════════════ */}
      <section aria-labelledby="trust-heading" className="bg-white py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-100">
        <div className="max-w-6xl mx-auto">
          <h2 id="trust-heading" className="text-3xl md:text-4xl font-semibold text-slate-900 text-center mb-12 tracking-tight">
            Por qué confiar en Pawnecta
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                Icon: ShieldCheck,
                titulo: 'Identidad verificable',
                desc: 'Los proveedores pueden verificar su identidad con RUT y mostrar una insignia en su ficha',
              },
              {
                Icon: BadgeCheck,
                titulo: 'Sin comisión en el lanzamiento',
                desc: 'No cobramos comisión; lo que acuerdas con el proveedor queda entre ustedes',
              },
              {
                Icon: MessageCircle,
                titulo: 'Contacto directo',
                desc: 'Coordinas y pagas directamente con el proveedor, sin intermediarios',
              },
            ].map(({ Icon, titulo, desc }) => (
              <div key={titulo} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-50 text-accent-600 mb-4">
                  <Icon size={26} strokeWidth={1.75} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{titulo}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECCIÓN 3 — GRID DE CATEGORÍAS (acceso secundario)
          Compacto, cerca del final — patrón ML
      ═══════════════════════════════════════════ */}
      <section className="bg-white border-y border-slate-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-5">Explorar por categoría</h2>
          <div className="flex flex-wrap gap-3">
            {categoriasEstaticas.map((cat) => {
              const isProxima = cat.estado === 'proxima';
              return (
                <button
                  key={cat.slug}
                  onClick={() => !isProxima && router.push(`/explorar?categoria=${cat.slug}`)}
                  disabled={isProxima}
                  className={`
                    inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-semibold
                    transition-all duration-200
                    ${isProxima
                      ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-accent-600 hover:text-accent-600 hover:bg-accent-50 hover:shadow-sm cursor-pointer'
                    }
                  `}
                >
                  <cat.Icon className={`w-4 h-4 ${isProxima ? 'text-slate-300' : 'text-accent-600'}`} />
                  {cat.nombre}
                  {!isProxima && cat.count > 0 && (
                    <span className="text-[11px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                      {cat.count}
                    </span>
                  )}
                  {isProxima && (
                    <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Pronto</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sprint HOME-VERDAD (2026-11-10) — sección "Proveedores que puedes
          conocer" + condicional stats + "Únete a nuestra red de proveedores"
          eliminadas enteras por decisión PO: contenía afirmaciones falsas
          (verificación obligatoria / revisión manual del equipo / reseñas
          reales) + testimonios ficticios. El CTA de proveedores sigue
          cubierto por la sección "Ofrece tus servicios en Pawnecta" más
          abajo.

          Sprint home-carrusel punto 4 (PO 2026-11-12): sección 4 "Cómo
          funciona (dueños) — Encuentra al proveedor ideal en minutos"
          ELIMINADA (recorte home). Orden final del home: hero → franjas
          → Por qué confiar → Explorar por categoría → Ofrece tus
          servicios → footer. El rediseño completo del home sigue
          post-lanzamiento. */}

      {/* ═══════════════════════════════════════════
          SECCIÓN 6 — CÓMO FUNCIONA (PROVEEDORES) — sin cambios
      ═══════════════════════════════════════════ */}
      <section aria-label="Cómo funciona para proveedores" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900 relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <p className="text-accent-500 font-medium uppercase tracking-widest text-xs mb-3">Para proveedores</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">Ofrece tus servicios en Pawnecta</h2>
            <p className="text-slate-300 mt-4 text-lg">Visibilidad en búsquedas en tu comuna</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <StepCard paso={1} titulo="Crea tu perfil" descripcion="Regístrate, verifica tu identidad y completa tu información profesional" Icon={UserPlus} variante="dark" />
            <StepCard paso={2} titulo="Publica tus servicios" descripcion="Describe lo que ofreces, define tu precio y activa tu vitrina" Icon={PlusCircle} variante="dark" />
            <StepCard paso={3} titulo="Recibe consultas directo" descripcion="Los dueños te contactan por el chat interno y tú coordinas todo" Icon={Users} variante="dark" />
          </div>
          <div className="text-center flex flex-col items-center">
            <Link href="/register?rol=proveedor"
              className="inline-flex items-center justify-center h-14 rounded-2xl border-2 border-white px-8 text-base font-semibold text-white hover:bg-white/10 transition-colors shadow-lg shadow-black/20">
              Publicar mi servicio
            </Link>
            <p className="mt-4 text-slate-500 text-sm">Sin costo de registro</p>
          </div>
        </div>
      </section>

      {/* Sprint home-carrusel punto 4 (PO 2026-11-12): SECCIÓN 7
          "¿Buscas un servicio para tu mascota?" + CTA "Buscar servicios"
          + HomeVisitorCounter + "Pawnecta en cifras" ELIMINADA (recorte
          home). El acceso al catálogo ya vive en el hero + franjas +
          "Ver todos →" + grid de categorías, todas más arriba. El
          rediseño completo del home sigue post-lanzamiento. */}
    </div>
  );
}

export async function getStaticProps() {
  let featuredServices: ServiceResult[] = [];
  try {
    const { data } = await supabase
      .from('servicios_publicados')
      .select(`
        *,
        proveedor_id,
        categoria:categorias_servicio(nombre, icono, slug)
      `)
      .eq('activo', true)
      .order('created_at', { ascending: false })
      .limit(120);
    if (data) {
      // Hidratacion del proveedor desde proveedores_publicos (post-RLS fix).
      // El embed directo proveedor:proveedores(...) fallaria por permisos:
      // PostgREST materializa el join contra la tabla base (sin grant a anon
      // tras el sprint RLS junio 2026).
      const provMap = await fetchProveedoresPublicosByIds(
        data.map(s => s.proveedor_id),
        'id,nombre,apellido_p,foto_perfil,comuna,perfil_completo,es_ejemplo',
      );
      const merged = data.map(s => ({
        ...s,
        proveedor: provMap.get(s.proveedor_id) ?? null,
      }));
      const mapped = merged.map(mapJoinToServiceResult);
      featuredServices = [
        ...mapped.filter(s => s.fotos && s.fotos.length > 0),
        ...mapped.filter(s => !s.fotos || s.fotos.length === 0),
      ];
    }
  } catch (error) {
    console.error("Error fetching featured services:", error);
  }

  let countServicios = 0;
  let countProveedores = 0;
  let countCategorias = 0;
  let comunasUnicas = new Set<string>();

  try {
    const { count: sCount } = await supabase
      .from("servicios_publicados")
      .select("*", { count: "exact", head: true })
      .eq("activo", true);
    countServicios = sCount || 0;

    const { count: pCount } = await supabase
      .from("proveedores_publicos")
      .select("*", { count: "exact", head: true });
    countProveedores = pCount || 0;

    const { count: cCount } = await supabase
      .from("categorias_servicio")
      .select("*", { count: "exact", head: true });
    countCategorias = cCount || 0;

    const { data: comunasData } = await supabase
      .from("proveedores_publicos")
      .select("comunas_cobertura, comuna");

    if (comunasData) {
      comunasData.forEach(p => {
        const comunas = (Array.isArray(p.comunas_cobertura) && p.comunas_cobertura.length > 0)
          ? p.comunas_cobertura
          : (p.comuna ? [p.comuna] : []);
        comunas.forEach((c: string) => comunasUnicas.add(c));
      });
    }
  } catch (err) {
    console.error("Error fetching stats:", err);
  }

  const statsObj = {
    servicios: countServicios || 0,
    proveedores: countProveedores || 0,
    comunas: comunasUnicas.size || 0,
    categorias: countCategorias || 0,
  };

  // Total de visitas del mes en curso, sumado desde servicios activos.
  // Usamos servicios (no proveedores) para evitar doble conteo: un visitante
  // que ve servicio + perfil cuenta 2 veces si sumamos proveedores.
  // Suma en JS para no requerir un RPC nuevo (volumen actual: ~10s de filas).
  let totalVisitasMes = 0;
  try {
    const { data: visitasData } = await supabase
      .from('servicios_publicados')
      .select('visitas_mes')
      .eq('activo', true);
    if (visitasData) {
      totalVisitasMes = visitasData.reduce((acc, row) => acc + (row.visitas_mes ?? 0), 0);
    }
  } catch (err) {
    console.error("Error fetching total_visitas_mes:", err);
  }

  let categoryCounts: Record<string, number> = {};
  try {
    const { data: catData } = await supabase
      .from('servicios_publicados')
      .select('categoria:categorias_servicio(slug)')
      .eq('activo', true);
    if (catData) {
      catData.forEach((row: any) => {
        const slug = row.categoria?.slug;
        if (slug) categoryCounts[slug] = (categoryCounts[slug] ?? 0) + 1;
      });
    }
  } catch (err) {
    console.error('Error fetching category counts:', err);
  }

  return {
    props: {
      featuredServices,
      stats: statsObj,
      categoryCounts,
      totalVisitasMes,
    },
    revalidate: 30,
  };
}
