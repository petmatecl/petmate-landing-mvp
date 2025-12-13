import Head from "next/head";

export default function TerminosPage() {
    return (
        <div className="bg-slate-50 min-h-screen py-12">
            <Head>
                <title>Términos y Condiciones | PetMate</title>
            </Head>
            <div className="mx-auto max-w-4xl px-6 lg:px-8">
                <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100">
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Términos y Condiciones</h1>
                    <div className="prose prose-emerald max-w-none text-slate-600">
                        <p><strong>Última actualización: Diciembre 2024</strong></p>

                        <h3>1. Aceptación de los Términos</h3>
                        <p>Al acceder y utilizar PetMate, aceptas estar sujeto a estos Términos y Condiciones. Si no estás de acuerdo con alguna parte de estos términos, no podrás acceder al servicio.</p>

                        <h3>2. Descripción del Servicio</h3>
                        <p>PetMate es una plataforma que conecta a dueños de mascotas con cuidadores independientes ("PetMates"). Nosotros facilitamos la conexión pero no empleamos a los cuidadores.</p>

                        <h3>3. Registro y Seguridad</h3>
                        <p>Para usar ciertos servicios, debes registrarte. Eres responsable de mantener la confidencialidad de tu cuenta y contraseña. Debes notificarnos inmediatamente sobre cualquier uso no autorizado de tu cuenta.</p>

                        <h3>4. Responsabilidades del Usuario</h3>
                        <p>Te comprometes a proporcionar información veraz y a no utilizar la plataforma para actividades ilegales o prohibidas.</p>

                        <h3>5. Modificaciones</h3>
                        <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Te notificaremos sobre cambios significativos.</p>

                        <h3>6. Contacto</h3>
                        <p>Si tienes dudas sobre estos términos, contáctanos en legal@petmate.cl.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
