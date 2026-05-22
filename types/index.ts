// Tipos compartidos del proyecto Pawnecta
// Para mayor especificidad, ServiceResult completo sigue viviendo en components/Explore/ServiceCard.tsx

export type PoliticaCancelacion = 'flexible' | 'moderada' | 'estricta';

export interface ProveedorProfile {
    id: string;
    auth_user_id: string;
    nombre: string;
    apellido_p: string;
    apellido_m?: string;
    foto_perfil?: string;
    comuna?: string;
    comunas_cobertura?: string[];
    estado: 'pendiente' | 'aprobado' | 'rechazado' | 'suspendido';
    roles?: string[];
    created_at: string;
    // Eje B — Sprint perfil completo del proveedor.
    facebook?: string | null;
    tiktok?: string | null;
    youtube?: string | null;
    idiomas?: string[];
    politica_cancelacion?: PoliticaCancelacion | null;
    politica_cancelacion_nota?: string | null;
}

export interface ConversationItem {
    id: string;
    client_id: string;
    sitter_id: string;
    created_at: string;
    last_message?: string;
    last_message_at?: string;
}
