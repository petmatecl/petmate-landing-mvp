import Head from "next/head";

export default function TerminosPage() {
    return (
        <div className="bg-slate-50 min-h-screen py-12">
            <Head>
                <title>Términos y Condiciones | Pawnecta</title>
            </Head>
            <div className="mx-auto max-w-4xl px-6 lg:px-8">
                <div className="bg-white rounded-3xl p-8 md:p-14 shadow-sm border-2 border-slate-300">
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-8 tracking-tight">Términos y Condiciones</h1>

                    <div className="text-slate-600 leading-relaxed text-lg space-y-10">
                        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-300">
                            <p className="font-semibold text-slate-900">Última actualización: 16 de diciembre de 2025</p>
                            <p className="mt-2">
                                Estos Términos regulan el acceso y uso de <a href="https://www.pawnecta.com" className="text-emerald-600 font-medium hover:underline">www.pawnecta.com</a> (el “Sitio”). Al crear una cuenta o usar el Sitio, aceptas estos Términos.
                            </p>
                        </div>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">1</span>
                                Titularidad y operador
                            </h3>
                            <div className="pl-11">
                                <p className="mb-2">El Sitio es operado por <strong>Interactive SpA, RUT 77.420.852-6</strong>, con domicilio tributario en <strong>Irarrázaval 2150 D519, Ñuñoa, Región Metropolitana, Chile</strong> (“Pawnecta”).</p>
                                <p>Contacto: <a href="mailto:contacto@pawnecta.com" className="text-emerald-600 font-medium hover:underline">contacto@pawnecta.com</a>.</p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">2</span>
                                Definiciones
                            </h3>
                            <div className="pl-11">
                                <ul className="space-y-4">
                                    <li className="flex gap-2">
                                        <span className="font-bold text-slate-800 whitespace-nowrap">Usuario:</span>
                                        <span>usuario que busca un proveedor para su(s) mascota(s).</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="font-bold text-slate-800 whitespace-nowrap">Proveedor de servicios:</span>
                                        <span>usuario que ofrece servicios de cuidado animal.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="font-bold text-slate-800 whitespace-nowrap">Servicio de Cuidado Animal:</span>
                                        <span>servicio acordado entre Usuario y Proveedor de servicios.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="font-bold text-slate-800 whitespace-nowrap">Contenido:</span>
                                        <span>información publicada en el Sitio (perfiles, mensajes, reseñas, imágenes, etc.).</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="font-bold text-slate-800 whitespace-nowrap">Verificación:</span>
                                        <span>procesos de validación básica de identidad y/o documentación para seguridad.</span>
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">3</span>
                                Rol de Pawnecta (intermediación)
                            </h3>
                            <div className="pl-11 space-y-4">
                                <p>Pawnecta es un marketplace en línea que conecta a dueños de mascotas con proveedores de servicios verificados en Chile. La plataforma facilita la conexión entre usuarios y proveedores, pero no es parte de los acuerdos de servicio ni procesa pagos entre las partes.</p>
                                <ul className="list-disc pl-5 space-y-3 marker:text-emerald-500">
                                    <li>Pawnecta <strong className="text-slate-800">no presta Servicios de Cuidado Animal</strong>, no emplea proveedores, no es parte del contrato entre Usuario y Proveedor de servicios, y no actúa como aseguradora ni garante.</li>
                                    <li>El acuerdo (fechas, tarifas, condiciones, cancelación, responsabilidades) se celebra directamente entre Usuario y Proveedor de servicios.</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">4</span>
                                Pagos
                            </h3>
                            <div className="pl-11">
                                <p>En este MVP, Pawnecta no gestiona pagos ni retiene comisiones. Todo pago, reembolso o cobro se acuerda y ejecuta entre Usuario y Proveedor de servicios, fuera de Pawnecta.</p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">5</span>
                                Elegibilidad y cuenta
                            </h3>
                            <div className="pl-11">
                                <ul className="list-disc pl-5 space-y-3 marker:text-emerald-500">
                                    <li>Debes tener 18 años o más.</li>
                                    <li>Te comprometes a entregar información veraz y actualizada.</li>
                                    <li>Eres responsable de resguardar tu contraseña y del uso de tu cuenta.</li>
                                    <li>Pawnecta puede suspender o cerrar cuentas ante indicios razonables de fraude, abuso, incumplimientos o riesgos para la comunidad.</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">6</span>
                                RUT y documentación de seguridad (verificación)
                            </h3>
                            <div className="pl-11">
                                <ul className="list-disc pl-5 space-y-3 marker:text-emerald-500">
                                    <li>Para fines de seguridad y confianza, Pawnecta puede solicitar el RUT tanto de Usuarios como de Proveedores de servicios.</li>
                                    <li>Para fines de seguridad de la comunidad, Pawnecta puede solicitar a los Proveedores de servicios un Certificado de Antecedentes (u otra documentación de verificación).</li>
                                    <li>La entrega del RUT y de la documentación solicitada puede ser requisito para activar o mantener funcionalidades (por ejemplo, publicar un perfil de Proveedor de servicios o contactar usuarios).</li>
                                    <li>El usuario declara que la información y documentos entregados son auténticos y vigentes. Entregar información falsa o adulterada es causal de suspensión o cierre de cuenta.</li>
                                    <li>La Verificación es limitada y no constituye certificación, garantía de conducta, ni aseguramiento de resultados. Los usuarios siguen siendo responsables de evaluar riesgos y acordar condiciones.</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">7</span>
                                Reglas de uso
                            </h3>
                            <div className="pl-11 space-y-4">
                                <p className="font-semibold text-red-600">Está prohibido:</p>
                                <ul className="list-disc pl-5 space-y-3 marker:text-red-500">
                                    <li>Suplantar identidad, entregar información falsa o engañosa.</li>
                                    <li>Publicar contenido ilegal, ofensivo, discriminatorio, violento o que promueva maltrato animal.</li>
                                    <li>Hostigar, amenazar o extorsionar a otros usuarios.</li>
                                    <li>Usar el Sitio con fines distintos a conectar y coordinar servicios de cuidado de mascotas.</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">8</span>
                                Responsabilidades del Usuario
                            </h3>
                            <div className="pl-11">
                                <p className="mb-4">El Usuario se obliga a:</p>
                                <ul className="list-disc pl-5 space-y-3 marker:text-emerald-500">
                                    <li>Entregar información relevante y veraz sobre la mascota (rutina, salud, alergias, comportamiento, necesidades especiales).</li>
                                    <li>Informar riesgos conocidos (p. ej., agresividad, historial de mordidas, escapes).</li>
                                    <li>Proveer condiciones razonables y seguras cuando el cuidado se realice en su domicilio.</li>
                                    <li>Definir por escrito (idealmente) instrucciones, contactos de emergencia y veterinaria.</li>
                                    <li>Mantener al día medidas básicas de cuidado (alimentación, arnés/collar, identificación) y lo que estime necesario para la seguridad.</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">9</span>
                                Responsabilidades del Proveedor de servicios
                            </h3>
                            <div className="pl-11">
                                <p className="mb-4">El Proveedor de servicios se obliga a:</p>
                                <ul className="list-disc pl-5 space-y-3 marker:text-emerald-500">
                                    <li>Prestar el servicio con diligencia y cuidado razonable, conforme a lo acordado.</li>
                                    <li>Cumplir lo ofrecido en su perfil y lo pactado con el Usuario.</li>
                                    <li>Tratar a la(s) mascota(s) con respeto, evitando cualquier maltrato o negligencia.</li>
                                    <li>Actuar responsablemente ante emergencias (contactar al Usuario y/o veterinaria según lo acordado).</li>
                                    <li>Cumplir la normativa aplicable que le corresponda (incluida la tributaria), si aplica.</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">10</span>
                                Acuerdo Usuario–Proveedor (recomendación)
                            </h3>
                            <div className="pl-11">
                                <p className="mb-4">Pawnecta recomienda que Usuario y Proveedor de servicios dejen por escrito (por chat o correo, como mínimo):</p>
                                <ul className="list-disc pl-5 space-y-3 marker:text-emerald-500">
                                    <li>Fechas/horarios, lugar del cuidado y tareas específicas.</li>
                                    <li>Tarifa, forma de pago, reembolsos y política de cancelación.</li>
                                    <li>Contacto de emergencia, veterinaria y autorización de atención veterinaria con tope de gasto.</li>
                                    <li>Reglas del hogar (si aplica) y objetos restringidos.</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">11</span>
                                Contenido, perfiles y reseñas
                            </h3>
                            <div className="pl-11">
                                <ul className="list-disc pl-5 space-y-3 marker:text-emerald-500">
                                    <li>Cada usuario es responsable de su Contenido.</li>
                                    <li>Pawnecta puede moderar, ocultar o eliminar Contenido que infrinja estos Términos o represente riesgo.</li>
                                    <li>Las reseñas son opiniones de usuarios y no constituyen garantía de Pawnecta.</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">12</span>
                                Exención de responsabilidad de Pawnecta
                            </h3>
                            <div className="pl-11">
                                <p className="mb-4">En la máxima medida permitida por la ley:</p>
                                <ul className="list-disc pl-5 space-y-3 marker:text-emerald-500">
                                    <li>Pawnecta no garantiza identidad, conducta, experiencia, disponibilidad, idoneidad o resultados de ningún usuario, aun cuando exista Verificación.</li>
                                    <li>Pawnecta no es responsable por pérdidas, daños, robos, lesiones, accidentes, enfermedad o muerte de mascotas, daños a bienes o a terceros, ni por disputas de pago, cancelaciones o incumplimientos derivados del acuerdo directo entre Usuario y Proveedor de servicios.</li>
                                    <li>Pawnecta no responde por interrupciones del Sitio, fallas técnicas o indisponibilidad temporal.</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">13</span>
                                Asunción de riesgo
                            </h3>
                            <div className="pl-11">
                                <p>El Usuario y el Proveedor de servicios reconocen que el cuidado de mascotas y/o el ingreso a domicilios puede implicar riesgos. Al usar Pawnecta, asumen dichos riesgos y se obligan a tomar precauciones razonables (conversación previa, verificación básica, acuerdo escrito, etc.).</p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">14</span>
                                Indemnidad
                            </h3>
                            <div className="pl-11">
                                <p className="mb-4">El usuario que corresponda (Usuario y/o Proveedor de servicios) se obliga a mantener indemne a Pawnecta, Interactive SpA, sus directores, trabajadores y colaboradores frente a reclamos, acciones, pérdidas, sanciones y gastos (incluidos honorarios razonables) que se originen en:</p>
                                <ul className="list-disc pl-5 space-y-3 marker:text-emerald-500">
                                    <li>incumplimientos del acuerdo Usuario–Proveedor de servicios,</li>
                                    <li>infracciones legales,</li>
                                    <li>Contenido publicado,</li>
                                    <li>daños o incidentes ocurridos durante o con ocasión del Servicio de Cuidado Animal.</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">15</span>
                                Modificaciones del Sitio y de los Términos
                            </h3>
                            <div className="pl-11">
                                <p>Pawnecta puede modificar el Sitio y/o estos Términos. La versión vigente se publicará en el Sitio con su fecha de actualización. El uso posterior a la publicación constituye aceptación de los cambios.</p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">16</span>
                                Ley aplicable y jurisdicción
                            </h3>
                            <div className="pl-11">
                                <p>Estos Términos se rigen por las leyes de la República de Chile. Los conflictos se someterán a los tribunales competentes de Santiago, sin perjuicio de los derechos irrenunciables que pudieran aplicar según la normativa vigente.</p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">17</span>
                                Contacto
                            </h3>
                            <div className="pl-11">
                                <p>Para soporte, reportes o solicitudes: <a href="mailto:contacto@pawnecta.com" className="text-emerald-600 font-medium hover:underline">contacto@pawnecta.com</a>.</p>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
