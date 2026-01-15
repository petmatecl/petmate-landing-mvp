# UI Standards (High Contrast Surface System)

## 1. High Contrast Principles
- **Borders are Mandatory**: Every functional container must have a `border-slate-400` (for inputs/internal) or `border-slate-200` (for elevated cards).
- **No Invisible Containers**: Avoid white-on-white sections. Use full-width bands (Mint/Soft/White/Dark) for separation.
- **Rhythm**: Strict Alternating Bands (Brand -> Soft -> White -> Soft -> Dark -> Brand).

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
    - `Brand` (Mint)
    - `Soft` (Slate-100)
    - `White`
    - `Dark` (Slate-900)

## 4. Input Fields
- **Border**: `border-2 border-slate-300` (Minimum contrast 3:1).
- **Focus**: Brand Ring `ring-emerald-500`.
