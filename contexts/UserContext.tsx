import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

// Types
type Role = 'cliente' | 'petmate';

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
    activeRole: Role | null; // The role the user is currently ACTING as
    capabilities: UserCapabilities; // What the user CAN actually do
    onboardingStatus: OnboardingStep; // New: Onboarding State
    isLoading: boolean;
    isAuthenticated: boolean;
    switchRole: (role: Role) => void;
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
    const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStep>('COMPLETE'); // Default optimistic

    // Derived Capabilities State
    const [capabilities, setCapabilities] = useState<UserCapabilities>(GUEST_CAPABILITIES);

    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const roles = profile?.roles || ['cliente']; // Default to cliente

    // Derive Capabilities Logic
    const deriveCapabilities = (p: UserProfile | null): UserCapabilities => {
        if (!p) return GUEST_CAPABILITIES;

        const userRoles = p.roles || [];
        const isSitter = userRoles.includes('petmate');
        const isClient = userRoles.includes('cliente') || userRoles.length === 0;

        return {
            canBook: isClient,
            canPublishProfile: isSitter,
            canRespondToBooking: isSitter,
            canReview: true,
            canViewSitterDashboard: isSitter,
            canViewClientDashboard: true,
        };
    };

    // Calculate Onboarding Status
    const calculateOnboardingStatus = (u: any, p: UserProfile | null): OnboardingStep => {
        if (!u) return 'COMPLETE'; // Guest doesn't have onboarding per se
        // 1. Email Verified (Supabase Auth usually handles this, but we can check u.email_confirmed_at)
        // For MVP, if they are logged in, we assume verified unless we enforce strict mode.
        // if (!u.email_confirmed_at) return 'EMAIL_VERIFIED'; 

        // 2. Profile Exists
        if (!p) return 'PROFILE_BASIC';

        // 3. Basic Fields
        if (!p.nombre || !p.apellido_p) return 'PROFILE_BASIC';

        // 4. Roles Selected
        if (!p.roles || p.roles.length === 0) return 'ROLE_SELECTED';

        return 'COMPLETE';
    };

    useEffect(() => {
        let mounted = true;

        const initializeUser = async () => {
            try {
                // 1. Get Session
                const { data: { session } } = await supabase.auth.getSession();

                if (!session?.user) {
                    if (mounted) {
                        setUser(null);
                        setProfile(null);
                        setActiveRole(null);
                        setCapabilities(GUEST_CAPABILITIES);
                        setOnboardingStatus('COMPLETE'); // Guests fine
                        setIsLoading(false);
                    }
                    return;
                }

                if (mounted) setUser(session.user);

                // 2. Fetch Profile (Source of Truth for Roles)
                const { data: profileData, error } = await supabase
                    .from('registro_petmate')
                    .select('nombre, apellido_p, apellido_m, roles, foto_perfil, aprobado')
                    .eq('auth_user_id', session.user.id)
                    .single();

                if (error) {
                    console.error('Error fetching profile:', error);
                    // If 406/404, profile might be missing -> Onboarding needed
                }

                if (mounted) {
                    // Check if profile exists, if not, we clearly need BASIC profile
                    const finalProfile = profileData || null;
                    const status = calculateOnboardingStatus(session.user, finalProfile);

                    setProfile(finalProfile);
                    setCapabilities(deriveCapabilities(finalProfile));
                    setOnboardingStatus(status);

                    // 3. Determine Active Role
                    if (finalProfile) {
                        const validRoles = finalProfile.roles || ['cliente'];
                        const storedRole = window.localStorage.getItem('activeRole') as Role;

                        // Priority 1: Stored Preference (if valid)
                        if (storedRole && validRoles.includes(storedRole)) {
                            setActiveRole(storedRole);
                        } 
                        // Priority 2: Single Role available (Auto-select)
                        else if (validRoles.length === 1) {
                            setActiveRole(validRoles[0] as Role);
                        }
                        // Priority 3: Ambiguous (Multiple roles, no preference)
                        // Do NOT set activeRole. Keep it null.
                        // The RoleSelectionInterceptor will catch this state and prompt the user.
                        else {
                            setActiveRole(null); 
                        }
                    }
                }

            } catch (err) {
                console.error("UserContext Init Error:", err);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        initializeUser();

        // Listen for Auth Changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                if (user?.id !== session.user.id) {
                    setUser(session.user);
                    // Re-run init logic via effect trigger or manual call if needed
                    initializeUser();
                }
            } else {
                setUser(null);
                setProfile(null);
                setActiveRole(null);
                setCapabilities(GUEST_CAPABILITIES);
                setOnboardingStatus('COMPLETE');
                setIsLoading(false);
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
            if (role === 'petmate') router.push('/sitter');
            else router.push('/usuario');
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setActiveRole(null);
        setCapabilities(GUEST_CAPABILITIES);
        setActiveRole(null);
        window.localStorage.removeItem('activeRole');
        window.localStorage.removeItem("pm_auth_role_pending");
        router.push('/');
    };

    return (
        <UserContext.Provider value={{
            user,
            profile,
            roles,
            activeRole,
            capabilities,
            onboardingStatus,
            isLoading,
            isAuthenticated: !!user,
            switchRole,
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
