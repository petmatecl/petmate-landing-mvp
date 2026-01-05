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
            <p class="lead text-xl text-slate-600 mb-8 leading-relaxed">
                👋 El verano en Chile puede alcanzar temperaturas extremas 🌡️, y nuestros compañeros peludos lo sienten tanto o más que nosotros. Aquí te dejamos una <strong>guía práctica</strong> para cuidarlos y disfrutar del sol sin riesgos.
            </p>

            <h3 class="text-2xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
                💧 1. Hidratación Constante
            </h3>
            <p class="mb-6 text-lg leading-relaxed text-slate-600">
                Asegúrate de que siempre tengan <strong>agua fresca y limpia</strong>. Si sales de paseo, lleva una botella portátil. 
                <br/><br/>
                🧊 <em>Un truco útil:</em> Coloca cubitos de hielo en su bebedero para mantener el agua fría por más tiempo y hacerlo más divertido para ellos.
            </p>

            <h3 class="text-2xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
                🐾 2. Cuidado con el Pavimento
            </h3>
            <p class="mb-6 text-lg leading-relaxed text-slate-600">
                Antes de salir a pasear, haz la <strong>"prueba de los 5 segundos"</strong>: coloca el dorso de tu mano sobre el asfalto. 
            </p>
            <blockquote class="border-l-4 border-amber-400 bg-amber-50 p-4 italic text-slate-700 my-6 rounded-r-lg">
                "Si no puedes aguantar 5 segundos, está demasiado caliente para las almohadillas de tu perro."
            </blockquote>
            <p class="mb-6 text-lg leading-relaxed text-slate-600">
                🌅 Prefiere pasear temprano en la mañana o tarde en la noche cuando el suelo está más fresco.
            </p>

            <h3 class="text-2xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
                🚗 3. Nunca los Dejes en el Auto
            </h3>
            <p class="mb-6 text-lg leading-relaxed text-slate-600">
                Incluso con las ventanas abiertas, la temperatura dentro de un auto puede subir mortalmente en pocos minutos. 
                <strong>Si vas a hacer trámites, es mejor dejarlos en casa frescos y seguros.</strong> 🏠
            </p>

            <h3 class="text-2xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
                ☀️ 4. Protector Solar
            </h3>
            <p class="mb-6 text-lg leading-relaxed text-slate-600">
                ¿Sabías que los animales de pelaje blanco o muy corto pueden sufrir quemaduras solares? 🧴 Consulta con tu veterinario sobre protectores solares aptos para mascotas y aplícalos en <strong>orejas y nariz</strong>.
            </p>

            <div class="alert bg-sky-50 border-l-4 border-sky-500 p-5 rounded-r-xl my-8 shadow-sm">
                <strong class="block text-sky-800 text-lg mb-1 flex items-center gap-2">💡 Consejo Pro:</strong> 
                <span class="text-sky-700">Si notas que tu mascota respira con dificultad o babea excesivamente, busca sombra y ofrécele agua inmediatamente. Podría ser el inicio de un golpe de calor.</span>
            </div>

            <div class="mt-12 pt-8 border-t border-slate-200">
                <h4 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Fuentes y Referencias</h4>
                <ul class="text-xs text-slate-500 space-y-2">
                    <li><a href="https://www.aspca.org/pet-care/general-pet-care/hot-weather-safety-tips" target="_blank" rel="nofollow noopener" class="hover:text-emerald-600 hover:underline flex items-center gap-1">🔗 ASPCA - Hot Weather Safety Tips</a></li>
                    <li><a href="https://www.akc.org/expert-advice/health/summer-safety-tips-for-dogs/" target="_blank" rel="nofollow noopener" class="hover:text-emerald-600 hover:underline flex items-center gap-1">🔗 American Kennel Club (AKC) - Summer Safety</a></li>
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
            <p class="lead text-xl text-slate-600 mb-8 leading-relaxed">
                🚨 El <strong>golpe de calor</strong> ocurre cuando la temperatura corporal de tu mascota sube peligrosamente y no puede regularla. Es una situación crítica que requiere acción inmediata.
            </p>

            <h3 class="text-2xl font-bold text-rose-600 mt-8 mb-4 flex items-center gap-2">
                ⚠️ Síntomas de Alerta
            </h3>
            <div class="bg-rose-50 rounded-xl p-6 border border-rose-100 mb-8">
                <ul class="space-y-3 text-lg text-slate-700">
                    <li class="flex items-start gap-2"><span class="text-rose-500 mt-1">●</span> Jadeo excesivo y ruidoso 🌬️</li>
                    <li class="flex items-start gap-2"><span class="text-rose-500 mt-1">●</span> Encías muy rojas o moradas 🦷</li>
                    <li class="flex items-start gap-2"><span class="text-rose-500 mt-1">●</span> Salivación espesa 💧</li>
                    <li class="flex items-start gap-2"><span class="text-rose-500 mt-1">●</span> Vómitos o diarrea 🤢</li>
                    <li class="flex items-start gap-2"><span class="text-rose-500 mt-1">●</span> Tambaleo o incapacidad para levantarse 😵</li>
                </ul>
            </div>

            <h3 class="text-2xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
                🚑 ¿Qué hacer ante un golpe de calor?
            </h3>
            <ol class="list-none space-y-4 mb-8 text-lg text-slate-600">
                <li class="flex gap-3">
                    <span class="flex-shrink-0 w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">1</span>
                    <span><strong>Muévelo a la sombra</strong> inmediatamente y a un lugar ventilado. 🌳</span>
                </li>
                <li class="flex gap-3">
                    <span class="flex-shrink-0 w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">2</span>
                    <span>Ofrece <strong>agua fresca</strong> (no helada) en pequeñas cantidades. ❌ No lo fuerces a beber si no quiere.</span>
                </li>
                <li class="flex gap-3">
                    <span class="flex-shrink-0 w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">3</span>
                    <span>Moja sus <strong>patas, ingle y axilas</strong> con agua a temperatura ambiente. 🛁 Evita el agua muy helada para no causar un shock térmico.</span>
                </li>
                <li class="flex gap-3">
                    <span class="flex-shrink-0 w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">4</span>
                    <span>Utiliza un <strong>ventilador</strong> o abanico para ayudar a disipar el calor corporal. 💨</span>
                </li>
                <li class="flex gap-3">
                    <span class="flex-shrink-0 w-8 h-8 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center font-bold">5</span>
                    <span class="font-bold text-rose-600">¡Dirígete al veterinario de urgencia! 🏥 Incluso si parece mejorar, puede haber daños internos.</span>
                </li>
            </ol>

            <h3 class="text-2xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
                🐶 Razas de Mayor Riesgo
            </h3>
            <p class="mb-6 text-lg leading-relaxed text-slate-600">
                Los perros <strong>braquicéfalos</strong> (ñatos) como <em>Pugs, Bulldogs y Boxers</em> tienen mayor dificultad para jadear y enfriarse, por lo que requieren cuidados extremos y vigilancia constante en días calurosos.
            </p>

            <div class="mt-12 pt-8 border-t border-slate-200">
                <h4 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Fuentes y Referencias</h4>
                <ul class="text-xs text-slate-500 space-y-2">
                    <li><a href="https://www.avma.org/resources-tools/pet-owners/petcare/warm-weather-pet-safety" target="_blank" rel="nofollow noopener" class="hover:text-emerald-600 hover:underline flex items-center gap-1">🔗 AVMA - Warm Weather Pet Safety</a></li>
                    <li><a href="https://www.humanesociety.org/resources/keep-pets-safe-heat" target="_blank" rel="nofollow noopener" class="hover:text-emerald-600 hover:underline flex items-center gap-1">🔗 The Humane Society - Keep Pets Safe</a></li>
                </ul>
            </div>
        `
    }
];
