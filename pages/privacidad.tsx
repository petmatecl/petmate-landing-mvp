import Head from "next/head";

export default function PrivacidadPage() {
    return (
        <div className="bg-slate-50 min-h-screen py-12">
            <Head>
                <title>Política de Privacidad | Pawnecta</title>
            </Head>
            <div className="mx-auto max-w-4xl px-6 lg:px-8">
                <div className="bg-white rounded-3xl p-8 md:p-14 shadow-sm border-2 border-slate-300">
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-8 tracking-tight">Política de Privacidad</h1>

                    <div className="text-slate-600 leading-relaxed text-lg space-y-10">
                        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-300">
                            <p className="font-semibold text-slate-900">Última actualización: 16 de diciembre de 2025</p>
                            <p className="mt-2">
                                En Pawnecta valoramos tu privacidad. Esta Política de Privacidad explica qué datos personales tratamos cuando usas <a href="https://www.pawnecta.com" className="text-emerald-600 font-medium hover:underline">www.pawnecta.com</a> (el “Sitio”), para qué los usamos, con quién los compartimos y cuáles son tus derechos.
                            </p>
                        </div>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">1</span>
                                Responsable del tratamiento
                            </h3>
                            <div className="pl-11">
                                <p className="mb-2">El Sitio es operado por <strong>Interactive SpA, RUT 77.420.852-6</strong>, con domicilio tributario en <strong>Irarrázaval 2150 D519, Ñuñoa, Región Metropolitana, Chile</strong> (“Pawnecta”, “nosotros” o el “Responsable”).</p>
                                <p>Correo de contacto: <a href="mailto:contacto@pawnecta.com" className="text-emerald-600 font-medium hover:underline">contacto@pawnecta.com</a>.</p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">2</span>
                                Qué es Pawnecta
                            </h3>
                            <div className="pl-11">
                                <p>Pawnecta es una plataforma que conecta dueños/tutores de mascotas con proveedores de servicios para que se contacten y coordinen servicios entre ellos. Pawnecta no presta servicios de cuidado y no gestiona pagos en este MVP.</p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">3</span>
                                Datos personales que recopilamos
                            </h3>
                            <div className="pl-11 space-y-4">
                                <p>Según el uso del Sitio, podemos tratar:</p>
                                <ul className="list-disc pl-5 space-y-3 marker:text-emerald-500">
                                    <li><strong className="text-slate-800">Datos de cuenta y contacto:</strong> nombre, correo, teléfono, contraseña (almacenada de forma cifrada/hasheada), comuna/ciudad.</li>
                                    <li><strong className="text-slate-800">Identificación:</strong> RUT (solicitado tanto a Usuarios como a Proveedores de servicios, para fines de verificación y seguridad).</li>
                                    <li><strong className="text-slate-800">Datos de perfil:</strong> foto, descripción, experiencia, disponibilidad, referencias u otra información que decidas publicar.</li>
                                    <li><strong className="text-slate-800">Datos sobre mascotas (si el usuario los entrega):</strong> tipo, edad aproximada, rutinas, cuidados, alergias u otra información necesaria para coordinar el cuidado.</li>
                                    <li><strong className="text-slate-800">Documentación de seguridad (solo Proveedores de servicios):</strong> Certificado de Antecedentes u otros documentos que solicitamos para verificación y seguridad de la comunidad.</li>
                                    <li><strong className="text-slate-800">Comunicaciones:</strong> mensajes e información intercambiada entre usuarios a través del Sitio.</li>
                                    <li><strong className="text-slate-800">Datos técnicos:</strong> IP, fecha/hora de acceso, identificadores del navegador/dispositivo, logs, cookies y tecnologías similares (seguridad, métricas y funcionamiento).</li>
                                </ul>
                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-amber-800 text-base">
                                    <strong>Recomendación:</strong> Comparte solo lo estrictamente necesario. La documentación de seguridad se solicita con fines de verificación y no debe incluir información adicional innecesaria.
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">4</span>
                                Finalidades del tratamiento
                            </h3>
                            <div className="pl-11">
                                <p className="mb-4">Tratamos los datos para:</p>
                                <ul className="list-disc pl-5 space-y-3 marker:text-emerald-500">
                                    <li>Crear y administrar tu cuenta y permitir el acceso al Sitio.</li>
                                    <li>Conectar Usuarios y Proveedores de servicios y habilitar la comunicación entre ellos.</li>
                                    <li><strong className="text-slate-800">Verificación y seguridad:</strong> validar identidad (incluido RUT), reducir fraude y riesgos, y revisar documentación de seguridad (incluido Certificado de Antecedentes) para fortalecer la confianza en la comunidad.</li>
                                    <li><strong className="text-slate-800">Soporte y seguridad operativa:</strong> prevenir abuso, suplantación, incidentes y vulneraciones; gestionar reportes.</li>
                                    <li><strong className="text-slate-800">Mejoras del servicio (MVP):</strong> analítica básica, diagnóstico de errores y optimización de rendimiento.</li>
                                    <li><strong className="text-slate-800">Cumplimiento legal:</strong> responder requerimientos válidos de autoridades y ejercer/defender derechos.</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">5</span>
                                Base de tratamiento
                            </h3>
                            <div className="pl-11">
                                <p>Tratamos datos conforme a: (i) tu consentimiento, (ii) la ejecución de tu relación de uso del Sitio, (iii) interés legítimo en seguridad y mejora del servicio cuando corresponda, y/o (iv) obligaciones legales aplicables.</p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">6</span>
                                Con quién compartimos tus datos
                            </h3>
                            <div className="pl-11 space-y-4">
                                <p>Podemos compartir datos:</p>
                                <ul className="list-disc pl-5 space-y-3 marker:text-emerald-500">
                                    <li><strong className="text-slate-800">Con otros usuarios</strong>, cuando sea necesario para el funcionamiento del Sitio (por ejemplo, perfil visible, mensajes y coordinación).</li>
                                    <li>El RUT y la documentación de seguridad (incluido el Certificado de Antecedentes) <strong className="text-slate-800">no se publican ni se comparten con otros usuarios</strong>. Pawnecta puede mostrar, si corresponde, un estado de verificación (por ejemplo, “verificado”) sin exponer documentos.</li>
                                    <li><strong className="text-slate-800">Con proveedores tecnológicos</strong> (hosting, bases de datos, analítica, mensajería/soporte y/o verificación) que actúan por cuenta de Pawnecta, bajo deberes de confidencialidad y seguridad.</li>
                                    <li><strong className="text-slate-800">Con autoridades o terceros</strong> cuando exista obligación legal, orden competente o sea necesario para proteger derechos y seguridad.</li>
                                </ul>
                                <p className="font-bold text-slate-800">No vendemos datos personales.</p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">7</span>
                                Pagos y datos financieros
                            </h3>
                            <div className="pl-11">
                                <p>Pawnecta no procesa pagos ni almacena datos de tarjetas. Cualquier pago o reembolso se acuerda directamente entre Usuario y Proveedor, fuera de Pawnecta.</p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">8</span>
                                Cookies y tecnologías similares
                            </h3>
                            <div className="pl-11">
                                <p className="mb-4">Usamos cookies/tecnologías similares para:</p>
                                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500 mb-4">
                                    <li>Mantener sesión y seguridad.</li>
                                    <li>Recordar preferencias básicas.</li>
                                    <li>Medir uso y desempeño del Sitio.</li>
                                </ul>
                                <p>Puedes configurar tu navegador para bloquear cookies, pero ciertas funciones podrían no operar correctamente.</p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">9</span>
                                Conservación de datos
                            </h3>
                            <div className="pl-11">
                                <p className="mb-4">Conservamos datos mientras mantengas tu cuenta o mientras sea necesario para operar el servicio, resolver disputas, investigar incidentes y/o cumplir obligaciones legales. En particular:</p>
                                <ul className="list-disc pl-5 space-y-3 marker:text-emerald-500">
                                    <li>El RUT se conserva mientras la cuenta esté activa y según necesidades de seguridad/cumplimiento.</li>
                                    <li>La documentación de seguridad (incluido Certificado de Antecedentes) se conserva solo el tiempo necesario para verificación y seguridad, y luego puede ser eliminada o minimizada (por ejemplo, conservando solo el resultado/estado de verificación, trazabilidad y registros de auditoría cuando corresponda).</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">10</span>
                                Tus derechos y cómo ejercerlos
                            </h3>
                            <div className="pl-11">
                                <p className="mb-2">Puedes solicitar acceso, rectificación, actualización, cancelación/eliminación o bloqueo de tus datos, según corresponda.</p>
                                <p>Para ejercerlos, escribe a <a href="mailto:contacto@pawnecta.com" className="text-emerald-600 font-medium hover:underline">contacto@pawnecta.com</a> indicando tu solicitud y el correo asociado a tu cuenta.</p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">11</span>
                                Seguridad
                            </h3>
                            <div className="pl-11">
                                <p>Aplicamos medidas razonables de seguridad para proteger los datos. Sin embargo, ningún sistema es completamente infalible y no podemos garantizar seguridad absoluta.</p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">12</span>
                                Menores de edad
                            </h3>
                            <div className="pl-11">
                                <p>El Sitio está dirigido a personas mayores de 18 años. No recopilamos intencionalmente datos de menores.</p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">13</span>
                                Cambios a esta Política
                            </h3>
                            <div className="pl-11">
                                <p>Podemos actualizar esta Política. La versión vigente se publicará en el Sitio con su fecha de actualización.</p>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
