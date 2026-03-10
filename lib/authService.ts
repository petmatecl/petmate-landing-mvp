import { supabase } from './supabaseClient';

export type Role = 'usuario' | 'proveedor' | 'admin';
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
            const { data: proveedorData } = await supabase
                .from('proveedores')
                .select('id, auth_user_id, nombre, apellido_p, apellido_m, roles, foto_perfil, estado, rut')
                .eq('auth_user_id', userId)
                .maybeSingle();

            if (proveedorData) {
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

            const { data: buscadorData } = await supabase
                .from('usuarios_buscadores')
                .select('id, auth_user_id, nombre, apellido_p, apellido_m, foto_perfil')
                .eq('auth_user_id', userId)
                .maybeSingle();

            if (buscadorData) {
                return {
                    id: buscadorData.id,
                    auth_user_id: buscadorData.auth_user_id,
                    nombre: buscadorData.nombre,
                    apellido_p: buscadorData.apellido_p,
                    apellido_m: buscadorData.apellido_m,
                    roles: ['usuario'],
                    foto_perfil: buscadorData.foto_perfil,
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

        const userRoles = p.roles || ['usuario'];
        const isProveedor = userRoles.includes('proveedor') || userRoles.includes('admin');
        const isClient = userRoles.includes('usuario') || userRoles.length === 0;

        return {
            canBook: isClient,
            canPublishProfile: isProveedor,
            canRespondToBooking: isProveedor,
            canReview: true,
            canViewSitterDashboard: isProveedor,
            canViewClientDashboard: true,
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
        const validRoles = p.roles || ['usuario'];

        // If preference is valid, use it
        if (preferredRole && validRoles.includes(preferredRole)) {
            return preferredRole as Role;
        }

        // Default: prefer 'proveedor' if available, else 'usuario'
        if (validRoles.includes('proveedor') || validRoles.includes('admin')) return 'proveedor';
        return 'usuario';
    }
};
