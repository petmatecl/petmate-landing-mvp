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

    // Sprint c-higiene DEAD-USR (2026-09-15): la ruta /usuario fue retirada
    // (redirect 307 → /explorar en next.config.js:207-210, commit 4d0f42d
    // abril 2026). Los comentarios previos hablaban de "Login redirects to
    // /usuario or /sitter" y "we might be on /usuario (protected)" — ambos
    // stale. Hoy el gate real es: login redirige por rol al panel apropiado
    // (/proveedor si es proveedor, /admin si es admin, /explorar si es tutor
    // puro). Este interceptor solo aplica cuando el user autenticado tiene
    // 2+ roles y necesita elegir activeRole al primer aterrizaje.

    // Exclude Admin from interception too
    const isExcludedRoute = ['/logout', '/register', '/login', '/admin', '/reset-password', '/forgot-password'].includes(router.pathname);
    if (isExcludedRoute) return null;

    // If only one role, set it silently without redirect
    if (roles.length === 1) {
        // Don't use switchRole (it navigates) — just set the state directly
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('activeRole', roles[0]);
        }
        return null;
    }

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
