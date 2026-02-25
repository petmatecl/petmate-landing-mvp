import { supabase } from './supabaseClient';

export type Role = 'cliente' | 'petmate' | 'admin';
export type OnboardingStep = 'EMAIL_VERIFIED' | 'ROLE_SELECTED' | 'PROFILE_BASIC' | 'COMPLETE';

export interface UserProfile {
    id?: string;
    auth_user_id?: string;
    nombre: string;
    apellido_p: string;
    apellido_m?: string;
    roles?: string[];
    // rol deleted
    foto_perfil?: string;
    aprobado?: boolean;
    // Add other fields as needed for specific logic (e.g. telefono for onboarding check)
    telefono?: string;
    rut?: string;
}

export interface UserCapabilities {
    canBook: boolean;
    canPublishProfile: boolean;
    canRespondToBooking: boolean;
    canReview: boolean;
    canViewSitterDashboard: boolean;
    canViewClientDashboard: boolean;
}

export const GUEST_CAPABILITIES: UserCapabilities = {
    canBook: false,
    canPublishProfile: false,
    canRespondToBooking: false,
    canReview: false,
    canViewSitterDashboard: false,
    canViewClientDashboard: false,
};

export const AuthService = {
    /**
     * Fetch full profile from Supabase
     */
    async fetchProfile(userId: string): Promise<UserProfile | null> {
        try {
            // Intenta registro_petmate primero (usuarios del modelo anterior)
            const { data: legacyData } = await supabase
                .from('registro_petmate')
                .select('id, auth_user_id, nombre, apellido_p, apellido_m, roles, foto_perfil, aprobado, telefono, rut')
                .eq('auth_user_id', userId)
                .single();

            if (legacyData) return legacyData;

            // Si no existe en registro_petmate, busca en proveedores (modelo nuevo)
            const { data: proveedorData } = await supabase
                .from('proveedores')
                .select('id, auth_user_id, nombre, apellido_p, apellido_m, roles, foto_perfil, estado, rut')
                .eq('auth_user_id', userId)
                .single();

            if (proveedorData) {
                // Normaliza al formato UserProfile
                return {
                    id: proveedorData.id,
                    auth_user_id: proveedorData.auth_user_id,
                    nombre: proveedorData.nombre,
                    apellido_p: proveedorData.apellido_p,
                    apellido_m: proveedorData.apellido_m,
                    roles: proveedorData.roles || ['proveedor'],
                    foto_perfil: proveedorData.foto_perfil,
                    aprobado: proveedorData.estado === 'aprobado',
                    rut: proveedorData.rut,
                };
            }

            return null;
        } catch (e) {
            console.error('AuthService: Unexpected error', e);
            return null;
        }
    },

    /**
     * Derive what a user CAN do based on their profile and roles.
     */
    deriveCapabilities(p: UserProfile | null): UserCapabilities {
        if (!p) return GUEST_CAPABILITIES;

        const userRoles = p.roles || ['cliente'];
        const isSitter = userRoles.includes('petmate');
        const isClient = userRoles.includes('cliente') || userRoles.length === 0;

        return {
            canBook: isClient, // Clients can book
            canPublishProfile: isSitter, // Only sitters can publish/edit profile
            canRespondToBooking: isSitter, // Only sitters respond to bookings
            canReview: true, // Generally authorized users can review (filtered by RLS)
            canViewSitterDashboard: isSitter,
            canViewClientDashboard: true, // Everyone basic access to client view
        };
    },

    /**
     * Calculate Onboarding Status based on profile completeness.
     */
    calculateOnboardingStatus(user: any, p: UserProfile | null): OnboardingStep {
        if (!user) return 'COMPLETE'; // Guest (handled elsewhere usually, or acts as complete guest)

        // 1. Profile Exists
        if (!p) return 'PROFILE_BASIC';

        // 2. Basic Fields
        if (!p.nombre || !p.apellido_p) return 'PROFILE_BASIC';

        // 3. Roles Selected
        const validRoles = p.roles || [];
        if (validRoles.length === 0) return 'ROLE_SELECTED';

        return 'COMPLETE';
    },

    /**
     * Determine active role based on user preference and validity
     */
    determineActiveRole(p: UserProfile | null, preferredRole: string | null): Role | null {
        if (!p) return null;
        const validRoles = p.roles || ['cliente'];

        // If preference is valid, use it
        if (preferredRole && (validRoles.includes(preferredRole) || (preferredRole === 'sitter' && validRoles.includes('petmate')))) {
            // normalizing sitter -> petmate if needed, but 'activeRole' type is 'cliente' | 'petmate'
            if (preferredRole === 'sitter') return 'petmate';
            return preferredRole as Role;
        }

        // Default: prefer 'petmate' (sitter) if available, else 'cliente'
        if (validRoles.includes('petmate')) return 'petmate';
        return 'cliente';
    }
};
