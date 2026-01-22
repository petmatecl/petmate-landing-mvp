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
    // Add other relevant fields if needed globally
}

interface UserContextType {
    user: any | null; // Supabase user
    profile: UserProfile | null;
    roles: string[];
    activeRole: Role | null; // The role the user is currently ACTING as
    isLoading: boolean;
    isAuthenticated: boolean;
    switchRole: (role: Role) => void;
    logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserContextProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [activeRole, setActiveRole] = useState<Role | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const roles = profile?.roles || ['cliente']; // Default to cliente

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
                    // Handle edge case: User authenticated but no profile? -> Maybe redirect to onboarding
                }

                if (mounted && profileData) {
                    setProfile(profileData);

                    // 3. Determine Active Role
                    const validRoles = profileData.roles || ['cliente'];

                    // A. Check localStorage preference
                    const storedRole = window.localStorage.getItem('activeRole') as Role;

                    // B. Validate preference against REAL roles
                    if (storedRole && validRoles.includes(storedRole)) {
                        setActiveRole(storedRole);
                    } else {
                        // C. Default: prefer 'petmate' if available (sítter view), else 'cliente'
                        // Or logic: "If no role, send to onboarding" - handled by consumer/guard components if roles is empty?
                        // For now, default to the first available or specific logic
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
                // Determine if we need to re-fetch? Ideally yes to keep sync.
                // For MVP simplicity, we might just re-run init or partial set.
                // Re-running logic is safest.
                if (user?.id !== session.user.id) {
                    // initializeUser(); // Doing this might cause loops if not careful, handled by useEffect on mount/session check mostly.
                    // But onAuthStateChange fires on SIGN_IN, SIGN_OUT, TOKEN_REFRESH.
                    // For pure state sync, let's update user at least.
                    setUser(session.user);
                    // If switching accounts, profile needs update.
                }
            } else {
                setUser(null);
                setProfile(null);
                setActiveRole(null);
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
