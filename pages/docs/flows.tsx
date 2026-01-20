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
        description: "El viaje completo desde buscar servicio hasta el final (MVP: Sin Pagos).",
        code: `sequenceDiagram
    actor Owner as Dueño
    participant App as Plataforma
    actor Sitter as Sitter

    Owner->>App: Busca Sitter (Fechas/Comuna)
    App-->>Owner: Muestra Resultados
    Owner->>Sitter: Envía Solicitud (Estado: Pendiente)
    
    alt Sitter Acepta
        Sitter->>App: Clic "Aceptar Solicitud"
        App->>App: Cambia estado a "Confirmado"
        App-->>Owner: Notificar "Solicitud Aceptada"
        App-->>Owner: Enviar Datos de Contacto (Ficha)
        App-->>Sitter: Enviar Datos de Contacto (Ficha)
        Note over Owner,Sitter: Pago/Coordinación final ocurre fuera (MVP)
    else Sitter Rechaza
        Sitter->>App: Clic "Rechazar"
        App-->>Owner: Notificar "No disponible"
    else No Responde (Timeout 24h)
        App->>App: Expirar Solicitud
        App-->>Owner: Notificar "Sin respuesta"
    end

    opt Cancelación Previa
        Owner->>App: Cancelar Servicio
        App-->>Sitter: Notificar Cancelación
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
    G --> H[Viaje Confirmado]
    G --> I[Intercambio de Contactos]
    
    F -- No --> C`
    },
    {
        title: "5. Gestión del Dashboard",
        description: "Vistas principales para cada rol.",
        code: `graph LR
    subgraph "Owner Dashboard"
    A[Mis Mascotas]
    B[Buscar Sitters]
    C[Mis Solicitudes]
    end
    
    subgraph "Sitter Dashboard"
    D[Mi Perfil Publico]
    E[Solicitudes Recibidas]
    F[Calendario/Disponibilidad]
    end`
    },
    {
        title: "6. Flujo de Reseñas Post-Servicio",
        description: "Proceso de calificación activado por email.",
        code: `graph LR
    A[Fin del Servicio] --> B(Espera del Sistema 1 día)
    B --> C[Enviar Email de Reseña]
    C --> D[Clic en Enlace]
    D --> E[Formulario de Reseña]
    E --> F[Enviar Estrellas/Comentario]
    F --> G[Actualizar Promedio Sitter]
    G --> H[Mostrar en Perfil Público]`
    },
    {
        title: "7. Ciclo de Vida y Visibilidad de Datos",
        description: "Muestra exactamente qué datos ve cada parte en cada etapa.",
        code: `stateDiagram-v2
    direction LR
    
    state "1. Solicitud Abierta (Publicado)" as Open {
        state "Vista Dueño" as OV1
        OV1 : Ve detalles completos
        
        state "Vista Sitter (Explorar)" as SV1
        SV1 : ❌ Sin Contacto<br/>❌ Sin Dirección Exacta<br/>✅ Nombre Dueño (Solo Pila)<br/>✅ Comuna (Aprox)<br/>✅ Datos Mascotas<br/>✅ Fechas Servicio
    }

    state "2. Negociación (Postulado)" as Applied {
        state "Vista Dueño" as OV2
        OV2 : ✅ Perfil Sitter (Público)<br/>✅ Precio Propuesto<br/>❌ Tel/Email Sitter oculto
        
        state "Vista Sitter" as SV2
        SV2 : Estado: Postulado<br/>Chat Abierto<br/>✅ Nombre Dueño (Solo Pila)
    }

    state "3. Confirmado (Programado)" as Confirmed {
        state "Vista de Ambos" as BV3
        BV3 : ✅ Nombres Legales Completos<br/>✅ Teléfono y Email<br/>✅ Dirección Exacta<br/>✅ Ficha de Servicio (PDF)
    }

    [*] --> Open : Usuario Publica
    Open --> Applied : Sitter Postula
    Applied --> Confirmed : Dueño Acepta
    Applied --> Open : Dueño Rechaza
    Confirmed --> [*] : Servicio Completado`
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
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        Referencia visual de los procesos core de la plataforma (MVP).
                        Estos diagramas representan el comportamiento implementado actualmente.
                    </p>
                    <div className="mt-4 inline-block px-4 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold border border-amber-200">
                        CONFIDENCIAL / USO INTERNO
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
