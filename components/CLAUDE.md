# Components

## Structure
- `ui/` — shadcn/ui generated files. **Never edit manually.**
- `layout/` — sidebar, header, bottom-nav. Shared across all dashboard pages.
- `dashboard/` — dashboard-specific: summary-card, balance-chart, category-chart, dashboard-client
- `transactions/` — transaction-form (Sheet), transaction-list, transaction-row
- `categories/` — category-form (Sheet with icon picker)
- `shared/` — reusable primitives: CurrencyDisplay, date-picker, loading-skeleton

## Key rules
- Use `className` with Tailwind/CSS variables — **never `style` inline**
- All monetary values: use `<CurrencyDisplay />`, never format manually
- All icons: Lucide React only
- Dynamic Lucide icon from string name:
  ```ts
  const Icon = (LucideIcons as unknown as Record<string, React.ElementType>)[PascalCase] ?? LucideIcons.Tag
  ```
- Glass surface for all cards: `className="glass-card"`
- Error color: `var(--status-err)` (terracotta) — never Tailwind `red-*`

## Server vs Client
- Pages in `app/` are Server Components by default (fetch data, check auth)
- Interactive components get `'use client'` directive
- Pass minimal props from server → client to avoid large serialization
