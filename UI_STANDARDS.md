# UI Standards (High Contrast Surface System)

## 1. High Contrast Principles
- **Borders are Mandatory**: Every functional container must have a `border-slate-400` (for inputs/internal) or `border-slate-200` (for elevated cards).
- **No Invisible Containers**: Avoid white-on-white sections. Use full-width bands (Accent/Soft/White/Dark) for separation.
- **Rhythm**: Strict Alternating Bands (Accent -> Soft -> White -> Soft -> Dark -> Accent).

## 2. Card Variance System
### A. "Surface" (Standard)
- **Use Case**: Internal dashboards, content blocks, forms.
- **Visuals**: `border border-slate-200 shadow-sm rounded-2xl`.

### B. "Elevated" (Premium/Listing)
- **Use Case**: **Login**, **Search Results**, **Sitter Cards**.
- **Visuals**:
    - `rounded-3xl`
    - `border border-slate-200` (Subtle 1px)
    - `shadow-xl shadow-slate-200/50` (Float)
    - `ring-1 ring-black/5` (Definition)

## 3. Band System (Full Width)
- **Separators**: Every band has an absolute `1px` divider (`.band-separator`) and gradient fade (`.band-fade`) at the bottom.
- **Variants**:
    - `Accent` (Green — token `accent-*`, base `#22C55E`)
    - `Soft` (Slate-100)
    - `White`
    - `Dark` (Slate-900 o `deep-*` para superficies premium)

## 4. Input Fields
- **Border**: `border-2 border-slate-300` (Minimum contrast 3:1).
- **Focus**: Brand Ring `ring-accent-600` (regla del sistema visual v3 — focus rings de forms van en accent-600 sobre fondos claros para cumplir WCAG AA).

## 5. Color System (v3)
- **Marca (por color)**: `accent-*` (green, base `#22C55E`) para acción/CTA/highlights; `deep-*` (teal, base `#134E4A`) para superficies dark alternativas y peso.
- **Estado (por significado)**: `success-*` (alias de emerald), `danger-*` (alias de red), `warning-*` (alias de amber), `info-*` (alias de blue). Distintos de la marca a propósito — separar "verde de marca" del "verde de OK".
- **Neutros**: `slate-*` para texto/borders/fondos "sin color de estado activo".
- **Legacy**: `emerald-*`, `red-*`, `amber-*` como clases Tailwind directas quedan reservadas para convenciones de dominio (ratings amber-400, asteriscos * de required, brand colors externos, texto legal). NO usar como estado — usar los tokens semánticos.
