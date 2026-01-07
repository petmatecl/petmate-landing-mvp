export interface BlogPost {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    coverImage: string;
    date: string;
    author: string;
    readTime: string; // "5 min"
    content: string; // HTML/Markdown mixture for simplicity
    tags: string[];
}

export const BLOG_POSTS: BlogPost[] = [
    {
        id: "1",
        slug: "cuidados-mascotas-verano-altas-temperaturas",
        title: "Cuidados Esenciales para tu Mascota durante el Verano",
        excerpt: "Las altas temperaturas pueden ser peligrosas. Aprende cómo mantener a tu perro o gato fresco, hidratado y seguro durante la ola de calor.",
        coverImage: "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?q=80&w=1000&auto=format&fit=crop",
        date: "2024-01-02",
        author: "Equipo Pawnecta",
        readTime: "4 min lectura",
        tags: ["Verano", "Salud", "Perros"],
        content: `
            <p class="lead text-lg text-slate-600 mb-8 leading-relaxed">
                El verano en Chile puede alcanzar temperaturas extremas, y nuestros compañeros peludos lo sienten tanto o más que nosotros. Aquí te dejamos una <strong>guía práctica</strong> para cuidarlos y disfrutar del sol sin riesgos.
            </p>

            <h3 class="text-xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                1. Hidratación Constante
            </h3>
            <p class="mb-6 text-base leading-relaxed text-slate-600">
                Asegúrate de que siempre tengan <strong>agua fresca y limpia</strong>. Si sales de paseo, lleva una botella portátil. 
                <br/><br/>
                <span class="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Tip útil:
                </span> 
                Coloca cubitos de hielo en su bebedero para mantener el agua fría por más tiempo.
            </p>

            <h3 class="text-xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                2. Cuidado con el Pavimento
            </h3>
            <p class="mb-6 text-base leading-relaxed text-slate-600">
                Antes de salir a pasear, haz la <strong>"prueba de los 5 segundos"</strong>: coloca el dorso de tu mano sobre el asfalto. 
            </p>
            <blockquote class="border-l-4 border-amber-400 bg-amber-50 p-4 text-slate-700 my-6 rounded-r-lg flex gap-3 items-start">
                <svg class="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span class="italic">"Si no puedes aguantar 5 segundos, está demasiado caliente para las almohadillas de tu perro."</span>
            </blockquote>
            <p class="mb-6 text-base leading-relaxed text-slate-600">
                Prefiere pasear temprano en la mañana o tarde en la noche cuando el suelo está más fresco.
            </p>

            <h3 class="text-xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                3. Nunca los Dejes en el Auto
            </h3>
            <p class="mb-6 text-base leading-relaxed text-slate-600">
                Incluso con las ventanas abiertas, la temperatura dentro de un auto puede subir mortalmente en pocos minutos. 
                <strong>Si vas a hacer trámites, es mejor dejarlos en casa frescos y seguros.</strong>
            </p>

            <h3 class="text-xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                4. Protector Solar
            </h3>
            <p class="mb-6 text-base leading-relaxed text-slate-600">
                ¿Sabías que los animales de pelaje blanco o muy corto pueden sufrir quemaduras solares? Consulta con tu veterinario sobre protectores solares aptos para mascotas y aplícalos en <strong>orejas y nariz</strong>.
            </p>

            <div class="bg-gray-50 border border-gray-200 p-5 rounded-xl my-8 flex gap-4 items-start">
                <svg class="w-6 h-6 text-emerald-600 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                    <strong class="block text-slate-900 text-lg mb-1">Consejo Profesional</strong> 
                    <span class="text-slate-600">Si notas que tu mascota respira con dificultad o babea excesivamente, busca sombra y ofrécele agua inmediatamente. Podría ser el inicio de un golpe de calor.</span>
                </div>
            </div>

            <div class="mt-12 pt-8 border-t border-slate-200">
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Fuentes y Referencias</h4>
                <ul class="text-xs text-slate-500 space-y-2">
                    <li class="flex items-center gap-2">
                        <svg class="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        <a href="https://www.aspca.org/pet-care/general-pet-care/hot-weather-safety-tips" target="_blank" rel="nofollow noopener" class="hover:text-emerald-600 hover:underline">ASPCA - Hot Weather Safety Tips</a>
                    </li>
                    <li class="flex items-center gap-2">
                         <svg class="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        <a href="https://www.akc.org/expert-advice/health/summer-safety-tips-for-dogs/" target="_blank" rel="nofollow noopener" class="hover:text-emerald-600 hover:underline">American Kennel Club (AKC) - Summer Safety</a>
                    </li>
                </ul>
            </div>
        `
    },
    {
        id: "2",
        slug: "golpe-de-calor-mascotas-sintomas",
        title: "Golpe de Calor: Cómo detectarlo y prevenirlo a tiempo",
        excerpt: "El golpe de calor es una emergencia veterinaria común en verano. Conoce las señales de alerta y cómo reaccionar para salvar la vida de tu peludo.",
        coverImage: "https://images.unsplash.com/photo-1561037404-61cd46aa615b?q=80&w=1000&auto=format&fit=crop",
        date: "2024-01-03",
        author: "Dra. Valentina (Vet Pawnecta)",
        readTime: "6 min lectura",
        tags: ["Emergencia", "Salud", "Prevención"],
        content: `
            <p class="lead text-lg text-slate-600 mb-8 leading-relaxed">
                El <strong>golpe de calor</strong> ocurre cuando la temperatura corporal de tu mascota sube peligrosamente y no puede regularla. Es una situación crítica que requiere acción inmediata.
            </p>

            <h3 class="text-xl font-bold text-rose-600 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Síntomas de Alerta
            </h3>
            <div class="bg-rose-50 rounded-xl p-6 border border-rose-100 mb-8">
                <ul class="space-y-3 text-base text-slate-700">
                    <li class="flex items-start gap-2">
                        <svg class="w-5 h-5 text-rose-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Jadeo excesivo y ruidoso
                    </li>
                    <li class="flex items-start gap-2">
                        <svg class="w-5 h-5 text-rose-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Encías muy rojas o moradas
                    </li>
                    <li class="flex items-start gap-2">
                        <svg class="w-5 h-5 text-rose-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Salivación espesa
                    </li>
                    <li class="flex items-start gap-2">
                        <svg class="w-5 h-5 text-rose-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Vómitos o diarrea
                    </li>
                    <li class="flex items-start gap-2">
                        <svg class="w-5 h-5 text-rose-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Tambaleo o incapacidad para levantarse
                    </li>
                </ul>
            </div>

            <h3 class="text-xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                ¿Qué hacer ante un golpe de calor?
            </h3>
            <ol class="list-none space-y-4 mb-8 text-base text-slate-600">
                <li class="flex gap-3 items-start">
                    <span class="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-xs mt-0.5">1</span>
                    <span><strong>Muévelo a la sombra</strong> inmediatamente y a un lugar ventilado.</span>
                </li>
                <li class="flex gap-3 items-start">
                    <span class="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-xs mt-0.5">2</span>
                    <span>Ofrece <strong>agua fresca</strong> (no helada) en pequeñas cantidades. No lo fuerces a beber si no quiere.</span>
                </li>
                <li class="flex gap-3 items-start">
                    <span class="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-xs mt-0.5">3</span>
                    <span>Moja sus <strong>patas, ingle y axilas</strong> con agua a temperatura ambiente. Evita el agua muy helada.</span>
                </li>
                <li class="flex gap-3 items-start">
                    <span class="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-xs mt-0.5">4</span>
                    <span>Utiliza un <strong>ventilador</strong> o abanico para ayudar a disipar el calor corporal.</span>
                </li>
                <li class="flex gap-3 items-start">
                    <span class="flex-shrink-0 w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center font-bold text-xs mt-0.5">5</span>
                    <span class="font-bold text-rose-600">¡Dirígete al veterinario de urgencia! Incluso si parece mejorar, puede haber daños internos.</span>
                </li>
            </ol>

            <h3 class="text-xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Razas de Mayor Riesgo
            </h3>
            <p class="mb-6 text-base leading-relaxed text-slate-600">
                Los perros <strong>braquicéfalos</strong> (ñatos) como <em>Pugs, Bulldogs y Boxers</em> tienen mayor dificultad para jadear y enfriarse, por lo que requieren cuidados extremos y vigilancia constante en días calurosos.
            </p>

            <div class="mt-12 pt-8 border-t border-slate-200">
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Fuentes y Referencias</h4>
                 <ul class="text-xs text-slate-500 space-y-2">
                    <li class="flex items-center gap-2">
                        <svg class="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        <a href="https://www.avma.org/resources-tools/pet-owners/petcare/warm-weather-pet-safety" target="_blank" rel="nofollow noopener" class="hover:text-emerald-600 hover:underline">AVMA - Warm Weather Pet Safety</a>
                    </li>
                    <li class="flex items-center gap-2">
                         <svg class="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        <a href="https://www.humanesociety.org/resources/keep-pets-safe-heat" target="_blank" rel="nofollow noopener" class="hover:text-emerald-600 hover:underline">The Humane Society - Keep Pets Safe</a>
                    </li>
                </ul>
            </div>
        `
    },
    {
        id: "3",
        slug: "mitos-verdades-gato-indoor-100-por-ciento",
        title: "Mitos y Verdades: Por qué tu gato debe ser 100% Indoor",
        excerpt: "Descubre por qué mantener a tu gato dentro de casa no solo prolonga su vida hasta en 10 años, sino que protege la fauna nativa. Derribamos los mitos sobre la 'libertad' felina.",
        coverImage: "https://images.unsplash.com/photo-1513245543132-31f507417b26?q=80&w=1000&auto=format&fit=crop",
        date: "2024-03-20",
        author: "Equipo Pawnecta",
        readTime: "7 min lectura",
        tags: ["Gatos", "Indoor", "Mitos", "Seguridad"],
        content: `
            <p class="lead text-lg text-slate-600 mb-8 leading-relaxed">
                Existe un debate común entre dueños de gatos: <strong>¿Dejarlo salir o mantenerlo dentro de casa?</strong> 
                La ciencia y los veterinarios son claros: un gato 100% indoor no solo vive más, sino que vive mejor. 
                Aquí te contamos por qué, con datos reales y derribando los mitos más comunes.
            </p>

            <h3 class="text-xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                El Dato Más Importante: Longevidad
            </h3>
            <div class="bg-emerald-50 rounded-xl p-6 border border-emerald-100 mb-8">
                <p class="text-base text-slate-700 leading-relaxed mb-4">
                    La diferencia en la esperanza de vida es dramática. Según estudios veterinarios:
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-white p-4 rounded-lg shadow-sm border border-emerald-100">
                        <span class="block text-sm text-slate-500 uppercase tracking-widest font-bold mb-1">Gato Outdoor</span>
                        <span class="text-2xl font-bold text-rose-500">2 a 5 años</span>
                        <p class="text-xs text-slate-400 mt-2">Promedio de vida expuesto a peligros</p>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow-sm border border-emerald-100">
                        <span class="block text-sm text-slate-500 uppercase tracking-widest font-bold mb-1">Gato Indoor</span>
                        <span class="text-2xl font-bold text-emerald-600">12 a 15+ años</span>
                        <p class="text-xs text-slate-400 mt-2">Seguro en casa</p>
                    </div>
                </div>
            </div>

            <h3 class="text-xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Peligros Reales del "Mundo Exterior"
            </h3>
            <p class="mb-6 text-base leading-relaxed text-slate-600">
                Muchos creen que los gatos "se saben cuidar solos", pero la realidad urbana es muy peligrosa para ellos.
            </p>
            <ul class="space-y-4 mb-8 text-base text-slate-600">
                <li class="flex gap-3 items-start">
                    <svg class="w-5 h-5 text-rose-500 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div>
                        <strong>Enfermedades Morales e Incurables:</strong> El contacto con otros gatos (peleas o apareamiento) es la vía principal de transmisión de <em class="text-rose-600">Leucemia Felina (FeLV)</em> y <em class="text-rose-600">VIF (SIDA felino)</em>.
                    </div>
                </li>
                <li class="flex gap-3 items-start">
                    <svg class="w-5 h-5 text-rose-500 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div>
                        <strong>Accidentes y Traumas:</strong> Atropellos, ataques de perros, caídas y crueldad humana son causas frecuentes de muerte prematura.
                    </div>
                </li>
            </ul>

            <h3 class="text-xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Impacto Ecológico: Eres Responsable
            </h3>
            <p class="mb-6 text-base leading-relaxed text-slate-600">
                Tu gato es un depredador introducido, no una parte natural del ecosistema local. Se estima que los gatos domésticos son responsables de la muerte de <strong>miles de millones de aves y mamíferos pequeños</strong> cada año en el mundo.
            </p>
            <blockquote class="border-l-4 border-slate-400 bg-slate-50 p-4 text-slate-700 my-6 rounded-r-lg italic">
                "Proteger a tu gato manteniéndolo dentro también es proteger a la fauna silvestre de tu comunidad."
            </blockquote>

            <h3 class="text-xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Mito vs. Realidad
            </h3>
            
            <div class="space-y-4 mb-8">
                <div class="flex gap-4 items-start">
                    <div class="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600 font-bold text-xs">❌</div>
                    <div>
                        <strong class="block text-slate-800 text-sm">Mito: "Se aburren si no salen"</strong>
                        <p class="text-slate-600 text-sm mt-1">
                            Un gato no necesita "la calle", necesita <strong>estímulos</strong>. Juguetes, rascadores y tiempo de juego contigo son suficientes.
                        </p>
                    </div>
                </div>
                <div class="flex gap-4 items-start">
                    <div class="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600 font-bold text-xs">❌</div>
                    <div>
                        <strong class="block text-slate-800 text-sm">Mito: "Es cruel privarlos de libertad"</strong>
                        <p class="text-slate-600 text-sm mt-1">
                            No es libertad, es exposición al peligro. Es como dejar a un niño pequeño jugar solo en una avenida. Lo cruel es exponerlos a sufrir.
                        </p>
                    </div>
                </div>
            </div>

            <div class="mt-12 pt-8 border-t border-slate-200">
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">¿Cómo enriquecer su vida en casa?</h4>
                <div class="grid grid-cols-2 gap-4 text-xs text-slate-500">
                    <div class="flex items-center gap-2">
                         <svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                         Rascadores verticales altos
                    </div>
                    <div class="flex items-center gap-2">
                         <svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                         Repisas en ventanas ("Gatificación")
                    </div>
                    <div class="flex items-center gap-2">
                         <svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                         Juguetes de caña interactivos
                    </div>
                    <div class="flex items-center gap-2">
                         <svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                         Catios (patios cerrados seguros)
                    </div>
                </div>
            </div>
        `
    }
];
