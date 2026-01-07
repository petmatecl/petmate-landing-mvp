import Head from "next/head";
import { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

const faqs = [
    {
        question: "¿Cómo funciona Pawnecta?",
        answer: "Pawnecta conecta a dueños de mascotas con cuidadores certificados (Petmates) de confianza. Puedes explorar perfiles, ver reseñas, y contactar directamente al cuidador que mejor se adapte a tus necesidades."
    },
    {
        question: "¿Es seguro dejar a mi mascota con un Petmate?",
        answer: "¡Absolutamente! Todos nuestros Petmates pasan por un riguroso proceso de validación que incluye verificación de identidad, entrevistas y revisión de antecedentes. Además, contamos con un sistema de reseñas transparentes de otros usuarios."
    },
    {
        question: "¿Qué servicios puedo encontrar?",
        answer: "Ofrecemos principalmente servicio de hospedaje (alojamiento en casa del cuidador). Cada perfil detalla si cuidan perros, gatos u otros animales, y las condiciones de su hogar (patio, mallas de seguridad, etc.)."
    },
    {
        question: "¿Cómo me registro como cuidador (Sitter)?",
        answer: "Si amas a los animales y quieres generar ingresos extra, puedes registrarte en la sección 'Quiero ser Sitter'. Deberás completar un formulario con tus datos y experiencia. Nuestro equipo revisará tu solicitud y te contactará."
    },
    {
        question: "¿Tiene algún costo usar la plataforma?",
        answer: "Para los dueños de mascotas, el uso de la plataforma para buscar cuidadores es gratuito. El precio del servicio se acuerda y paga directamente al cuidador."
    },
    {
        question: "¿Qué hago si tengo una emergencia?",
        answer: "Siempre recomendamos intercambiar números de emergencia y contactos veterinarios con tu Petmate antes del servicio. Pawnecta facilita la conexión, pero la responsabilidad del cuidado recae en el acuerdo entre las partes."
    }
];

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

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
                        <div className="inline-flex items-center justify-center p-3 bg-emerald-100 text-emerald-600 rounded-full mb-4">
                            <HelpCircle size={32} />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
                            Preguntas Frecuentes
                        </h1>
                        <p className="text-lg text-slate-600">
                            Todo lo que necesitas saber sobre Pawnecta y el cuidado de tu mascota.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <div
                                key={index}
                                className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${openIndex === index
                                    ? "border-emerald-500 shadow-md"
                                    : "border-slate-200 hover:border-emerald-300"
                                    }`}
                            >
                                <button
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
                                    className={`px-5 pb-5 text-slate-600 leading-relaxed transition-all duration-300 ease-in-out ${openIndex === index ? "block opacity-100" : "hidden opacity-0"
                                        }`}
                                >
                                    {faq.answer}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">¿No encontraste la respuesta?</h3>
                        <p className="text-slate-600 mb-6">Estamos aquí para ayudarte. Contáctanos directamente.</p>
                        <a
                            href="mailto:contacto@pawnecta.cl"
                            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 transition w-full sm:w-auto"
                        >
                            Contactar Soporte
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
}
