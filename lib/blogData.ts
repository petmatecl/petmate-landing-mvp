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
        date: "2024-01-03",
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
        date: "2024-03-20",
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
    }
];
