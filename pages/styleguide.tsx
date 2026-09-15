import Head from "next/head";
import { Card } from "../components/Shared/Card";
import { Section } from "../components/Shared/Section";
import { Check, X, Briefcase, Search, MapPin } from "lucide-react";

// Pawnecta — Style Guide
// ----------------------------------------------------------------------------
// Página interna (noindex). Referencia consolidada del Sistema Visual v3
// vigente 2026-09-15 — capa marca (`accent`/`deep`) + capa estado
// (`success`/`danger`/`warning`/`info`). Post rewrite del sprint bloque-f.
//
// Historia: la versión anterior documentaba el sistema legacy con `emerald-700`
// como color de marca directo. La migración v3 (tailwind.config.js + UI_STANDARDS.md)
// alias `success-*` a emerald y designa `accent-*` (verde `#22C55E`) como token
// canónico de marca. Este archivo se reescribió para reflejar los tokens vivos.
//
// NO usar como demo de producto; solo como source of truth para devs.
// ----------------------------------------------------------------------------

const tocSections = [
    { id: "tipografia", label: "1. Tipografía" },
    { id: "paleta", label: "2. Paleta de texto" },
    { id: "accent", label: "3. Color de marca accent-600" },
    { id: "radius", label: "4. Border-radius" },
    { id: "body-pesos", label: "5. Body content — pesos correctos" },
    { id: "excepciones", label: "6. Excepciones documentadas" },
    { id: "antipatrones", label: "7. Anti-patrones" },
    { id: "componentes", label: "8. Componentes existentes" },
];

export default function StyleGuide() {
    return (
        <>
            <Head>
                <title>Pawnecta — Style Guide</title>
                <meta name="robots" content="noindex" />
            </Head>

            <div className="bg-slate-50 min-h-screen pb-24">
                {/* HEADER */}
                <header className="bg-slate-900 text-white py-12 px-8">
                    <div className="max-w-6xl mx-auto">
                        <h1 className="text-3xl font-bold tracking-tight text-white">
                            Style Guide — Sistema Visual Pawnecta
                        </h1>
                        <p className="mt-3 text-sm text-slate-300 max-w-2xl">
                            Referencia consolidada del Sistema Visual v3 vigente — capa marca
                            (<code className="text-accent-300">accent</code>/<code className="text-accent-300">deep</code>) +
                            capa estado (<code className="text-accent-300">success</code>/<code className="text-accent-300">danger</code>/<code className="text-accent-300">warning</code>/<code className="text-accent-300">info</code>).
                            Página interna (noindex). Última actualización: 2026-09-15 (sprint bloque-f, rewrite v3).
                        </p>
                    </div>
                </header>

                {/* TOC */}
                <nav className="max-w-6xl mx-auto px-8 mt-10 mb-12">
                    <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-4">Tabla de contenidos</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {tocSections.map((s) => (
                            <a key={s.id} href={`#${s.id}`} className="text-sm text-slate-700 hover:text-accent-600 transition-colors">
                                {s.label}
                            </a>
                        ))}
                    </div>
                </nav>

                <div className="max-w-6xl mx-auto px-8 space-y-20">

                    {/* ═══════════════════════════════════════════════════════════════
                        SECCIÓN 1 — TIPOGRAFÍA
                    ═══════════════════════════════════════════════════════════════ */}
                    <section id="tipografia" className="scroll-mt-8">
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">1. Tipografía</h2>
                        <p className="text-sm text-slate-500 mb-8">Fuente única: Outfit. Pesos disponibles: 400 (normal), 500 (medium), 600 (semibold), 700 (bold).</p>

                        <div className="space-y-6">

                            <TypoRow
                                label="Hero h1"
                                tw="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900"
                            >
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
                                    Servicios para tu mascota, <span className="text-accent-600">cerca de ti</span>
                                </h1>
                            </TypoRow>

                            <TypoRow
                                label="h1 página"
                                tw="text-3xl font-bold tracking-tight text-slate-900"
                            >
                                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mis favoritos</h1>
                            </TypoRow>

                            <TypoRow
                                label="h2 sección"
                                tw="text-2xl font-semibold tracking-tight text-slate-900"
                            >
                                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Servicios disponibles</h2>
                            </TypoRow>

                            <TypoRow
                                label="h3 / card title"
                                tw="text-lg font-semibold text-slate-900"
                            >
                                <h3 className="text-lg font-semibold text-slate-900">Hospedaje hogareño en Providencia</h3>
                            </TypoRow>

                            <TypoRow
                                label="Body"
                                tw="text-base text-slate-700"
                            >
                                <p className="text-base text-slate-700">
                                    Cuidamos a tu mascota como si fuera de la casa. Paseos diarios, alimentación
                                    según tu rutina y fotos durante el día.
                                </p>
                            </TypoRow>

                            <TypoRow
                                label="Body sm"
                                tw="text-sm text-slate-700"
                            >
                                <p className="text-sm text-slate-700">Texto secundario o descripciones cortas en cards.</p>
                            </TypoRow>

                            <TypoRow
                                label="Metadata"
                                tw="text-sm text-slate-500"
                            >
                                <p className="text-sm text-slate-500">Providencia · hace 3 meses</p>
                            </TypoRow>

                            <TypoRow
                                label="Label uppercase"
                                tw="text-xs font-medium uppercase tracking-widest text-slate-400"
                            >
                                <div className="flex gap-6">
                                    <span className="text-xs font-medium uppercase tracking-widest text-slate-400">DESDE</span>
                                    <span className="text-xs font-medium uppercase tracking-widest text-slate-400">MENÚ PRINCIPAL</span>
                                    <span className="text-xs font-medium uppercase tracking-widest text-slate-400">BUSCAR</span>
                                </div>
                            </TypoRow>

                            <TypoRow
                                label="Nav link"
                                tw="text-sm text-slate-500"
                            >
                                <div className="flex gap-6">
                                    <a className="text-sm text-slate-500 hover:text-accent-600">Blog</a>
                                    <a className="text-sm text-slate-500 hover:text-accent-600">Explorar servicios</a>
                                </div>
                            </TypoRow>

                            <TypoRow
                                label="Botón CTA primario"
                                tw="bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium tracking-wide rounded-lg px-4 py-2"
                            >
                                <button className="bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium tracking-wide rounded-lg px-4 py-2">
                                    Buscar servicios
                                </button>
                            </TypoRow>

                            <TypoRow
                                label="Sidebar item inactivo"
                                tw="text-sm font-medium text-slate-700 px-3 py-2 rounded-lg"
                            >
                                <div className="bg-white border border-slate-200 rounded-xl p-2 w-fit">
                                    <button className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg">
                                        <Briefcase size={16} className="text-slate-400" /> Mi Perfil
                                    </button>
                                </div>
                            </TypoRow>

                            <TypoRow
                                label="Sidebar item activo"
                                tw="text-sm font-semibold text-accent-600 bg-accent-50 px-3 py-2 rounded-lg"
                            >
                                <div className="bg-white border border-slate-200 rounded-xl p-2 w-fit">
                                    <button className="flex items-center gap-2 text-sm font-semibold text-accent-600 bg-accent-50 px-3 py-2 rounded-lg">
                                        <Briefcase size={16} className="text-accent-600" /> Mis Servicios
                                    </button>
                                </div>
                            </TypoRow>

                            <TypoRow
                                label="Display number (precio)"
                                tw="text-lg font-bold text-slate-900"
                            >
                                <p className="text-lg font-bold text-slate-900">$24.990</p>
                            </TypoRow>

                            <TypoRow
                                label="Display number (stat XL)"
                                tw="text-3xl md:text-4xl font-bold text-slate-900"
                            >
                                <p className="text-3xl md:text-4xl font-bold text-slate-900">12</p>
                            </TypoRow>

                        </div>

                        <p className="text-sm text-slate-500 mt-8 bg-slate-100 border border-slate-200 rounded-lg p-4">
                            <span className="font-medium text-slate-700">Nota:</span> Pesos disponibles 400/500/600/700. NO se usa 800 ni 900 — ver sección 6 (Excepciones).
                        </p>
                    </section>

                    {/* ═══════════════════════════════════════════════════════════════
                        SECCIÓN 2 — PALETA DE TEXTO
                    ═══════════════════════════════════════════════════════════════ */}
                    <section id="paleta" className="scroll-mt-8">
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">2. Paleta de texto</h2>
                        <p className="text-sm text-slate-500 mb-8">Cuatro niveles de gris. No usar slate-600 ni slate-800 (sin niveles intermedios).</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <PaletaSwatch
                                hex="#0F172A"
                                clase="text-slate-900"
                                uso="h1 / h2 / h3, títulos, display numbers"
                                sample="Texto Heading slate-900"
                            />
                            <PaletaSwatch
                                hex="#334155"
                                clase="text-slate-700"
                                uso="Párrafos, descripciones, values de formularios"
                                sample="Texto Body slate-700"
                            />
                            <PaletaSwatch
                                hex="#64748B"
                                clase="text-slate-500"
                                uso="Fechas, ubicaciones, breadcrumbs, texto secundario"
                                sample="Texto Metadata slate-500"
                            />
                            <PaletaSwatch
                                hex="#94A3B8"
                                clase="text-slate-400"
                                uso="Labels uppercase, placeholders de inputs"
                                sample="Texto Placeholder slate-400"
                            />
                        </div>
                    </section>

                    {/* ═══════════════════════════════════════════════════════════════
                        SECCIÓN 3 — COLOR DE MARCA EMERALD-700
                    ═══════════════════════════════════════════════════════════════ */}
                    <section id="accent" className="scroll-mt-8">
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">3. Color de marca accent-600</h2>
                        <p className="text-sm text-slate-500 mb-8">El color accent-600 ancla la identidad. Se restringe a 4 lugares específicos para preservar su peso visual.</p>

                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Permitido SOLO en estos 4 lugares:</h3>

                        <div className="space-y-6 mb-12">

                            {/* 1. CTA primario */}
                            <AccentExample
                                titulo="1. CTAs primarios"
                                descripcion="Botones bg-accent-600 — anchor de acción en cada página."
                            >
                                <button className="bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium tracking-wide rounded-lg px-4 py-2">
                                    Buscar servicios
                                </button>
                            </AccentExample>

                            {/* 2. Sidebar item activo */}
                            <AccentExample
                                titulo="2. Sidebar item activo"
                                descripcion="Background + texto en accent para indicar tab/sección activa."
                            >
                                <div className="bg-white border border-slate-200 rounded-xl p-2 w-fit space-y-1">
                                    <button className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg w-48">
                                        <Briefcase size={16} className="text-slate-400" /> Mi Perfil
                                    </button>
                                    <button className="flex items-center gap-2 text-sm font-semibold text-accent-600 bg-accent-50 px-3 py-2 rounded-lg w-48">
                                        <Briefcase size={16} className="text-accent-600" /> Mis Servicios
                                    </button>
                                    <button className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg w-48">
                                        <Briefcase size={16} className="text-slate-400" /> Evaluaciones
                                    </button>
                                </div>
                            </AccentExample>

                            {/* 3. Hover directorio SEO */}
                            <AccentExample
                                titulo="3. Hover de links del directorio SEO del Footer"
                                descripcion="Links de directorio comuna × categoría: idle slate-500, hover accent-600."
                            >
                                <ul className="space-y-2">
                                    <li>
                                        <a className="text-[13px] text-slate-500 hover:text-accent-600 transition-colors">Hospedaje en Providencia</a>
                                    </li>
                                    <li>
                                        <a className="text-[13px] text-slate-500 hover:text-accent-600 transition-colors">Paseadores en Las Condes</a>
                                    </li>
                                    <li>
                                        <a className="text-[13px] text-slate-500 hover:text-accent-600 transition-colors">Veterinario a domicilio en Ñuñoa</a>
                                    </li>
                                </ul>
                            </AccentExample>

                            {/* 4. Acentos hero excepción */}
                            <AccentExample
                                titulo="4. Acentos del hero del home (excepción documentada)"
                                descripcion="Span con palabra clave en hero, label PARA DUEÑOS y stats numéricos del home. Ver excepción 3 en sección 6."
                            >
                                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
                                    Servicios para tu mascota, <span className="text-accent-600">cerca de ti</span>
                                </h1>
                            </AccentExample>

                        </div>

                        {/* Anti-patrón */}
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Anti-patrón — NO usar en decoración</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <NoSiPair
                                no={
                                    <>
                                        <p className="text-sm text-slate-700 mb-2">Ícono decorativo en accent-600:</p>
                                        <MapPin size={20} className="text-accent-600" />
                                    </>
                                }
                                si={
                                    <>
                                        <p className="text-sm text-slate-700 mb-2">Ícono decorativo en slate-400 (neutro):</p>
                                        <MapPin size={20} className="text-slate-400" />
                                    </>
                                }
                            />
                            <NoSiPair
                                no={
                                    <>
                                        <p className="text-sm text-slate-700 mb-2">Checkmark en accent-600:</p>
                                        <Check size={20} className="text-accent-600" />
                                    </>
                                }
                                si={
                                    <>
                                        <p className="text-sm text-slate-700 mb-2">Checkmark en accent-500 (acento suave):</p>
                                        <Check size={20} className="text-accent-500" />
                                    </>
                                }
                            />
                            <NoSiPair
                                no={
                                    <>
                                        <p className="text-sm text-slate-700 mb-2">h3 fuera de contexto CTA en accent-600:</p>
                                        <h3 className="text-lg font-semibold text-accent-600">¿Por qué confiar en Pawnecta?</h3>
                                    </>
                                }
                                si={
                                    <>
                                        <p className="text-sm text-slate-700 mb-2">h3 en slate-900:</p>
                                        <h3 className="text-lg font-semibold text-slate-900">¿Por qué confiar en Pawnecta?</h3>
                                    </>
                                }
                            />
                        </div>
                    </section>

                    {/* ═══════════════════════════════════════════════════════════════
                        SECCIÓN 4 — BORDER-RADIUS
                    ═══════════════════════════════════════════════════════════════ */}
                    <section id="radius" className="scroll-mt-8">
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">4. Border-radius</h2>
                        <p className="text-sm text-slate-500 mb-8">Cinco valores con uso bien definido. `rounded-xl` es excepción — solo CTA hero + botón Buscar.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            <RadiusExample
                                tw="rounded-md"
                                size="6px"
                                uso="Badges (ADMIN, EJEMPLO, categoría, estado)"
                            >
                                <span className="inline-flex items-center bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-medium px-2 py-1 rounded-md uppercase tracking-widest">
                                    EJEMPLO
                                </span>
                            </RadiusExample>

                            <RadiusExample
                                tw="rounded-lg"
                                size="8px"
                                uso="Botones medianos, botones de modal, botones admin"
                            >
                                <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg">
                                    Cancelar
                                </button>
                            </RadiusExample>

                            <RadiusExample
                                tw="rounded-xl"
                                size="12px"
                                uso="EXCEPCIÓN — CTA grande del hero + botón Buscar del searchbar"
                                excepcion
                            >
                                <button className="bg-accent-600 hover:bg-accent-700 text-white text-base font-medium tracking-wide px-6 py-3 rounded-xl">
                                    Buscar servicios
                                </button>
                            </RadiusExample>

                            <RadiusExample
                                tw="rounded-2xl"
                                size="16px"
                                uso="Cards y modales (containers)"
                            >
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm w-64">
                                    <p className="text-sm font-semibold text-slate-900 mb-1">Card</p>
                                    <p className="text-xs text-slate-500">Container con esquinas más generosas.</p>
                                </div>
                            </RadiusExample>

                            <RadiusExample
                                tw="rounded-full"
                                size="9999px"
                                uso="Avatars, FAB, chips de filtro de estado"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-accent-100 flex items-center justify-center text-accent-600 font-semibold text-sm">
                                        CM
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 bg-slate-100 rounded-full px-3 py-1">
                                        Todos
                                    </span>
                                </div>
                            </RadiusExample>

                        </div>
                    </section>

                    {/* ═══════════════════════════════════════════════════════════════
                        SECCIÓN 5 — BODY CONTENT, PESOS CORRECTOS
                    ═══════════════════════════════════════════════════════════════ */}
                    <section id="body-pesos" className="scroll-mt-8">
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">5. Body content — pesos correctos</h2>
                        <p className="text-sm text-slate-500 mb-8">Decisión registrada en commit d8be458 (15/05/2026): values de metadata, párrafos descriptivos y nombres en cards van en regular. Peso fuerte solo en headings, CTAs primarios, badges, labels uppercase y display numbers.</p>

                        <div className="space-y-8">

                            {/* Caso 1 — Values bajo labels */}
                            <BodyCase titulo="Caso 1 — Values bajo labels de metadata (ficha de servicio)">
                                <NoSiPair
                                    no={
                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-1">MODALIDAD</p>
                                            <p className="text-sm text-slate-700 font-semibold">En mi domicilio (Providencia)</p>
                                        </div>
                                    }
                                    si={
                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-1">MODALIDAD</p>
                                            <p className="text-sm text-slate-700">En mi domicilio (Providencia)</p>
                                        </div>
                                    }
                                />
                            </BodyCase>

                            {/* Caso 2 — Párrafos descriptivos */}
                            <BodyCase titulo="Caso 2 — Párrafos descriptivos (sidebar proveedor)">
                                <NoSiPair
                                    no={
                                        <p className="text-sm text-slate-700 font-medium leading-tight">
                                            Curso profesional de peluquería canina (Academia Canina Chile 2017).
                                            Especialización razas felinas (2019).
                                        </p>
                                    }
                                    si={
                                        <p className="text-sm text-slate-700 leading-tight">
                                            Curso profesional de peluquería canina (Academia Canina Chile 2017).
                                            Especialización razas felinas (2019).
                                        </p>
                                    }
                                />
                            </BodyCase>

                            {/* Caso 3 — Nombre/comuna cards */}
                            <BodyCase titulo="Caso 3 — Nombre/comuna en cards de /explorar">
                                <NoSiPair
                                    no={
                                        <p className="text-sm text-slate-500 font-medium">Carolina Méndez · Providencia</p>
                                    }
                                    si={
                                        <p className="text-sm text-slate-500">Carolina Méndez · Providencia</p>
                                    }
                                />
                            </BodyCase>

                        </div>
                    </section>

                    {/* ═══════════════════════════════════════════════════════════════
                        SECCIÓN 6 — EXCEPCIONES DOCUMENTADAS
                    ═══════════════════════════════════════════════════════════════ */}
                    <section id="excepciones" className="scroll-mt-8">
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">6. Excepciones documentadas</h2>
                        <p className="text-sm text-slate-500 mb-8">Tres excepciones explícitas con justificación. Cualquier desviación adicional debe documentarse aquí.</p>

                        <div className="space-y-6">

                            <Excepcion
                                numero={1}
                                regla="font-black permitido en badges diminutos (≤10px)"
                                razon="A tamaños extremos, el grosor del trazo define legibilidad. No es decisión estética sino funcional."
                            >
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-red-100 text-red-600 text-[9px] font-black">
                                    +
                                </span>
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black ml-3">
                                    +
                                </span>
                            </Excepcion>

                            <Excepcion
                                numero={2}
                                regla="rounded-xl solo en CTA grande del hero + botón Buscar"
                                razon="Jerarquía visual del CTA principal de la página. El resto de botones medianos usa rounded-lg."
                            >
                                <div className="flex items-center gap-3 flex-wrap">
                                    <button className="bg-accent-600 hover:bg-accent-700 text-white text-base font-medium tracking-wide px-6 py-3 rounded-xl flex items-center gap-2">
                                        <Search size={18} /> Buscar
                                    </button>
                                    <span className="text-xs text-slate-400">vs.</span>
                                    <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg">
                                        Botón mediano (rounded-lg)
                                    </button>
                                </div>
                            </Excepcion>

                            <Excepcion
                                numero={3}
                                regla="accent-600 en acentos del hero del home"
                                razon="Anclaje de marca en zona principal de identidad. Span con palabra clave, label PARA DUEÑOS y stats numéricos. No es decoración."
                            >
                                <div className="space-y-3">
                                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
                                        Servicios para tu mascota, <span className="text-accent-600">cerca de ti</span>
                                    </h1>
                                    <p className="text-accent-600 font-medium uppercase tracking-widest text-xs">Para dueños de mascotas</p>
                                    <div className="text-3xl font-bold text-accent-600 tracking-tighter">12</div>
                                </div>
                            </Excepcion>

                        </div>
                    </section>

                    {/* ═══════════════════════════════════════════════════════════════
                        SECCIÓN 7 — ANTI-PATRONES
                    ═══════════════════════════════════════════════════════════════ */}
                    <section id="antipatrones" className="scroll-mt-8">
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">7. Anti-patrones</h2>
                        <p className="text-sm text-slate-500 mb-8">Checklist de qué NO hacer. Cualquier deviation debe justificarse contra estas reglas.</p>

                        <div className="border border-rose-100 bg-rose-50 rounded-lg p-6 space-y-4">

                            <AntiItem
                                no="font-black o font-extrabold en headings o body"
                                si="Usar font-bold (700) máximo. Excepción: badges diminutos ≤10px (ver excepción 1)."
                            />

                            <AntiItem
                                no="accent-600 en decoración (íconos sin semántica, checkmarks de feature lists)"
                                si="Usar text-slate-400 (neutro) o text-accent-500 (acento suave)."
                            />

                            <AntiItem
                                no="rounded-xl en botones medianos o badges"
                                si="rounded-lg para botones medianos, rounded-md para badges."
                            />

                            <AntiItem
                                no="font-semibold o font-bold en values de metadata, párrafos descriptivos o nombres en cards"
                                si="Regular (sin peso). Peso fuerte solo en headings, CTAs, badges, labels uppercase, display numbers."
                            />

                            <AntiItem
                                no="text-slate-800 o text-slate-900 en body"
                                si="text-slate-700 para body, text-slate-500 para metadata."
                            />

                        </div>
                    </section>

                    {/* ═══════════════════════════════════════════════════════════════
                        SECCIÓN 8 — COMPONENTES EXISTENTES
                    ═══════════════════════════════════════════════════════════════ */}
                    <section id="componentes" className="scroll-mt-8">
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">8. Componentes existentes</h2>
                        <p className="text-sm text-slate-500 mb-8">Demos de los componentes Card y Section alineados al sistema vigente. Cualquier uso nuevo debe partir de estos.</p>

                        {/* Cards */}
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Card</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

                            <div className="space-y-2">
                                <span className="text-xs font-medium uppercase tracking-widest text-slate-400">Default</span>
                                <Card>
                                    <h3 className="text-lg font-semibold text-slate-900">Standard Card</h3>
                                    <p className="text-sm text-slate-700 mt-2">
                                        Bg: white. Border: slate-200. Shadow: sm. Padding: m por default.
                                    </p>
                                </Card>
                            </div>

                            <div className="space-y-2">
                                <span className="text-xs font-medium uppercase tracking-widest text-slate-400">Hoverable</span>
                                <Card hoverable>
                                    <h3 className="text-lg font-semibold text-slate-900">Hoverable Card</h3>
                                    <p className="text-sm text-slate-700 mt-2">
                                        Transform: -y-1 en hover. Cursor: pointer. Sin accent decorativo en el title.
                                    </p>
                                </Card>
                            </div>

                            <div className="space-y-2">
                                <span className="text-xs font-medium uppercase tracking-widest text-slate-400">Padding variants</span>
                                <Card padding="s"><p className="text-sm text-slate-700">Small (p-4)</p></Card>
                                <Card padding="m"><p className="text-sm text-slate-700">Medium (p-6) — default</p></Card>
                                <Card padding="l"><p className="text-sm text-slate-700">Large (p-8)</p></Card>
                            </div>

                        </div>

                        {/* Sections */}
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Section</h3>
                        <div className="space-y-4">

                            <div className="border-t-2 border-slate-200 relative">
                                <span className="absolute top-0 right-0 -translate-y-1/2 bg-slate-200 text-slate-600 text-[10px] font-medium tracking-widest uppercase rounded-md px-2 py-0.5">
                                    Section boundary
                                </span>
                            </div>

                            <Section variant="white">
                                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">Section variant — white</h2>
                                <p className="text-sm text-slate-500 mb-6">Para hero sections o zonas con contraste fuerte vs vecinos.</p>
                                <Card>
                                    <h3 className="text-lg font-semibold text-slate-900">Card sobre fondo blanco</h3>
                                    <p className="text-sm text-slate-700 mt-2">Border es crítico para definir el container.</p>
                                </Card>
                            </Section>

                            <Section variant="alt">
                                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">Section variant — alt</h2>
                                <p className="text-sm text-slate-500 mb-6">Bloques secundarios con fondo gris suave para crear separación.</p>
                                <Card>
                                    <h3 className="text-lg font-semibold text-slate-900">Card sobre fondo alt</h3>
                                    <p className="text-sm text-slate-700 mt-2">Contraste natural sin necesidad de border fuerte.</p>
                                </Card>
                            </Section>

                            <Section variant="dark">
                                <h2 className="text-2xl font-semibold tracking-tight text-white mb-2">Section variant — dark</h2>
                                <p className="text-sm text-slate-400 mb-6">Secciones de alto impacto: CTAs grandes o testimoniales.</p>
                                <Card>
                                    <h3 className="text-lg font-semibold text-slate-900">Card sobre fondo oscuro</h3>
                                    <p className="text-sm text-slate-700 mt-2">Máximo pop visual.</p>
                                </Card>
                            </Section>

                        </div>
                    </section>

                </div>
            </div>
        </>
    );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function TypoRow({ label, tw, children }: { label: string; tw: string; children: React.ReactNode }) {
    return (
        <div className="border-b border-slate-200 pb-6 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4 items-start">
            <div>
                <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                <code className="text-[11px] text-slate-500 font-mono leading-tight block break-words">{tw}</code>
            </div>
            <div>{children}</div>
        </div>
    );
}

function PaletaSwatch({ hex, clase, uso, sample }: { hex: string; clase: string; uso: string; sample: string }) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
                <code className="text-xs font-mono text-slate-500">{clase}</code>
                <code className="text-xs font-mono text-slate-400">{hex}</code>
            </div>
            <p className={`text-base ${clase} mb-2`}>{sample}</p>
            <p className="text-xs text-slate-500">{uso}</p>
        </div>
    );
}

function AccentExample({ titulo, descripcion, children }: { titulo: string; descripcion: string; children: React.ReactNode }) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h4 className="text-sm font-semibold text-slate-900 mb-1">{titulo}</h4>
            <p className="text-xs text-slate-500 mb-4">{descripcion}</p>
            <div>{children}</div>
        </div>
    );
}

function NoSiPair({ no, si }: { no: React.ReactNode; si: React.ReactNode }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border border-rose-100 bg-rose-50/50 rounded-lg p-4">
                <span className="inline-block bg-rose-50 text-rose-700 text-xs font-medium uppercase tracking-widest rounded-md px-2 py-0.5 mb-3">
                    NO
                </span>
                <div>{no}</div>
            </div>
            <div className="border border-accent-100 bg-accent-50/50 rounded-lg p-4">
                <span className="inline-block bg-accent-50 text-accent-600 text-xs font-medium uppercase tracking-widest rounded-md px-2 py-0.5 mb-3">
                    SÍ
                </span>
                <div>{si}</div>
            </div>
        </div>
    );
}

function RadiusExample({ tw, size, uso, excepcion = false, children }: { tw: string; size: string; uso: string; excepcion?: boolean; children: React.ReactNode }) {
    return (
        <div className={`bg-white border ${excepcion ? 'border-amber-200' : 'border-slate-200'} rounded-2xl p-6`}>
            <div className="flex items-center justify-between mb-3">
                <code className="text-xs font-mono text-slate-500">{tw}</code>
                <code className="text-xs font-mono text-slate-400">{size}</code>
            </div>
            <div className="mb-4">{children}</div>
            <p className="text-xs text-slate-500">{uso}</p>
            {excepcion && (
                <p className="text-[11px] font-medium uppercase tracking-widest text-amber-600 mt-2">Excepción documentada</p>
            )}
        </div>
    );
}

function BodyCase({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">{titulo}</h3>
            {children}
        </div>
    );
}

function Excepcion({ numero, regla, razon, children }: { numero: number; regla: string; razon: string; children: React.ReactNode }) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-start gap-3 mb-3">
                <span className="bg-amber-100 text-amber-700 text-xs font-semibold rounded-md px-2 py-0.5 shrink-0">
                    EXC {numero}
                </span>
                <h4 className="text-sm font-semibold text-slate-900">{regla}</h4>
            </div>
            <p className="text-sm text-slate-700 mb-4">{razon}</p>
            <div className="bg-slate-50 rounded-lg p-4 flex items-center flex-wrap gap-2">
                {children}
            </div>
        </div>
    );
}

function AntiItem({ no, si }: { no: string; si: string }) {
    return (
        <div className="flex items-start gap-3">
            <X size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
                <p className="text-sm text-slate-900">{no}</p>
                <p className="text-xs text-slate-500 mt-1">{si}</p>
            </div>
        </div>
    );
}
