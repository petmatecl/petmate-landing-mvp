export interface ChatUser {
    id: string;
    nombre: string;
    apellido_p: string;
    foto_perfil: string | null;
}

export interface Conversation {
    id: string;
    client_id: string;
    sitter_id: string;
    created_at: string;
    updated_at: string;
    client?: ChatUser;
    sitter?: ChatUser;
    last_message?: string;
    unread_count?: number;
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    read: boolean;
    created_at: string;
}
