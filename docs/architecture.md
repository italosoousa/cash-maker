# Architecture — Cash Maker

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 App Router |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Icons | Lucide React |
| Charts | Recharts 2.x |
| Auth | NextAuth v5 (JWT strategy) |
| ORM | Prisma v6 |
| Database | PostgreSQL (Docker local / Neon.tech prod) |
| Validation | Zod |
| Forms | React Hook Form + @hookform/resolvers |
| Toasts | Sonner |

---

## Folder Structure

```
cash-maker/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Route group — no URL prefix
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/            # Route group — no URL prefix
│   │   ├── layout.tsx          # Sidebar + Header + BottomNav
│   │   ├── page.tsx            # Redirects / → /dashboard
│   │   ├── dashboard/page.tsx  # /dashboard
│   │   ├── transactions/page.tsx
│   │   ├── categories/page.tsx
│   │   ├── fixed-expenses/page.tsx
│   │   └── reports/page.tsx
│   ├── api/                    # Route handlers
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   └── categories/
│   ├── globals.css             # CSS variables + Liquid Glass utilities
│   └── layout.tsx              # Root layout (fonts, Toaster)
│
├── components/
│   ├── ui/                     # shadcn/ui generated components (don't edit)
│   ├── layout/                 # sidebar.tsx, header.tsx, bottom-nav.tsx
│   ├── dashboard/              # summary-card, balance-chart, category-chart, dashboard-client
│   ├── transactions/           # transaction-form, transaction-list, transaction-row
│   ├── categories/             # category-form
│   └── shared/                 # currency-display, date-picker, loading-skeleton
│
├── lib/
│   ├── auth.ts                 # NextAuth config (export: auth, handlers, signIn, signOut)
│   ├── prisma.ts               # Prisma singleton client
│   ├── utils.ts                # cn(), formatCurrency(), formatDate(), etc.
│   └── validations/            # Zod schemas (auth.ts, transaction.ts, category.ts)
│
├── services/                   # Business logic — called by route handlers
│   ├── transaction.service.ts
│   ├── category.service.ts
│   └── dashboard.service.ts
│
├── repositories/               # Prisma queries — called by services
│   ├── transaction.repository.ts
│   └── category.repository.ts
│
├── types/
│   ├── index.ts                # All shared TypeScript types
│   └── next-auth.d.ts          # Session type augmentation (session.user.id)
│
├── scripts/                    # Dev/test utilities (not deployed)
│   ├── seed-users.ts
│   └── seed-transactions.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── middleware.ts               # Route protection
└── CLAUDE.md                   # AI context (primary — read first)
```

---

## Request Flow

```
Browser
  └── middleware.ts          (auth guard, redirects)
        └── Route Handler    app/api/.../route.ts
              └── Zod        validate input
                    └── Service  services/*.service.ts
                          └── Repository  repositories/*.repository.ts
                                └── Prisma
                                      └── PostgreSQL
```

**Rules:**
- Route handlers: receive request, validate with Zod, call service, return response
- Services: business logic, rules enforcement, no HTTP concerns
- Repositories: Prisma queries only, no business logic
- **Never** write Prisma queries directly in route handlers

---

## Auth Flow

1. User submits login form → `POST /api/auth/callback/credentials`
2. NextAuth calls `authorize()` in `lib/auth.ts`
3. `authorize()` validates with Zod, queries DB, compares bcrypt hash
4. On success: JWT created with `{ id, name, email }` and stored in HttpOnly cookie
5. `middleware.ts` reads JWT on every request to protect routes
6. Server components call `auth()` to get session; route handlers do the same
7. `session.user.id` is always used for data isolation — never trust body/params

---

## Component Patterns

### Server component (data fetching)
```tsx
// app/(dashboard)/dashboard/page.tsx
import { auth } from '@/lib/auth'
export default async function Page() {
  const session = await auth()
  return <ClientComponent userId={session.user.id} />
}
```

### Client component (interactivity)
```tsx
'use client'
// components/dashboard/dashboard-client.tsx
// Fetches /api/dashboard on mount and on period change
```

### Currency display
```tsx
// Always use CurrencyDisplay — never raw number formatting
<CurrencyDisplay value={1234.56} type="income" size="lg" />
```

### Lucide icon from string (for user-defined category icons)
```tsx
import * as LucideIcons from 'lucide-react'
const Icon = (LucideIcons as unknown as Record<string, React.ElementType>)[PascalCaseName] ?? LucideIcons.Tag
```

---

## Environment Variables

| Variable | Used by | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Prisma | PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth v5 | JWT signing secret (min 32 chars) |
| `NEXTAUTH_URL` | NextAuth | Full URL of the app |
| `RESEND_API_KEY` | Future | Transactional email |

NextAuth v5 uses `AUTH_SECRET`, not `NEXTAUTH_SECRET`.
Prisma CLI reads from `.env`, Next.js reads from `.env.local`.
Keep **both files** in sync. Never commit either to git.
