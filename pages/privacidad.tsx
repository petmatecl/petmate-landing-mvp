import Head from "next/head";

export default function PrivacidadPage() {
    return (
        <div className="bg-slate-50 min-h-screen py-12">
            <Head>
                <title>Política de Privacidad | PetMate</title>
            </Head>
            <div className="mx-auto max-w-4xl px-6 lg:px-8">
                <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100">
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Política de Privacidad</h1>
                    <div className="prose prose-emerald max-w-none text-slate-600">
                        <p><strong>Última actualización: Diciembre 2024</strong></p>

                        <h3>1. Información que Recopilamos</h3>
                        <p>Recopilamos información que nos proporcionas directamente, como tu nombre, correo electrónico y datos de tus mascotas al registrarte.</p>

                        <h3>2. Uso de la Información</h3>
                        <p>Utilizamos tu información para operar, mantener y mejorar nuestros servicios, así como para comunicarnos contigo sobre actualizaciones y promociones.</p>

                        <h3>3. Compartir Información</h3>
                        <p>No vendemos tu información personal. Solo compartimos datos necesarios con los PetMates que elijas para coordinar el cuidado de tus mascotas.</p>

                        <h3>4. Seguridad de Datos</h3>
                        <p>Implementamos medidas de seguridad para proteger tu información, aunque ninguna transmisión por Internet es 100% segura.</p>

                        <h3>5. Tus Derechos</h3>
                        <p>Tienes derecho a acceder, corregir o eliminar tu información personal en cualquier momento desde tu perfil o contactándonos.</p>

                        <h3>6. Contacto</h3>
                        <p>Para consultas sobre privacidad, escribe a privacidad@petmate.cl.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
