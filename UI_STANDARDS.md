# UI Standards - Pawnecta System

## Core Philosophy
**High Contrast & Visibility**. Every component must be distinct even on high-brightness screens. We do not use subtle gray-on-gray borders.

## Design Tokens (Global CSS)
All styles are derived from `styles/globals.css`.

| Token | Value (Ref) | Description |
|-------|-------------|-------------|
| `--surface-bg` | White | Card background |
| `--surface-border` | **Slate-400** | **High Contrast** Solid Border |
| `--surface-ring` | Slate-900/8% | Edge reinforcement |
| `--page-bg` | **Slate-100** | Darker page background for contrast |
| `--section-alt-bg` | Slate-200 | Secondary Section for separation |

## Components

### 1. &lt;Card /&gt;
**Path**: `components/Shared/Card.tsx`
**Usage**: Any bounded content (Caregiver profiles, Benefits, Forms, Stats).

```tsx
<Card hoverable padding="m">
  <h3>Title</h3>
  <p>Content</p>
</Card>
```

**DO NOT** write &lt;div className="border rounded shadow..."&gt;. Use &lt;Card&gt;.
**ENFORCED**: Styles are `border: 2px solid var(--surface-border)`.

### 2. &lt;Section /&gt;
**Path**: `components/Shared/Section.tsx`
**Usage**: Top-level page blocks.

```tsx
<Section variant="default"> {/* Slate-100 (Default Base) */}
  <Content />
</Section>
<Section variant="white"> {/* White (Highlight) */}
  <Content />
</Section>
<Section variant="alt"> {/* Slate-200 (Separation) */}
  <Content />
</Section>
```

## Rules
1.  **Always Alternate**: Flow should be `White -> Slate-200 -> Slate-100 -> Dark`. Avoid `Default -> Default`.
2.  **No Ad-Hoc Borders**: If you need a border, ask "Is this a Card?". If yes, use &lt;Card&gt;. If no, use `border-state-400 border-2`.
