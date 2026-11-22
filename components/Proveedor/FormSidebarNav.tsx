// components/Proveedor/FormSidebarNav.tsx
// ----------------------------------------------------------------------------
// Sprint FORM-SERVICIO-SIDEBAR-NAV (2026-11-20). Navegación por módulos del
// formulario de crear/editar servicio (ServiceFormModal.tsx). Sidebar vertical
// 240-280px en desktop; dropdown superior en <768px. 6 decisiones del PO:
//   (1) Sidebar vertical izquierdo 240-280px.
//   (2) Smooth scroll + scroll-margin a cada sección.
//   (3) Sin breadcrumb visual.
//   (4) Validación onBlur grupal por módulo (el parent decide cuándo validar;
//       este componente solo refleja el estado recibido).
//   (5) Check verde inicial para módulos completos al editar servicio
//       existente (lo decide el parent via `sectionStates`).
//   (6) Barra de progreso general que cuenta SOLO módulos obligatorios.
//
// Estados por módulo (control del parent):
//   - 'empty'    → dot slate-300 (ningún campo tocado)
//   - 'progress' → círculo accent-400 (algún campo tocado, obligatorios aún
//                                       incompletos)
//   - 'complete' → check accent-600 (obligatorios OK)
//   - 'error'    → triángulo danger-600 (validación fallida tras onBlur)
// ----------------------------------------------------------------------------
import React from 'react';
import {
    Check,
    Circle,
    AlertTriangle,
    ChevronDown,
    LucideIcon,
} from 'lucide-react';

export type ModuloEstado = 'empty' | 'progress' | 'complete' | 'error';

export type FormSection = {
    slug: string;
    label: string;
    obligatorio: boolean;
    icon?: LucideIcon;
};

export interface FormSidebarNavProps {
    sections: FormSection[];
    sectionStates: Record<string, ModuloEstado>;
    activeSection: string | null;
    onClickSection: (slug: string) => void;
    /** 0-100 — solo cuenta módulos obligatorios 'complete'. */
    progressPct: number;
    /** Mobile dropdown state (controlado por parent para persistir open/close). */
    mobileOpen: boolean;
    onToggleMobile: () => void;
}

function EstadoIcon({ estado }: { estado: ModuloEstado }) {
    if (estado === 'complete') {
        return <Check size={14} className="text-accent-600" aria-hidden="true" />;
    }
    if (estado === 'error') {
        return <AlertTriangle size={14} className="text-danger-600" aria-hidden="true" />;
    }
    if (estado === 'progress') {
        return (
            <Circle
                size={10}
                className="text-accent-500 fill-accent-500"
                aria-hidden="true"
            />
        );
    }
    // empty
    return (
        <Circle
            size={10}
            className="text-slate-300 fill-slate-300"
            aria-hidden="true"
        />
    );
}

function estadoAriaLabel(estado: ModuloEstado): string {
    switch (estado) {
        case 'complete':
            return 'completo';
        case 'progress':
            return 'en progreso';
        case 'error':
            return 'con error';
        default:
            return 'sin iniciar';
    }
}

function NavList({
    sections,
    sectionStates,
    activeSection,
    onClickSection,
}: Pick<FormSidebarNavProps, 'sections' | 'sectionStates' | 'activeSection' | 'onClickSection'>) {
    return (
        <ul role="list" className="space-y-1">
            {sections.map((s) => {
                const estado = sectionStates[s.slug] ?? 'empty';
                const isActive = activeSection === s.slug;
                return (
                    <li key={s.slug}>
                        <button
                            type="button"
                            onClick={() => onClickSection(s.slug)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                                isActive
                                    ? 'bg-accent-50 text-accent-800 font-semibold'
                                    : 'text-slate-700 hover:bg-slate-100'
                            }`}
                            aria-current={isActive ? 'step' : undefined}
                        >
                            <span className="flex w-5 h-5 items-center justify-center shrink-0">
                                <EstadoIcon estado={estado} />
                            </span>
                            <span className="flex-1 truncate">
                                {s.label}
                                {!s.obligatorio && (
                                    <span className="ml-1 text-xs text-slate-500 font-normal">
                                        (opcional)
                                    </span>
                                )}
                            </span>
                            <span className="sr-only">{estadoAriaLabel(estado)}</span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

export default function FormSidebarNav({
    sections,
    sectionStates,
    activeSection,
    onClickSection,
    progressPct,
    mobileOpen,
    onToggleMobile,
}: FormSidebarNavProps) {
    const pct = Math.max(0, Math.min(100, progressPct));
    const obligatoriosTotal = sections.filter((s) => s.obligatorio).length;
    const obligatoriosComplete = sections.filter(
        (s) => s.obligatorio && sectionStates[s.slug] === 'complete'
    ).length;

    return (
        <>
            {/* Desktop sidebar: columna izquierda fija 256px */}
            <aside
                className="hidden lg:block w-64 shrink-0 border-r border-slate-100 bg-slate-50/30 overflow-y-auto"
                aria-label="Secciones del formulario"
            >
                <div className="p-5">
                    <div className="mb-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-medium text-slate-700">Progreso</span>
                            <span className="tabular-nums text-slate-600">
                                {obligatoriosComplete}/{obligatoriosTotal}
                            </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-accent-600 h-2 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                                role="progressbar"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={pct}
                                aria-label={`Progreso del formulario: ${pct}%`}
                            />
                        </div>
                        <p className="mt-1.5 text-[11px] text-slate-500">
                            Secciones obligatorias completas.
                        </p>
                    </div>

                    <NavList
                        sections={sections}
                        sectionStates={sectionStates}
                        activeSection={activeSection}
                        onClickSection={onClickSection}
                    />
                </div>
            </aside>

            {/* Mobile: dropdown colapsable con la lista de secciones */}
            <div className="lg:hidden border-b border-slate-100">
                <button
                    type="button"
                    onClick={onToggleMobile}
                    className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    aria-expanded={mobileOpen}
                    aria-controls="form-sidebar-mobile-panel"
                >
                    <span className="flex items-center gap-2">
                        Secciones
                        <span className="text-xs text-slate-500 font-normal tabular-nums">
                            ({obligatoriosComplete}/{obligatoriosTotal})
                        </span>
                    </span>
                    <ChevronDown
                        size={16}
                        className={`transition-transform ${mobileOpen ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                    />
                </button>
                {mobileOpen && (
                    <div id="form-sidebar-mobile-panel" className="px-5 pb-4">
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-3">
                            <div
                                className="bg-accent-600 h-2 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                                role="progressbar"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={pct}
                            />
                        </div>
                        <NavList
                            sections={sections}
                            sectionStates={sectionStates}
                            activeSection={activeSection}
                            onClickSection={onClickSection}
                        />
                    </div>
                )}
            </div>
        </>
    );
}
