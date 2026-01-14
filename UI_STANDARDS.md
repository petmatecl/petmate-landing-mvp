# UI Standards - Pawnecta System

## Core Philosophy
**High Contrast & Visibility**. Every component must be distinct even on high-brightness screens. We use a **"Section Container"** pattern where content lives in clearly defined white blocks against a soft page background.

## Design Tokens (Global CSS)
All styles are derived from `styles/globals.css`.

| Token | Value (Ref) | Description |
|-------|-------------|-------------|
| `--page-bg` | **Slate-50 (#f8fafc)** | Global page background. |
| `--section-bg` | **White (#ffffff)** | Background for Sections and Cards. |
| `--section-border` | **Slate-400 (#94a3b8)** | **High Contrast** Solid Border for Sections. |
| `--section-radius` | **24px** | Standard radius for main sections. |
| `--section-padding`| **py-16 px-6** | Standard internal spacing. |

## Components

### 1. <SectionContainer />
**Path**: `components/Shared/Section.tsx` (Export: `SectionContainer`)
**Usage**: The PRIMARY wrapper for all page content blocks (Hero, Features, etc).

```tsx
<SectionContainer>
  <h2>Title</h2>
  <Content />
</SectionContainer>
```

**Style**: White Block, Slate-400 Border, Rounded-3xl, Shadow-sm.

### 2. <Card />
**Path**: `components/Shared/Card.tsx`
**Usage**: Smaller distinct blocks *inside* a Section or Layout (e.g., Dashboard widgets, Caregiver profiles).

```tsx
<Card padding="m">
  <h3>Title</h3>
</Card>
```

**Style**: Matches SectionContainer visual language (White, Border Slate-400, Rounded).

## Rules
1.  **Page Background**: Must be `bg-slate-50` (or `var(--page-bg)`). Use global `body` style or `.page` class.
2.  **No Naked Content**: Text and forms should live inside a `SectionContainer` or `Card`.
3.  **Borders**: Always use `border-slate-400` (or `var(--section-border)`) for structural lines.
