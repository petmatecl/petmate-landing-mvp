import React from 'react';
import { useUser } from '../../contexts/UserContext';
import { RoleSelector, Role } from './RoleSelector';
import { useRouter } from 'next/router';

export const RoleSelectionInterceptor: React.FC = () => {
    const { isAuthenticated, activeRole, roles, profile, switchRole, isLoading } = useUser();
    const router = useRouter();

    // If loading or not authenticated, do nothing (let other guards handle it)
    if (isLoading || !isAuthenticated) return null;

    // Logic: If authenticated, but no activeRole is set, AND we have valid roles to choose from.
    // If activeRole is set, we don't need to intercept.
    if (activeRole) return null;

    // Special case: If user is in onboarding (no roles yet), don't intercept here (Register page handles it)
    if (roles.length === 0) return null;

    // If we are already on a page that handles this (like login or register), maybe don't intercept?
    // Actually, Login page redirects to /usuario or /sitter.
    // If we are here, we might be on / or /usuario (protected).
    // If we are on / (HomePage), maybe we want to let them browse as guest? 
    // BUT user IS authenticated. "Logged in as guest" is weird.
    // Pawnecta logic: If logged in, you act as Client or Sitter.
    // So YES, intercept everywhere except maybe 'register' or 'logout'.

    // Exclude Admin from interception too
    const isExcludedRoute = ['/logout', '/register', '/login', '/admin'].includes(router.pathname) || router.pathname.startsWith('/usuario') || router.pathname.startsWith('/sitter');
    if (isExcludedRoute) return null;

    // If only one role, UserContext should have auto-selected it. 
    // If it didn't, it means we have multiple roles and no preference.

    const handleSelect = (role: Role) => {
        switchRole(role);
        // UserContext switchRole handles the redirect and storage update
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full relative animate-in zoom-in-95 duration-300">
                <RoleSelector
                    userName={profile?.nombre || 'Usuario'}
                    roles={roles} // Use roles from context (UserContext) which now includes admin
                    onSelect={handleSelect}
                    showTitle={true}
                />
            </div>
        </div>
    );
};
