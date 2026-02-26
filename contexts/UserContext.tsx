import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

// Types
type Role = 'usuario' | 'proveedor' | 'admin';

interface UserProfile {
    nombre: string;
    apellido_p: string;
    apellido_m?: string;
    roles?: string[];
    foto_perfil?: string;
    aprobado?: boolean;
}

export interface UserCapabilities {
    canBook: boolean;
    canPublishProfile: boolean;
    canRespondToBooking: boolean;
    canReview: boolean;
    canViewSitterDashboard: boolean;
    canViewClientDashboard: boolean;
}

export type OnboardingStep = 'EMAIL_VERIFIED' | 'ROLE_SELECTED' | 'PROFILE_BASIC' | 'COMPLETE';

interface UserContextType {
    user: any | null; // Supabase user
    profile: UserProfile | null;
    roles: string[];
    activeRole: Role | null; // Keep for backwards compatibility if needed, but we migrate to modes
    activeMode: 'buscador' | 'proveedor' | null;
    canSwitchMode: boolean;
    providerStatus: 'none' | 'pendiente' | 'aprobado';
    capabilities: UserCapabilities; // What the user CAN actually do
    onboardingStatus: OnboardingStep;
    isLoading: boolean;
    isAuthenticated: boolean;
    switchMode: (mode: 'buscador' | 'proveedor') => void;
    activateProviderMode: () => void;
    switchRole: (role: Role) => void;
    refreshProfile: () => Promise<void>;
    logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Default safe capabilities (guest)
const GUEST_CAPABILITIES: UserCapabilities = {
    canBook: false,
    canPublishProfile: false,
    canRespondToBooking: false,
    canReview: false,
    canViewSitterDashboard: false,
    canViewClientDashboard: false,
};

export function UserContextProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [activeRole, setActiveRole] = useState<Role | null>(null);
    const [activeMode, setActiveMode] = useState<'buscador' | 'proveedor' | null>(null);
    const [canSwitchMode, setCanSwitchMode] = useState(false);
    const [providerStatus, setProviderStatus] = useState<'none' | 'pendiente' | 'aprobado'>('none');
    const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStep>('COMPLETE'); // Default optimistic

    // Derived Capabilities State
    const [capabilities, setCapabilities] = useState<UserCapabilities>(GUEST_CAPABILITIES);

    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const roles = profile?.roles || ['usuario']; // Default to usuario

    // Derive Capabilities Logic
    const deriveCapabilities = (p: UserProfile | null): UserCapabilities => {
        if (!p) return GUEST_CAPABILITIES;

        const userRoles = p.roles || [];
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
    };

    // Calculate Onboarding Status
    const calculateOnboardingStatus = (u: any, p: UserProfile | null): OnboardingStep => {
        if (!u) return 'COMPLETE'; // Guest doesn't have onboarding per se

        // 1. Profile Exists
        if (!p) return 'PROFILE_BASIC';

        // 2. Basic Fields
        if (!p.nombre || !p.apellido_p) return 'PROFILE_BASIC';

        // 3. Roles Selected
        if (!p.roles || p.roles.length === 0) return 'ROLE_SELECTED';

        return 'COMPLETE';
    };

    const initializeUser = async () => {
        try {
            // 1. Get Session
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                setUser(null);
                setProfile(null);
                setActiveRole(null);
                setActiveMode('buscador'); // Default para no logueados
                setCanSwitchMode(false);
                setProviderStatus('none');
                setCapabilities(GUEST_CAPABILITIES);
                setOnboardingStatus('COMPLETE');
                setIsLoading(false);
                return;
            }

            setUser(session.user);

            // 2. Consultar `proveedores` 
            const { data: proveedorData } = await supabase
                .from('proveedores')
                .select('id, nombre, apellido_p, roles, foto_perfil, estado')
                .eq('auth_user_id', session.user.id)
                .single();

            // 3. Consultar `usuarios_buscadores`
            const { data: seekerData } = await supabase
                .from('usuarios_buscadores')
                .select('id, nombre, apellido_p')
                .eq('auth_user_id', session.user.id)
                .single();

            const hasApprovedProvider = proveedorData?.estado === 'aprobado';
            const statusOfProvider = proveedorData ? proveedorData.estado : 'none';
            const hasSeeker = !!seekerData;

            // Reconstruir un perfil general para compatibilidad
            let finalProfile: UserProfile | null = null;
            if (proveedorData) {
                finalProfile = {
                    nombre: proveedorData.nombre,
                    apellido_p: proveedorData.apellido_p,
                    roles: proveedorData.roles || ['proveedor'],
                    foto_perfil: proveedorData.foto_perfil,
                    aprobado: proveedorData.estado === 'aprobado'
                };
            } else if (seekerData) {
                finalProfile = {
                    nombre: seekerData.nombre,
                    apellido_p: seekerData.apellido_p,
                    roles: ['usuario'],
                    aprobado: true // Los usuarios básicos no se moderan
                };
            }

            const status = calculateOnboardingStatus(session.user, finalProfile);

            setProfile(finalProfile);
            setCapabilities(deriveCapabilities(finalProfile));
            setOnboardingStatus(status);
            setProviderStatus(statusOfProvider as 'none' | 'pendiente' | 'aprobado');

            // Dual Role State resolution
            const canSwitch = hasApprovedProvider && hasSeeker;
            setCanSwitchMode(canSwitch);

            let determinedMode: 'buscador' | 'proveedor' = 'buscador';

            if (canSwitch) {
                const savedMode = window.localStorage.getItem('pawnecta_active_mode');
                determinedMode = (savedMode === 'proveedor' || savedMode === 'buscador') ? savedMode : 'buscador';
            } else if (hasApprovedProvider) {
                determinedMode = 'proveedor';
            } else {
                // includes only seeker, or neither (new signups)
                determinedMode = 'buscador';
            }

            setActiveMode(determinedMode);

            // --- Set activeRole Logic ---
            if (finalProfile) {
                const validRoles = finalProfile.roles || ['usuario'];

                // Set Admin Role Dynamically from DB, NO HARDCODED EMAILS.
                // Requerimos que esté en 'proveedores' con el array de strings con 'admin' y estado aprobado
                if (proveedorData?.roles?.includes('admin') && proveedorData?.estado === 'aprobado') {
                    if (!validRoles.includes('admin')) {
                        validRoles.push('admin');
                    }
                }

                // For backwards compatibility, sync activeRole to mode
                if (determinedMode === 'proveedor') setActiveRole('proveedor');
                else if (determinedMode === 'buscador') setActiveRole('usuario');
                else setActiveRole(null);
            }

        } catch (err) {
            console.error("UserContext Init Error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;

        const runInit = async () => {
            if (mounted) await initializeUser();
        };

        runInit();

        // Listen for Auth Changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN') {
                if (mounted) await initializeUser();
            } else if (event === 'SIGNED_OUT') {
                if (mounted) {
                    setUser(null);
                    setProfile(null);
                    setActiveRole(null);
                    setActiveMode('buscador');
                    setCanSwitchMode(false);
                    setProviderStatus('none');
                    setCapabilities(GUEST_CAPABILITIES);
                    setOnboardingStatus('COMPLETE');
                    setIsLoading(false);
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const switchRole = (role: Role) => {
        if (roles.includes(role)) {
            setActiveRole(role);
            window.localStorage.setItem('activeRole', role);
            if (role === 'proveedor') router.push('/proveedor');
            else if (role === 'admin') router.push('/admin');
            else router.push('/usuario');
        }
    };

    const switchMode = (mode: 'buscador' | 'proveedor') => {
        setActiveMode(mode);
        window.localStorage.setItem('pawnecta_active_mode', mode);
        // also sync activeRole
        if (mode === 'proveedor') setActiveRole('proveedor');
        else setActiveRole('usuario');
    };

    const activateProviderMode = () => {
        console.log("activateProviderMode called");
    };

    const refreshProfile = async () => {
        setIsLoading(true);
        await initializeUser();
    };

    const logout = async () => {
        // 1. Limpiar estado local PRIMERO
        setUser(null);
        setProfile(null);
        setActiveRole(null);
        setActiveMode('buscador');
        setCanSwitchMode(false);
        setProviderStatus('none');
        setCapabilities(GUEST_CAPABILITIES);

        // 2. Limpiar localStorage
        window.localStorage.removeItem('activeRole');
        window.localStorage.removeItem('pm_auth_role_pending');
        window.localStorage.removeItem('pawnecta_active_mode');
        window.localStorage.removeItem('pawnecta_pending_role');

        // 3. Sign out de Supabase
        await supabase.auth.signOut();

        // 4. Redirect con window.location para forzar recarga completa
        window.location.href = '/';
    };

    return (
        <UserContext.Provider value={{
            user,
            profile,
            roles,
            activeRole,
            activeMode,
            canSwitchMode,
            providerStatus,
            capabilities,
            onboardingStatus,
            isLoading,
            isAuthenticated: !!user,
            switchMode,
            activateProviderMode,
            switchRole,
            refreshProfile,
            logout
        }}>
            {children}
        </UserContext.Provider>
    );
}

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserContextProvider');
    }
    return context;
};
