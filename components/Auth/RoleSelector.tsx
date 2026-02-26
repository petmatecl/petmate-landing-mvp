import React from 'react';

export type Role = 'usuario' | 'proveedor' | 'admin';

interface RoleSelectorProps {
  userName: string;
  roles?: string[]; // Optional for backward compat, defaults to showing client/sitter
  onSelect: (role: Role) => void;
  showTitle?: boolean;
}

const UserIcon = (props: any) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const PawIcon = (props: any) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="5" r="2.5" />
    <circle cx="19" cy="8" r="2.5" />
    <circle cx="5" cy="8" r="2.5" />
    <path d="M12 12c-2.5 0-4.5 2-4.5 4.5S9.5 21 12 21s4.5-2 4.5-4.5S14.5 12 12 12z" />
  </svg>
);

const ShieldIcon = (props: any) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const RoleSelector: React.FC<RoleSelectorProps> = ({ userName, roles = ['usuario', 'proveedor'], onSelect, showTitle = true }) => {
  return (
    <div className="w-full max-w-md mx-auto">
      {showTitle && (
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">¡Hola, {userName}!</h1>
          <p className="text-slate-500">¿Con qué perfil deseas ingresar hoy?</p>
        </div>
      )}

      <div className="space-y-4">
        {(roles.includes('usuario') || roles.length === 0) && (
          <button
            onClick={() => onSelect("usuario")}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50 transition-all shadow-sm hover:shadow-md group text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
              <UserIcon />
            </div>
            <div>
              <span className="block font-bold text-slate-900 text-lg">Ingresar como Usuario</span>
              <span className="block text-slate-500 text-sm">Buscar servicios para mis mascotas</span>
            </div>
          </button>
        )}

        {roles.includes('proveedor') && (
          <button
            onClick={() => onSelect("proveedor")}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50 transition-all shadow-sm hover:shadow-md group text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
              <PawIcon />
            </div>
            <div>
              <span className="block font-bold text-slate-900 text-lg">Ingresar como Proveedor</span>
              <span className="block text-slate-500 text-sm">Gestionar mis servicios y reservas</span>
            </div>
          </button>
        )}

        {roles.includes('admin') && (
          <button
            onClick={() => onSelect("admin")}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-slate-800 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md group text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-800 group-hover:text-white transition-colors shrink-0">
              <ShieldIcon />
            </div>
            <div>
              <span className="block font-bold text-slate-900 text-lg">Ingresar como Admin</span>
              <span className="block text-slate-500 text-sm">Panel de Administración</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
