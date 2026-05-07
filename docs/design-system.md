# Design System — Liquid Glass

Cash Maker uses a custom design language inspired by Apple's visionOS/iOS: translucent surfaces,
backdrop-filter blur, luminous borders, and a soft green palette.

---

## CSS Variables (globals.css)

### Brand greens
```css
--green-deep:   #2D6A4F   /* headings, logo, text emphasis */
--green-mid:    #52B788   /* CTAs, active states, glass borders */
--green-soft:   #74C69D   /* icons, badges, indicators */
--green-mist:   #B7E4C7   /* card borders, separators */
--green-frost:  #D8F3DC   /* card backgrounds, hover states */
--green-air:    #F0FAF4   /* page background */
```

### Text (ink scale)
```css
--ink-dark:  #1B3A2D   /* primary text */
--ink-mid:   #3D6B55   /* subtitles, body */
--ink-soft:  #6B9E82   /* captions, labels */
--ink-ghost: #9DC4AD   /* placeholders, footer */
```

### Status
```css
--status-ok:   #52B788   /* income, success — green */
--status-err:  #E07A5F   /* expense, error — terracotta (NOT red) */
--status-warn: #F2CC8F   /* warning, attention */
--status-info: #81B29A   /* neutral info */
```

### Glass properties
```css
--glass-bg:     rgba(240, 250, 244, 0.72)
--glass-blur:   blur(20px) saturate(1.8)
--glass-border: rgba(183, 228, 199, 0.6)
--glass-shadow: 0 8px 32px rgba(45, 106, 79, 0.10)
```

---

## Utility Classes

### `.glass-card`
The primary surface for all cards, panels, and containers.
```css
background:        var(--glass-bg);
backdrop-filter:   var(--glass-blur);
border:            1px solid var(--glass-border);
border-radius:     20px;
box-shadow:        var(--glass-shadow), inset 0 1px 0 rgba(255,255,255,0.8);
```
Usage: wrap any content that needs the glass surface.

### `.skeleton`
Animated loading placeholder.
```css
background: linear-gradient(90deg, var(--green-frost) 25%, var(--green-mist) 50%, var(--green-frost) 75%);
animation: skeleton-pulse 1.5s ease-in-out infinite;
```

### `.auth-input` / `.auth-btn`
Styled form elements for login/register pages.

---

## Typography

| Role | Font | Size | Weight |
|------|------|------|--------|
| Display / Logo | Space Grotesk | 48–72px | 700 |
| H1–H3 | Space Grotesk | 18–40px | 600–700 |
| Body | Inter | 14–16px | 400–500 |
| Monetary values | JetBrains Mono | 14–32px | 400–700 |

### CSS font variables
```css
var(--font-space-grotesk)   /* headings */
var(--font-inter)           /* body */
var(--font-mono)            /* JetBrains Mono — all R$ values */
```

### Monetary value rules
- Always use `<CurrencyDisplay />` component — never format manually
- R$ symbol: Inter, font-normal, opacity-70
- Integer part: JetBrains Mono, font-bold
- Decimal part: 65% the size of integer
- Income: `text-[var(--status-ok)]`
- Expense: `text-[var(--status-err)]`

---

## Spacing & Shape

### Border radius
| Element | Radius |
|---------|--------|
| Glass cards | 20–24px |
| Buttons | 12px |
| Inputs | 10px |
| Badges / pills | 999px |
| Modals | 24px (top) |

### Elevation (shadow levels)
```
Level 1 — subtle glass:  0 2px 8px rgba(45,106,79, 0.06)
Level 2 — card glass:    0 8px 32px rgba(45,106,79, 0.10) + inset
Level 3 — dropdown:      0 16px 40px rgba(45,106,79, 0.14)
Level 4 — modal:         0 32px 80px rgba(45,106,79, 0.20)
```

---

## Components

### SummaryCard
`components/dashboard/summary-card.tsx`
```tsx
<SummaryCard
  label="Receitas"
  value={5160.00}
  type="income"          // 'income' | 'expense' | 'neutral'
  icon={TrendingUp}      // Lucide icon component
  variation={12}         // optional % vs previous period
  loading={false}
/>
```

### CurrencyDisplay
`components/shared/currency-display.tsx`
```tsx
<CurrencyDisplay
  value={1234.56}
  type="income"          // 'income' | 'expense' | 'neutral'
  size="lg"              // 'sm' | 'md' | 'lg' | 'xl'
  showSign={false}       // prefix + or −
  showSymbol={true}      // show R$
/>
```

### BalanceChart
`components/dashboard/balance-chart.tsx`
```tsx
<BalanceChart data={[
  { label: "Nov", income: 5160, expense: 3200 }
]} />
```

### CategoryChart
`components/dashboard/category-chart.tsx`
```tsx
<CategoryChart data={[
  { categoryId: "x", name: "Alimentação", icon: "utensils",
    color: "#E07A5F", total: 320, percentage: 45 }
]} />
```

---

## Rules — What NOT to do

- **Never use `style` inline** — always Tailwind classes or CSS variables
- **Never use `red-*` for errors** — always `var(--status-err)` (terracotta)
- **Never format currency manually** — always use `<CurrencyDisplay />`
- **Never hard-code colors** — always use CSS variables
- **Never skip glass on cards** — all panels must use `.glass-card`
- **Never use non-Lucide icons** — the entire icon set must be Lucide
