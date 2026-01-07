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
        date: "2025-12-05",
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
            <blockquote class="border-l-4 border-emerald-400 bg-emerald-50 p-4 text-slate-700 my-6 rounded-r-lg flex gap-3 items-start">
                <svg class="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
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
        date: "2025-12-12",
        author: "Dra. Valentina (Vet Pawnecta)",
        readTime: "6 min lectura",
        tags: ["Emergencia", "Salud", "Prevención"],
        content: `
            <p class="lead text-lg text-slate-600 mb-8 leading-relaxed">
                El <strong>golpe de calor</strong> ocurre cuando la temperatura corporal de tu mascota sube peligrosamente y no puede regularla. Es una situación crítica que requiere acción inmediata.
            </p>

            <h3 class="text-xl font-bold text-emerald-600 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Síntomas de Alerta
            </h3>
            <div class="bg-emerald-50 rounded-xl p-6 border border-emerald-100 mb-8">
                <ul class="space-y-3 text-base text-slate-700">
                    <li class="flex items-start gap-2">
                        <svg class="w-5 h-5 text-emerald-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Jadeo excesivo y ruidoso
                    </li>
                    <li class="flex items-start gap-2">
                        <svg class="w-5 h-5 text-emerald-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Encías muy rojas o moradas
                    </li>
                    <li class="flex items-start gap-2">
                        <svg class="w-5 h-5 text-emerald-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Salivación espesa
                    </li>
                    <li class="flex items-start gap-2">
                        <svg class="w-5 h-5 text-emerald-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Vómitos o diarrea
                    </li>
                    <li class="flex items-start gap-2">
                        <svg class="w-5 h-5 text-emerald-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
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
                    <span class="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-xs mt-0.5">5</span>
                    <span class="font-bold text-emerald-600">¡Dirígete al veterinario de urgencia! Incluso si parece mejorar, puede haber daños internos.</span>
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
        excerpt: "Un análisis profundo sobre por qué mantener a tu gato dentro de casa es la decisión más ética y responsable. Datos científicos, impacto ecológico y consejos de enriquecimiento.",
        coverImage: "https://images.unsplash.com/photo-1513245543132-31f507417b26?q=80&w=1000&auto=format&fit=crop",
        date: "2025-12-18",
        author: "Equipo Pawnecta",
        readTime: "8 min lectura",
        tags: ["Gatos", "Indoor", "Ecología", "Tenencia Responsable"],
        content: `
            <p class="lead text-lg text-slate-600 mb-8 leading-relaxed">
                Existe un debate apasionado entre los tutores de gatos sobre si permitirles salir o no. Sin embargo, la comunidad científica y veterinaria ha llegado a un consenso claro: <strong>mantener a los gatos dentro de casa (o en exteriores controlados) es fundamental para su bienestar y la protección del medio ambiente.</strong>
            </p>

            <h3 class="text-xl font-bold text-emerald-600 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Longevidad y Salud: Los Datos No Mienten
            </h3>
            <p class="mb-4 text-base leading-relaxed text-slate-600">
                La diferencia en la esperanza de vida es uno de los argumentos más contundentes. Al eliminar los riesgos externos, estás regalándole años de vida a tu mascota.
            </p>
            <div class="bg-emerald-50 rounded-xl p-6 border border-emerald-100 mb-8">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-white p-5 rounded-lg shadow-sm border border-emerald-50">
                        <span class="block text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">Gato Outdoor (Con acceso libre)</span>
                        <span class="text-3xl font-extrabold text-slate-400">2 a 5 años</span>
                        <p class="text-sm text-slate-500 mt-2">Expuesto a atropellos, venenos y depredadores.</p>
                    </div>
                    <div class="bg-white p-5 rounded-lg shadow-sm border border-emerald-200 ring-2 ring-emerald-50">
                        <span class="block text-xs text-emerald-600 uppercase tracking-widest font-bold mb-2">Gato Indoor (Hogareño)</span>
                        <span class="text-3xl font-extrabold text-emerald-600">12 a 15+ años</span>
                        <p class="text-sm text-slate-600 mt-2">Protegido y con control veterinario.</p>
                    </div>
                </div>
            </div>

            <h3 class="text-xl font-bold text-emerald-600 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Enfermedades Incurables
            </h3>
            <p class="mb-6 text-base leading-relaxed text-slate-600">
                El contacto directo con gatos desconocidos es la principal vía de transmisión de enfermedades virales graves para las cuales, en muchos casos, no existe cura:
            </p>
            <ul class="space-y-4 mb-8 text-base text-slate-600">
                <li class="flex gap-3 items-start">
                    <svg class="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div>
                        <strong class="text-emerald-700">Leucemia Felina (FeLV):</strong> Se transmite por contacto cercano (acicalamiento, platos compartidos). Deprime el sistema inmune y es altamente mortal.
                    </div>
                </li>
                <li class="flex gap-3 items-start">
                    <svg class="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div>
                        <strong class="text-emerald-700">VIF (SIDA Felino):</strong> Transmitido principalmente por mordeduras profundas durante peleas territoriales.
                    </div>
                </li>
            </ul>

            <h3 class="text-xl font-bold text-emerald-600 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Impacto Ecológico Devastador
            </h3>
            <p class="mb-4 text-base leading-relaxed text-slate-600">
                Los gatos son <strong>depredadores introducidos</strong>. En muchos ecosistemas, la fauna nativa (aves, lagartijas, pequeños mamíferos) no ha evolucionado con defensas contra ellos.
            </p>
            <div class="bg-emerald-50 p-6 rounded-xl border border-emerald-100 mb-8">
                <p class="italic text-slate-700 mb-4">
                    "En EE.UU., se estima que los gatos libre-deambulantes matan entre 1.3 y 4.0 mil millones de aves y entre 6.3 y 22.3 mil millones de mamíferos anualmente."
                </p>
                <cite class="text-xs text-emerald-600 font-bold not-italic block text-right">— Nature Communications Study (2013)</cite>
            </div>
            <p class="mb-6 text-base leading-relaxed text-slate-600">
                Incluso si tu gato está bien alimentado, su instinto de caza permanece activo. Permitir que cace fauna silvestre contribuye al declive de la biodiversidad local.
            </p>

            <h3 class="text-xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Derribando Mitos Comunes
            </h3>
            
            <div class="space-y-6 mb-8">
                <div class="flex gap-4 items-start">
                    <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600 font-bold text-xs mt-1">❌</div>
                    <div>
                        <strong class="block text-slate-900 text-base mb-1">Mito: "Es cruel tenerlos encerrados"</strong>
                        <p class="text-slate-600 text-sm leading-relaxed">
                            <strong>Realidad:</strong> Lo cruel es exponerlos a atropellos, envenenamientos o ataques de perros. Un gato indoor con un ambiente enriquecido es un gato pleno y seguro.
                        </p>
                    </div>
                </div>
                <div class="flex gap-4 items-start">
                    <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600 font-bold text-xs mt-1">❌</div>
                    <div>
                        <strong class="block text-slate-900 text-base mb-1">Mito: "Se aburren si no salen"</strong>
                        <p class="text-slate-600 text-sm leading-relaxed">
                            <strong>Realidad:</strong> El aburrimiento se combate con <em>enriquecimiento ambiental</em> (rascadores, alturas, juego), no con exposición al peligro.
                        </p>
                    </div>
                </div>
            </div>

            <h3 class="text-xl font-bold text-slate-800 mt-8 mb-4">¿Cómo hacer feliz a un gato indoor?</h3>
            <ul class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600 mb-8">
                <li class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                    <span>Gatificación (repisas y alturas)</span>
                </li>
                <li class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                    <span>Juguetes tipo caña (caza simulada)</span>
                </li>
                <li class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                    <span>Catios (patios cerrados)</span>
                </li>
                <li class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                    <span>Puzzles alimenticios</span>
                </li>
            </ul>

            <div class="mt-12 pt-8 border-t border-slate-200">
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Fuentes Consultadas</h4>
                <ul class="text-xs text-slate-500 space-y-2">
                    <li class="flex items-center gap-2">
                        <svg class="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        <a href="https://www.avma.org/" target="_blank" rel="nofollow noopener" class="hover:text-emerald-600 hover:underline">American Veterinary Medical Association (AVMA)</a>
                    </li>
                    <li class="flex items-center gap-2">
                        <svg class="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        <a href="https://abcbirds.org/program/cats-indoors/" target="_blank" rel="nofollow noopener" class="hover:text-emerald-600 hover:underline">American Bird Conservancy - Cats Indoors</a>
                    </li>
                    <li class="flex items-center gap-2">
                        <svg class="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        <a href="https://www.nature.com/articles/ncomms2380" target="_blank" rel="nofollow noopener" class="hover:text-emerald-600 hover:underline">Loss, S. R., Will, T. & Marra, P. P. The impact of free-ranging domestic cats on wildlife of the United States. Nat Commun (2013)</a>
                    </li>
                </ul>
            </div>
        `
    },
    {
        id: "4",
        slug: "importancia-registro-nacional-mascotas-chile",
        title: "Registro Nacional de Mascotas: ¿Por qué es fundamental inscribir a tu peludo?",
        excerpt: "Cumplir con la Ley Cholito no es solo un trámite legal, es un acto de amor. Aprende paso a paso cómo inscribir a tu mascota y por qué es clave para su seguridad.",
        coverImage: "/blog/pet-registration-cover.png",
        date: "2025-12-24",
        author: "Equipo Pawnecta",
        readTime: "5 min lectura",
        tags: ["Ley Cholito", "Responsabilidad Legal", "Microchip"],
        content: `
            <p class="lead text-lg text-slate-600 mb-8 leading-relaxed">
                En Chile, la <strong>Ley de Tenencia Responsable (conocida como Ley Cholito)</strong> establece que todos los perros y gatos deben estar inscritos en el Registro Nacional de Mascotas. Pero más allá de la obligación legal, este registro es la mejor herramienta para proteger a tu compañero en caso de extravío.
            </p>

            <h3 class="text-xl font-bold text-emerald-600 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ¿Por qué es tan importante?
            </h3>
            <ul class="space-y-4 mb-8 text-base text-slate-600">
                <li class="flex gap-3 items-start">
                    <svg class="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                    <div>
                        <strong class="text-emerald-700">Recuperación efectiva:</strong> Si tu mascota se pierde y alguien la encuentra, al escanear su microchip podrán contactarte inmediatamente gracias a los datos del registro.
                    </div>
                </li>
                <li class="flex gap-3 items-start">
                    <svg class="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                    <div>
                        <strong class="text-emerald-700">Demostración de propiedad:</strong> Es el único documento oficial que acredita legalmente que eres el tutor de la mascota ante cualquier disputa.
                    </div>
                </li>
                 <li class="flex gap-3 items-start">
                    <svg class="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                    <div>
                        <strong class="text-emerald-700">Evitas Multas:</strong> No tener a tu mascota inscrita puede conllevar multas que van desde 1 a 30 UTM.
                    </div>
                </li>
            </ul>

            <h3 class="text-xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Paso a Paso para la Inscripción
            </h3>
            
            <div class="bg-slate-50 border-l-4 border-emerald-500 p-6 rounded-r-xl mb-8">
                <ol class="list-decimal list-inside space-y-4 text-slate-700 text-sm">
                    <li>
                        <strong>Implantación del Microchip:</strong> Acude a un médico veterinario para que implante el microchip subcutáneo. Es un procedimiento rápido y casi indoloro.
                    </li>
                    <li>
                        <strong>Certificado Veterinario:</strong> El veterinario te entregará un certificado de implantación con los datos de tu mascota y tu firma.
                    </li>
                    <li>
                        <strong>Inscripción Online:</strong> Ingresa a <a href="https://registratumascota.cl" target="_blank" class="text-emerald-600 font-bold hover:underline">registratumascota.cl</a> con tu Clave Única.
                    </li>
                    <li>
                        <strong>Subir Documentos:</strong> Deberás cargar el certificado veterinario y una declaración simple de tenedor de mascota.
                    </li>
                </ol>
            </div>

            <p class="mb-6 text-base leading-relaxed text-slate-600">
                Una vez aprobado (tarda unos días), recibirás la <strong>Licencia de Registro</strong> digital en tu correo. ¡Felicidades, tu peludo ya es un ciudadano oficial!
            </p>
        `
    },
    {
        id: "5",
        slug: "beneficios-físicos-emocionales-tener-mascota",
        title: "Más que Compañía: Los Impactantes Beneficios de Tener una Mascota",
        excerpt: "Tener un perro o gato no solo alegra tus días, también mejora tu salud física y mental. Descubre qué dice la ciencia sobre el poder sanador de las mascotas.",
        coverImage: "/blog/importance-of-pets-cover.png",
        date: "2025-12-30",
        author: "Equipo Pawnecta",
        readTime: "6 min lectura",
        tags: ["Salud Mental", "Bienestar", "Familia"],
        content: `
            <p class="lead text-lg text-slate-600 mb-8 leading-relaxed">
                Quienes tienen mascotas saben intuitivamente que su presencia nos hace sentir mejor. Pero la ciencia confirma que estos beneficios van mucho más allá de la alegría momentánea: <strong>impactan directamente nuestra salud cardiovascular, sistema inmune y estabilidad emocional.</strong>
            </p>

            <h3 class="text-xl font-bold text-emerald-600 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                Salud Mental y Reducción del Estrés
            </h3>
            <p class="mb-4 text-base leading-relaxed text-slate-600">
                Acariciar a un perro o gato durante solo 10 minutos puede reducir significativamente los niveles de <strong>cortisol</strong> (la hormona del estrés). Además, su compañía combate la soledad y la depresión, proporcionando un sentido de propósito y rutina diaria.
            </p>
            <div class="bg-indigo-50 p-5 rounded-xl border border-indigo-100 mb-8 text-indigo-900 text-sm">
                <strong>¿Sabías que?</strong> Los dueños de mascotas tienen menos probabilidades de sufrir depresión clínica en comparación con quienes no tienen animales de compañía.
            </div>

            <h3 class="text-xl font-bold text-emerald-600 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Salud Física y Actividad
            </h3>
            <p class="mb-6 text-base leading-relaxed text-slate-600">
                Especialmente en el caso de los perros, la necesidad de paseos diarios motiva a sus dueños a mantenerse activos. Estudios demuestran que los dueños de perros caminan en promedio <strong>30 minutos más a la semana</strong> que quienes no tienen mascota.
            </p>
            <ul class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600 mb-8">
                <li class="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                    <strong class="block text-slate-900 mb-1">Presión Arterial</strong>
                    Tener mascota se asocia con niveles más bajos de presión arterial y colesterol.
                </li>
                <li class="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                    <strong class="block text-slate-900 mb-1">Inmunidad en Niños</strong>
                    Crecer con mascotas puede fortalecer el sistema inmune y reducir el riesgo de alergias futuras.
                </li>
            </ul>

            <h3 class="text-xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Conexión Social
            </h3>
            <p class="mb-6 text-base leading-relaxed text-slate-600">
                Las mascotas son excelentes "rompehielos". Salir a pasear o visitar el veterinario crea oportunidades naturales para interactuar con vecinos y otros dueños de mascotas, fortaleciendo el tejido social de la comunidad.
            </p>

            <div class="mt-12 pt-8 border-t border-slate-200">
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Fuentes y Referencias</h4>
                <ul class="text-xs text-slate-500 space-y-2">
                    <li class="flex items-center gap-2">
                        <svg class="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        <a href="https://www.cdc.gov/healthypets/health-benefits/index.html" target="_blank" rel="nofollow noopener" class="hover:text-emerald-600 hover:underline">CDC - Health Benefits of Owning a Pet</a>
                    </li>
                     <li class="flex items-center gap-2">
                        <svg class="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        <a href="https://www.mentalhealth.org.uk/explore-mental-health/a-z-topics/pets-and-mental-health" target="_blank" rel="nofollow noopener" class="hover:text-emerald-600 hover:underline">Mental Health Foundation - Pets and Mental Health</a>
                    </li>
                </ul>
            </div>
        `
    },
    {
        id: "6",
        slug: "importancia-no-cambiar-ambiente-mascotas-viaje",
        title: "¿Viajas? Por qué tu mascota prefiere quedarse en casa (y la ciencia lo respalda)",
        excerpt: "Cambiar de ambiente genera estrés en perros y gatos. Descubre por qué mantener su rutina y entorno es la opción más saludable según veterinarios.",
        coverImage: "/blog/pet-home-comfort-cover.png",
        date: "2026-01-03",
        author: "Equipo Pawnecta",
        readTime: "7 min lectura",
        tags: ["Bienestar Animal", "Estrés", "Tips de Viaje"],
        content: `
            <p class="lead text-lg text-slate-600 mb-8 leading-relaxed">
                Cuando planeamos vacaciones, surge la eterna duda: ¿Llevamos a la mascota, la dejamos en una guardería o contratamos un sitter a domicilio? Aunque la idea de una guardería suena divertida, <strong>la evidencia veterinaria sugiere que mantener a tu mascota en su propio hogar es, en la mayoría de los casos, la opción más saludable y menos estresante.</strong>
            </p>

            <h3 class="text-xl font-bold text-emerald-600 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                El Impacto del "Estrés Ambiental"
            </h3>
            <p class="mb-4 text-base leading-relaxed text-slate-600">
                Tanto gatos como perros son animales de costumbres. Los gatos, en particular, son extremadamente sensibles a los cambios en su territorio físico. Un estudio publicado en <em>Nature Communications</em> y fuentes de la <em>American Veterinary Medical Association (AVMA)</em> indican que la novedad ambiental es uno de los mayores disparadores de cortisol (hormona del estrés) en mascotas.
            </p>
            <div class="bg-amber-50 rounded-xl p-6 border border-amber-100 mb-8">
                <strong class="block text-amber-800 mb-2">¿Qué provoca el cambio de ambiente?</strong>
                <ul class="list-disc list-inside text-amber-700 text-sm space-y-1">
                    <li>Disminución del apetito y problemas digestivos.</li>
                    <li>Baja en las defensas (sistema inmune).</li>
                    <li>Alteraciones de conducta (miedo, agresividad o apatía).</li>
                </ul>
            </div>

            <h3 class="text-xl font-bold text-emerald-600 mt-8 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Beneficios de Quedarse en Casa (Sitter a Domicilio)
            </h3>
            
            <div class="space-y-6 mb-8">
                <div class="flex gap-4 items-start">
                    <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600 font-bold mt-1">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    </div>
                    <div>
                        <strong class="block text-slate-900 text-lg mb-1">Mantenimiento de la Rutina</strong>
                        <p class="text-slate-600 text-sm leading-relaxed">
                            Los horarios de comida, paseos y sueño se mantienen intactos. Esta predictibilidad da seguridad emocional a tu mascota, algo imposible de replicar en un entorno nuevo y ruidoso.
                        </p>
                    </div>
                </div>

                <div class="flex gap-4 items-start">
                    <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600 font-bold mt-1">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <strong class="block text-slate-900 text-lg mb-1">Menor Riesgo de Enfermedades</strong>
                        <p class="text-slate-600 text-sm leading-relaxed">
                            Las guarderías, por muy limpias que sean, son focos de contagio de "tos de las perreras", parásitos y virus respiratorios debido a la alta concentración de animales. En casa, tu mascota no está expuesta a patógenos externos.
                        </p>
                    </div>
                </div>

                <div class="flex gap-4 items-start">
                    <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600 font-bold mt-1">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    </div>
                    <div>
                        <strong class="block text-slate-900 text-lg mb-1">Atención Personalizada (1 a 1)</strong>
                        <p class="text-slate-600 text-sm leading-relaxed">
                            Un sitter dedicado se enfoca 100% en tu peludo. Si es tímido, respeta su espacio; si es juguetón, gasta su energía. No hay competencia por atención ni conflictos jerárquicos con otros animales desconocidos.
                        </p>
                    </div>
                </div>
            </div>

            <h3 class="text-xl font-bold text-slate-800 mt-8 mb-4">Conclusión Veterinaria</h3>
            <p class="mb-6 text-base leading-relaxed text-slate-600">
                Si tu mascota no tiene problemas graves de ansiedad por separación que requieran vigilancia médica constante, <strong>la opción "en casa" es el estándar de oro para su bienestar mental y físico.</strong> Al regresar, encontrarás a un amigo relajado que te espera en su sillón favorito, no a uno estresado por una "vacaciones" forzadas en un lugar extraño.
            </p>

            <div class="mt-12 pt-8 border-t border-slate-200">
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Fuentes Consultadas</h4>
                <ul class="text-xs text-slate-500 space-y-2">
                    <li class="flex items-center gap-2">
                        <svg class="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        <a href="https://www.aspca.org/pet-care/general-pet-care" target="_blank" rel="nofollow noopener" class="hover:text-emerald-600 hover:underline">ASPCA - General Pet Care & Stress Management</a>
                    </li>
                    <li class="flex items-center gap-2">
                         <svg class="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        <a href="https://icatcare.org/advice/cats-and-stress/" target="_blank" rel="nofollow noopener" class="hover:text-emerald-600 hover:underline">International Cat Care - Environmental Stress in Cats</a>
                    </li>
                </ul>
            </div>
        `
    },
    {
        id: "7",
        slug: "ventajas-desventajas-hotel-mascotas-vs-sitter",
        title: "Hoteles para Mascotas: Lo Bueno, Lo Malo y Lo que Debes Saber",
        excerpt: "¿Pensando en dejar a tu peludo en un hotel? Analizamos sus ventajas de seguridad vs. el riesgo de estrés y contagios. Toma la mejor decisión para tu viaje.",
        coverImage: "/blog/pet-hotel-pros-cons.png",
        date: "2026-01-06",
        author: "Equipo Pawnecta",
        readTime: "6 min lectura",
        tags: ["Comparativa", "Hoteles", "Bienestar"],
        content: `
            <p class="lead text-lg text-slate-600 mb-8 leading-relaxed">
                Cuando no podemos llevar a nuestra mascota de viaje, los <strong>hoteles o guarderías caninas</strong> suelen ser la primera opción que se nos viene a la mente. Ofrecen instalaciones profesionales y vigilancia, pero ¿son realmente el "paraíso" que prometen? Analizamos sus pros y contras sin filtros.
            </p>

            <div class="grid md:grid-cols-2 gap-8 mb-12">
                <!-- Ventajas -->
                <div class="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
                    <h3 class="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                        <svg class="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Ventajas del Hotel
                    </h3>
                    <ul class="space-y-4 text-sm text-indigo-800">
                        <li class="flex gap-3">
                            <span class="font-bold text-indigo-600">Seguridad las 24hrs:</span> Es difícil que una mascota se escape de instalaciones diseñadas con doble puerta y cercos altos.
                        </li>
                        <li class="flex gap-3">
                            <span class="font-bold text-indigo-600">Personal Profesional:</span> Suelen tener cuidadores entrenados que pueden administrar medicamentos o reaccionar ante emergencias.
                        </li>
                        <li class="flex gap-3">
                            <span class="font-bold text-indigo-600">Socialización:</span> Para perros muy sociables y enérgicos, jugar todo el día con otros perros puede ser divertido.
                        </li>
                    </ul>
                </div>

                <!-- Desventajas -->
                <div class="bg-rose-50 rounded-2xl p-6 border border-rose-100">
                    <h3 class="text-xl font-bold text-rose-900 mb-4 flex items-center gap-2">
                        <svg class="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Desventajas del Hotel
                    </h3>
                    <ul class="space-y-4 text-sm text-rose-800">
                        <li class="flex gap-3">
                            <span class="font-bold text-rose-600">Riesgo de Contagios:</span> La "Tos de las Perreras" (Bordetella) y los parásitos son comunes donde hay alta concentración de animales.
                        </li>
                        <li class="flex gap-3">
                            <span class="font-bold text-rose-600">Estrés Elevado:</span> El ruido constante de ladridos (efecto canil) y el entorno desconocido pueden causar ansiedad severa y diarreas.
                        </li>
                        <li class="flex gap-3">
                            <span class="font-bold text-rose-600">Falta de Atención 1 a 1:</span> Un cuidador suele estar a cargo de 10-20 perros, por lo que la atención individual es mínima.
                        </li>
                    </ul>
                </div>
            </div>

            <h3 class="text-xl font-bold text-slate-800 mt-8 mb-4">¿Para quién es recomendable el Hotel?</h3>
            <p class="mb-6 text-base leading-relaxed text-slate-600">
                Los hoteles pueden ser una buena opción para <strong>perros jóvenes, sanos, vacunados y extremadamente sociables</strong> que disfrutan del caos de una manada. Sin embargo, no se recomiendan para:
            </p>
            <ul class="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-8">
                <li>Gatos (el estrés de salir de casa es demasiado alto).</li>
                <li>Perros ancianos o con movilidad reducida.</li>
                <li>Mascotas tímidas, miedosas o reactivas.</li>
                <li>Cachorros sin esquema de vacunación completo.</li>
            </ul>

            <h3 class="text-xl font-bold text-emerald-600 mt-8 mb-4">La Alternativa: Sitter Personalizado</h3>
            <p class="mb-6 text-base leading-relaxed text-slate-600">
                Si buscas lo mejor de los dos mundos (seguridad y atención), un <strong>Pet Sitter verificado en Pawnecta</strong> ofrece la ventaja de mantener a tu mascota en su entorno (o en un hogar real), reduciendo el estrés a casi cero y garantizando atención exclusiva.
            </p>

             <div class="mt-12 pt-8 border-t border-slate-200">
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Fuentes y Referencias</h4>
                <ul class="text-xs text-slate-500 space-y-2">
                    <li class="flex items-center gap-2">
                        <svg class="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        <a href="https://www.akc.org/expert-advice/home-living/boarding-kennel-vs-pet-sitter/" target="_blank" rel="nofollow noopener" class="hover:text-emerald-600 hover:underline">AKC - Boarding Kennel vs. Pet Sitter</a>
                    </li>
                </ul>
            </div>
        `
    }
];
