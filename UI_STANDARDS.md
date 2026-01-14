# UI Standards - Pawnecta System

## Core Philosophy
**High Contrast & Visibility**. Every component must be distinct even on high-brightness screens. We use a **"Section Container"** pattern where content lives in clearly defined white blocks against a soft page background.

## Design Tokens (Global CSS)
All styles are derived from `styles/globals.css`.

| Token | Value (Ref) | Description |
|-------|-------------|-------------|
| `--page-bg` | **Slate-50 (#f8fafc)** | Global page background. |
| `--section-bg` | **White (#ffffff)** | Background for Sections and Cards. |
| `--section-border` | **None** | **Soft Block** (Ring 1px 5% Black). |
| `--card-border` | **Slate-200 (#e2e8f0)** | Distinct border for internal Cards. |
| `--section-radius` | **24px** | Standard radius for main sections. |
| `--section-padding`| **py-16 px-6** | Standard internal spacing. |

## Components

### 1. <SectionContainer />
**Path**: `components/Shared/Section.tsx` (Export: `SectionContainer`)
**Usage**: The PRIMARY wrapper for all page content blocks.

**Style**: **Soft Block** (White, Soft Shadow, Ring, No Border).

### 2. Band System (Full Width)
Sections are separated by full-width background bands (`<Band />`) to create clear visual blocks.
-   **.band-brand**: `bg-emerald-50` (Mint). Used for Hero and key CTAs.
-   **.band-soft**: `bg-slate-50`. Used for secondary content and trust signals.
-   **.band-white**: `bg-white`. Used for main content steps and card grids.

Usage with `<Band>` component:
```tsx
<Band variant="brand">
  <Content />
</Band>
```

### 3. <Card />
**Path**: `components/Shared/Card.tsx`
**Usage**: Smaller distinct blocks *inside* a Section.

**Style**: Distinct (White, Border Slate-200, Rounded).

## Rules
1.  **Page Background**: Must be `bg-slate-50` (or `var(--page-bg)`). Use global `body` style or `.page` class.
2.  **No Naked Content**: Text and forms should live inside a `SectionContainer` or `Card`.
3.  **Borders**: Always use `border-slate-400` (or `var(--section-border)`) for structural lines.
