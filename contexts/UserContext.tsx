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

interface UserContextType {
    user: any | null; // Supabase user
    profile: UserProfile | null;
    roles: string[];
    activeRole: Role | null; // The role the user is currently ACTING as
    capabilities: UserCapabilities; // What the user CAN actually do
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
        const isClient = userRoles.includes('cliente') || userRoles.length === 0; // Assume client basic access if auth

        return {
            canBook: isClient, // Clients can book
            canPublishProfile: isSitter, // Only sitters can publish/edit profile
            canRespondToBooking: isSitter, // Only sitters respond to bookings
            canReview: true, // Generally authorized users can review (filtered by RLS anyway)
            canViewSitterDashboard: isSitter,
            canViewClientDashboard: true, // Everyone basic access to client view
        };
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
                }

                if (mounted && profileData) {
                    setProfile(profileData);
                    setCapabilities(deriveCapabilities(profileData));

                    // 3. Determine Active Role
                    const validRoles = profileData.roles || ['cliente'];

                    // A. Check localStorage preference
                    const storedRole = window.localStorage.getItem('activeRole') as Role;

                    // B. Validate preference against REAL roles
                    if (storedRole && validRoles.includes(storedRole)) {
                        setActiveRole(storedRole);
                    } else {
                        // C. Default: prefer 'petmate' if available (sítter view), else 'cliente'
                        if (validRoles.includes('petmate')) {
                            setActiveRole('petmate');
                        } else {
                            setActiveRole('cliente');
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
                    // Ideally trigger re-fetch of profile here or rely on the route change/init cycle
                    // For MVP, we'll let the init logic run on mount or page refresh mostly, 
                    // but a full re-init might be safer if user switching is common.
                }
            } else {
                setUser(null);
                setProfile(null);
                setActiveRole(null);
                setCapabilities(GUEST_CAPABILITIES);
                setIsLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const switchRole = (role: Role) => {
        // Validate again!
        if (roles.includes(role)) {
            setActiveRole(role);
            window.localStorage.setItem('activeRole', role);

            // Optional: Redirect to dashboard of that role?
            if (role === 'petmate') router.push('/sitter');
            else router.push('/usuario');
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setActiveRole(null);
        setCapabilities(GUEST_CAPABILITIES); // Reset caps
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
