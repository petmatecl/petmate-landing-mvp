# UI Standards - Pawnecta System

## Core Philosophy
**High Contrast & Visibility**. Every component must be distinct even on high-brightness screens. We do not use subtle gray-on-gray borders.

## Design Tokens (Global CSS)
All styles are derived from `styles/globals.css`.

| Token | Value (Ref) | Description |
|-------|-------------|-------------|
| `--surface-bg` | White | Card background |
| `--surface-border` | Slate-400 | **Visible** solid border |
| `--surface-ring` | Slate-900/8% | Edge reinforcement |
| `--surface-shadow` | Custom | Soft separation |

## Components

### 1. `<Card />`
**Path**: `components/Shared/Card.tsx`
**Usage**: Any bounded content (Caregiver profiles, Benefits, Forms, Stats).

```tsx
<Card hoverable padding="m">
  <h3>Title</h3>
  <p>Content</p>
</Card>
```

**DO NOT** write `<div className="border rounded shadow...">`. Use `<Card>`.

### 2. `<Section />`
**Path**: `components/Shared/Section.tsx`
**Usage**: Top-level page blocks.

```tsx
<Section variant="default"> <!-- Slate-50 -->
  <Content />
</Section>
<Section variant="white"> <!-- White (Alternating) -->
  <Content />
</Section>
```

## Rules
1.  **Always Alternate**: Never place a White Card on a White Section without strict checking. Prefer `Card` on `Section(variant="default")`.
2.  **No Ad-Hoc Borders**: If you need a border, ask "Is this a Card?". If yes, use `<Card>`. If no, use `border-slate-300` minimal.
