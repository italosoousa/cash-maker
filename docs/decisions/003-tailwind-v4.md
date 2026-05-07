# ADR-003: Tailwind CSS v4 Configuration

**Status:** Accepted
**Date:** 2025-01

## Context
Tailwind CSS v4 introduced breaking changes vs v3: the PostCSS plugin is now separate
(`@tailwindcss/postcss`) and must be explicitly configured. Without this, all utility
classes are silently ignored.

## Decision
Use Tailwind v4 with explicit PostCSS configuration and `@theme inline` in globals.css
to expose CSS variables as Tailwind color utilities.

## Required files

### `postcss.config.mjs` (critical — must exist)
```js
const config = { plugins: { '@tailwindcss/postcss': {} } }
export default config
```

### `app/globals.css` (top of file)
```css
@import "tailwindcss";

@theme inline {
  --color-green-deep:  var(--green-deep);
  --color-green-mid:   var(--green-mid);
  /* ... all tokens ... */
}
```

## Consequences
- CSS variables defined in `:root` are accessible as `text-green-deep`, `bg-green-frost`, etc.
- No `tailwind.config.ts` needed for color customization
- `@custom-variant dark` replaces `darkMode: 'class'` config option
- Removing `postcss.config.mjs` breaks ALL styling silently (no error shown)
