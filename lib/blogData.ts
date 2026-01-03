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
            <p class="lead">El verano en Chile puede alcanzar temperaturas extremas, y nuestros compañeros peludos lo sienten tanto o más que nosotros. Aquí te dejamos una guía práctica para cuidarlos.</p>

            <h3>1. Hidratación Constante</h3>
            <p>Asegúrate de que siempre tengan agua fresca y limpia. Si sales de paseo, lleva una botella portátil. Un truco útil es colocar cubitos de hielo en su bebedero para mantener el agua fría por más tiempo.</p>

            <h3>2. Cuidado con el Pavimento</h3>
            <p>Antes de salir a pasear, haz la "prueba de los 5 segundos": coloca el dorso de tu mano sobre el asfalto. Si no puedes aguantar 5 segundos, está demasiado caliente para las almohadillas de tu perro. Prefiere pasear temprano en la mañana o tarde en la noche.</p>

            <h3>3. Nunca los Dejes en el Auto</h3>
            <p>Incluso con las ventanas abiertas, la temperatura dentro de un auto puede subir mortalmente en pocos minutos. Si vas a hacer trámites, es mejor dejarlos en casa frescos y seguros.</p>

            <h3>4. Protector Solar</h3>
            <p>¿Sabías que los animales de pelaje blanco o muy corto pueden sufrir quemaduras solares? Consulta con tu veterinario sobre protectores solares aptos para mascotas y aplícalos en orejas y nariz.</p>

            <div class="alert alert-info">
                <strong>Consejo Pro:</strong> Si notas que tu mascota respira con dificultad o babea excesivamente, busca sombra y ofrécele agua inmediatamente.
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
            <p class="lead">El golpe de calor ocurre cuando la temperatura corporal de tu mascota sube peligrosamente y no puede regularla. Es vital actuar rápido.</p>

            <h3>Síntomas de Alerta</h3>
            <ul>
                <li>Jadeo excesivo y ruidoso.</li>
                <li>Encías muy rojas o moradas.</li>
                <li>Salivación espesa.</li>
                <li>Vómitos o diarrea.</li>
                <li>Tambaleo o incapacidad para levantarse.</li>
            </ul>

            <h3>¿Qué hacer ante un golpe de calor?</h3>
            <ol>
                <li><strong>Muévelo a la sombra</strong> inmediatamente.</li>
                <li>Ofrece agua fresca (no helada) en pequeñas cantidades. No lo fuerces a beber.</li>
                <li>Moja sus patas, ingle y axilas con agua a temperatura ambiente (no helada, para evitar shock térmico).</li>
                <li>Utiliza un ventilador para ayudar a bajar la temperatura.</li>
                <li><strong>Dirígete al veterinario</strong> de urgencia, incluso si parece mejorar, ya que puede haber daños internos.</li>
            </ol>

            <h3>Razas de Mayor Riesgo</h3>
            <p>Los perros braquicéfalos (ñatos) como Pugs, Bulldogs y Boxers tienen mayor dificultad para jadear y enfriarse, por lo que requieren cuidados extremos.</p>
        `
    }
];
