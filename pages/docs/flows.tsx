import React, { useEffect, useState } from "react";
import Head from "next/head";
import mermaid from "mermaid";
import { X, ZoomIn } from "lucide-react";

// Diagram Definition Type
type FlowDiagram = {
    title: string;
    description: string;
    code: string;
};

const DIAGRAMS: FlowDiagram[] = [
    {
        title: "1. Autenticación y Registro",
        description: "Flujo de inicio de sesión, registro (dueño vs sitter) y recuperación de contraseña.",
        code: `graph TD
    A[Inicio] --> B{¿Tiene Cuenta?}
    B -- Sí --> C[Login]
    B -- No --> D[Seleccionar Rol]
    D --> E[Registro Dueño]
    D --> F[Registro Sitter]
    
    C --> G{¿Credenciales Válidas?}
    G -- No --> C
    G -- Sí --> H[Dashboard]

    E --> I[Completar Perfil Dueño]
    F --> J[Completar Perfil Sitter]
    
    subgraph Sitter Onboarding
    J --> K[Datos Personales]
    K --> L[Experiencia y Tarifas]
    L --> M[Fotos y Descripción]
    M --> N[Estado: Pendiente Aprobación]
    end`
    },
    {
        title: "2. Prerrequisitos de Reserva (Onboarding)",
        description: "Verifica que el usuario tenga mascotas y dirección antes de reservar.",
        code: `graph TD
    A[Usuario intenta Reservar] --> B{¿Tiene Mascotas?}
    B -- No --> C[Redirigir: Agregar Mascota]
    C --> C1{¿Mascota Guardada?}
    C1 -- Sí --> B
    C1 -- Cancelar --> Z[Volver al Dashboard]
    
    B -- Sí --> D{¿Tiene Dirección?}
    D -- No --> E[Redirigir: Agregar Dirección]
    E --> E1{¿Dirección Guardada?}
    E1 -- Sí --> A
    E1 -- Cancelar --> Z
    
    D -- Sí --> F[Permitir Flujo de Reserva]`
    },
    {
        title: "3. Interacción End-to-End (Búsqueda a Confirmación)",
        description: "El viaje completo desde buscar servicio hasta el final (MVP).",
        code: `sequenceDiagram
    actor Owner as Dueño
    participant App as Plataforma
    actor Sitter as Sitter

    Owner->>App: Busca Sitter (Fechas/Comuna)
    App-->>Owner: Muestra Resultados
    Owner->>Sitter: Envía Solicitud (Estado: Postulado)
    
    alt Sitter Acepta (Happy Path)
        Sitter->>App: Clic "Aceptar Solicitud"
        App->>App: Cambia estado a "Confirmado"
        App-->>Owner: Notificar "Solicitud Aceptada"
        App-->>Owner: Liberar Datos de Contacto
        App-->>Sitter: Liberar Datos de Contacto
    else Sitter Rechaza
        Sitter->>App: Clic "Rechazar"
        App->>App: Cambia estado a "Rechazado" (Final)
        App-->>Owner: Notificar "No disponible"
    else No Responde (Timeout 24h)
        App->>App: Cron Job: Expirar Solicitud
        App->>App: Cambia estado a "Cancelado/Expirado"
        App-->>Owner: Notificar "Sin respuesta"
    end

    opt Cancelación Post-Confirmación
        Owner->>App: Clic "Cancelar Servicio"
        App->>App: Cambia estado a "Cancelado"
        App-->>Sitter: Email de Cancelación
        Note right of App: Aunque no haya reembolso (MVP),<br/>se libera la agenda del Sitter.
    end`
    },
    {
        title: "4. Lógica de Aplicación del Sitter",
        description: "Cómo maneja el Sitter las nuevas solicitudes.",
        code: `graph TD
    A[Nueva Solicitud Recibida] --> B{¿Está Disponible?}
    B -- No --> C[Rechazar / Ignorar]
    C --> D[Estado: Rechazado]
    
    B -- Sí --> E[Revisar Detalles]
    E --> F{¿Acepta el trabajo?}
    F -- Sí --> G[Clic 'Aceptar Solicitud']
    G --> H[Estado: Confirmado]
    G --> I[Intercambio de Contactos]
    
    F -- No --> C`
    },
    {
        title: "5. Gestión del Dashboard",
        description: "Vistas principales para cada rol.",
        code: `graph LR
    subgraph OwnerDash ["Owner Dashboard"]
    A[Mis Mascotas]
    B[Buscar Sitters]
    C[Mis Solicitudes]
    end
    
    subgraph SitterDash ["Sitter Dashboard"]
    D[Mi Perfil Público]
    E[Solicitudes Recibidas]
    F[Calendario/Disponibilidad]
    end`
    },
    {
        title: "6. Flujo de Reseñas Post-Servicio",
        description: "Proceso de calificación activado por email.",
        code: `graph LR
    A[Fin del Servicio (Confirmado)] --> B(Espera del Sistema 1 día)
    B --> C[Enviar Email de Reseña]
    C --> D[Clic en Enlace]
    D --> E[Formulario de Reseña]
    E --> F[Enviar Estrellas/Comentario]
    F --> G[Actualizar Promedio Sitter]
    G --> H[Mostrar en Perfil Público]`
    },
    {
        title: "7. Ciclo de Vida y Visibilidad de Datos",
        description: "Estados unificados y reglas de privacidad.",
        code: `stateDiagram-v2
    direction LR
    
    state "1. PUBLICADO<br/>(Solicitud Abierta)" as Open {
        state "Vista Dueño<br/>(Ve detalles completos)" as OV1
        state "Vista Sitter<br/>❌ Sin Privacidad<br/>✅ Datos Básicos" as SV1
    }

    state "2. POSTULADO<br/>(Negociación)" as Applied {
        state "Vista Dueño<br/>✅ Perfil Público Sitter<br/>❌ Sin Contacto Directo" as OV2
        state "Vista Sitter<br/>✅ Chat Habilitado" as SV2
    }

    state "3. CONFIRMADO<br/>(Servicio Agendado)" as Confirmed {
        state "Vista de Ambos<br/>✅ Nombres Completos<br/>✅ Teléfono y Email<br/>✅ Dirección Exacta<br/>✅ Ficha de Servicio" as BV3
    }

    [*] --> Open : Usuario Publica
    Open --> Applied : Sitter Postula
    Applied --> Confirmed : Sitter Acepta
    Applied --> Open : Sitter Rechaza / Expira
    Confirmed --> [*] : Servicio Completado
    Confirmed --> Open : Cancelación (Reset)`
    }
];

export default function DocsFlowsPage() {
    const [selectedDiagram, setSelectedDiagram] = useState<FlowDiagram | null>(null);

    useEffect(() => {
        mermaid.run({ querySelector: '.mermaid' });
    }, [selectedDiagram]);

    // Re-render mermaid when modal opens too
    useEffect(() => {
        if (selectedDiagram) {
            setTimeout(() => {
                mermaid.run({ querySelector: '.mermaid-modal' });
            }, 100);
        }
    }, [selectedDiagram]);

    return (
        <div className="font-outfit min-h-screen bg-slate-50">
            <Head>
                <title>Documentación de Flujos | Pawnecta</title>
                <meta name="robots" content="noindex" />
            </Head>

            {/* Modal for Zoom */}
            {selectedDiagram && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setSelectedDiagram(null)}>
                    <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{selectedDiagram.title}</h3>
                                <p className="text-sm text-slate-500">{selectedDiagram.description}</p>
                            </div>
                            <button
                                onClick={() => setSelectedDiagram(null)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-8 overflow-auto flex-1 bg-white cursor-move flex items-center justify-center">
                            <div className="mermaid mermaid-modal w-full h-full flex items-center justify-center text-center">
                                {selectedDiagram.code}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="container mx-auto px-4 py-12 max-w-5xl">
                <div className="mb-12 text-center">
                    <h1 className="text-3xl font-bold text-slate-900 mb-4">Documentación de Flujos de Usuario</h1>
                    <p className="text-slate-600 max-w-2xl mx-auto mb-6">
                        Referencia visual de los procesos core de la plataforma (MVP).
                    </p>

                    {/* Metadata de Control */}
                    <div className="inline-flex flex-col sm:flex-row gap-4 sm:gap-8 bg-white px-6 py-3 rounded-xl border border-slate-200 shadow-sm text-xs text-left">
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider">Versión</span>
                            <span className="font-mono text-slate-700">v1.2.0 (MVP Launch)</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider">Última Act.</span>
                            <span className="font-mono text-slate-700">20 Ene 2026</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider">Owner</span>
                            <span className="font-mono text-slate-700">Product Team</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider">Changelog</span>
                            <span className="font-mono text-slate-700">Unificación de Estados</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-12">
                    {DIAGRAMS.map((diagram, index) => (
                        <div key={index} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-gray-50">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">{diagram.title}</h2>
                                    <p className="text-sm text-slate-500">{diagram.description}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedDiagram(diagram)}
                                    className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-white hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 transition-all shadow-sm"
                                >
                                    <ZoomIn size={16} />
                                    Ampliar
                                </button>
                            </div>
                            <div className="p-8 overflow-x-auto flex justify-center bg-white min-h-[200px] items-center">
                                <div className="mermaid w-full text-center">
                                    {diagram.code}
                                </div>
                            </div>
                            {/* Privacy / Security Note for Data Visibility Diagram */}
                            {index === 6 && (
                                <div className="bg-blue-50 px-6 py-3 border-t border-blue-100 flex items-start gap-3">
                                    <div className="mt-0.5 text-blue-500">ℹ️</div>
                                    <p className="text-xs text-blue-800">
                                        <strong>Política de Privacidad:</strong> Los datos de contacto sensibles (teléfono, email, dirección exacta)
                                        se comparten <u>únicamente</u> cuando ambas partes han confirmado el servicio. En etapas previas, la plataforma actúa como intermediario ciego para proteger la privacidad.
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center text-slate-400 text-sm">
                    Generado con Mermaid.js • Pawnecta MVP
                </div>
            </div>
        </div>
    );
}
