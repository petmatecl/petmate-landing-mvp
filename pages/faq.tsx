import Head from "next/head";
import { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle, Search } from "lucide-react";

const faqs = [
    {
        question: "¿Necesito crear una cuenta para buscar servicios?",
        answer: "No. Puedes explorar todos los servicios y perfiles sin registrarte. Solo necesitas una cuenta cuando quieras contactar a un proveedor o dejar una evaluación."
    },
    {
        question: "¿Cómo sé que los proveedores son de confianza?",
        answer: "Todos los proveedores en Pawnecta verificaron su identidad con RUT y foto de carnet antes de publicar. Además, las evaluaciones solo pueden escribirlas usuarios que efectivamente contactaron al proveedor — sin reseñas falsas."
    },
    {
        question: "¿Cómo contacto a un proveedor?",
        answer: "Cada proveedor elige cómo quiere ser contactado: por chat interno de Pawnecta, WhatsApp o teléfono. Verás los botones disponibles directamente en su perfil."
    },
    {
        question: "¿Pawnecta procesa los pagos?",
        answer: "Por ahora no. El pago se coordina directamente entre tú y el proveedor, como ambos prefieran (transferencia, efectivo, etc.). Pawnecta facilita la conexión."
    },
    {
        question: "¿Puedo dejar una evaluación después del servicio?",
        answer: "Sí, y te lo agradecemos. Las evaluaciones ayudan a otros dueños a elegir mejor. Solo puedes evaluar proveedores con los que hayas tenido contacto en la plataforma. Cada evaluación pasa por moderación antes de publicarse."
    },
    {
        question: "¿Cuánto cuesta publicar en Pawnecta?",
        answer: "Publicar es completamente gratis. Puedes crear tu perfil y publicar tus servicios sin pagar nada. En el futuro ofreceremos opciones de mayor visibilidad para quienes quieran destacarse, pero la presencia básica siempre será gratuita."
    },
    {
        question: "¿Cómo me registro como proveedor?",
        answer: "Ve a Registrarse y elige 'Quiero ofrecer servicios'. Necesitarás tu RUT y una foto de tu carnet de identidad. Tu cuenta será revisada en un plazo de 24 a 48 horas. Una vez aprobada, podrás publicar todos los servicios que ofrezcas."
    },
    {
        question: "¿Qué servicios puedo publicar?",
        answer: "Cualquier servicio relacionado con el cuidado animal: hospedaje, cuidado a domicilio, paseos, peluquería canina o felina, veterinaria a domicilio, adiestramiento y guardería diurna. Si ofreces algo distinto, contáctanos y lo evaluamos."
    },
    {
        question: "¿Puedo publicar más de un servicio?",
        answer: "Sí. Desde tu panel puedes crear tantos servicios como quieras, cada uno con su propia descripción, fotos, precio y disponibilidad."
    },
    {
        question: "¿Quién ve mis datos de contacto?",
        answer: "Tú decides. Al configurar tu perfil eliges si mostrar tu WhatsApp, teléfono o email públicamente. También puedes optar por recibir contacto solo a través del chat interno de Pawnecta, sin exponer ningún dato personal."
    }
];

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [query, setQuery] = useState("");

    const filteredFaqs = query.trim() === ""
        ? faqs.map((faq, index) => ({ ...faq, originalIndex: index }))
        : faqs
            .map((faq, index) => ({ ...faq, originalIndex: index }))
            .filter(faq =>
                faq.question.toLowerCase().includes(query.toLowerCase()) ||
                faq.answer.toLowerCase().includes(query.toLowerCase())
            );

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <>
            <Head>
                <title>Preguntas Frecuentes | Pawnecta</title>
                <meta name="description" content="Resuelve tus dudas sobre Pawnecta. Aprende cómo funciona el servicio de cuidado de mascotas más confiable de Chile." />
            </Head>

            <div className="flex-grow py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center p-3 bg-emerald-100 text-emerald-700 rounded-full mb-4">
                            <HelpCircle size={32} />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
                            Preguntas Frecuentes
                        </h1>
                        <p className="text-lg text-slate-600">
                            Todo lo que necesitas saber sobre Pawnecta y el cuidado de tu mascota.
                        </p>
                    </div>

                    {/* Buscador */}
                    <div className="relative mb-8">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        <label htmlFor="faq-search" className="sr-only">Buscar en preguntas frecuentes</label>
                        <input
                            id="faq-search"
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Busca una pregunta o palabra clave..."
                            className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-2xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 placeholder:text-slate-400 transition-colors"
                        />
                    </div>

                    <div className="space-y-4">
                        {filteredFaqs.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                                <p className="text-slate-500 text-sm mb-3">
                                    No se encontraron preguntas que coincidan con &ldquo;{query}&rdquo;
                                </p>
                                <button
                                    onClick={() => setQuery("")}
                                    className="text-sm text-emerald-700 hover:text-emerald-800 font-medium underline underline-offset-2"
                                >
                                    Limpiar búsqueda
                                </button>
                            </div>
                        ) : filteredFaqs.map((faq) => {
                            const index = faq.originalIndex;
                            return (
                            <div
                                key={index}
                                className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${openIndex === index
                                    ? "border-emerald-500 shadow-md"
                                    : "border-slate-300 hover:border-emerald-300"
                                    }`}
                            >
                                <button
                                    id={`faq-button-${index}`}
                                    aria-expanded={openIndex === index}
                                    aria-controls={`faq-panel-${index}`}
                                    onClick={() => toggleFAQ(index)}
                                    className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
                                >
                                    <span className={`text-lg font-bold ${openIndex === index ? "text-emerald-700" : "text-slate-800"}`}>
                                        {faq.question}
                                    </span>
                                    {openIndex === index ? (
                                        <ChevronUp className="text-emerald-500 transition-transform" />
                                    ) : (
                                        <ChevronDown className="text-slate-400 transition-transform" />
                                    )}
                                </button>
                                <div
                                    id={`faq-panel-${index}`}
                                    role="region"
                                    aria-labelledby={`faq-button-${index}`}
                                    className={`px-5 pb-5 text-slate-600 leading-relaxed transition-all duration-300 ease-in-out ${openIndex === index ? "block opacity-100" : "hidden opacity-0"
                                        }`}
                                >
                                    {faq.answer}
                                </div>
                            </div>
                            );
                        })}
                    </div>

                    <div className="mt-12 text-center bg-white p-8 rounded-2xl border-2 border-slate-300 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">¿No encontraste la respuesta?</h3>
                        <p className="text-slate-600 mb-6">Estamos aquí para ayudarte. Contáctanos directamente.</p>
                        <a
                            href="mailto:contacto@pawnecta.com"
                            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-emerald-700 hover:bg-emerald-800 transition w-full sm:w-auto"
                        >
                            Contactar Soporte
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
}
