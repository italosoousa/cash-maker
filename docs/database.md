# Database — Cash Maker

**Engine:** PostgreSQL (Docker local / Neon.tech in production)
**ORM:** Prisma v6
**Schema file:** `prisma/schema.prisma`

---

## Models

### User
```
id        cuid  PK
name      string
email     string  UNIQUE
password  string  (bcrypt hash, 12 rounds — never plain text)
createdAt DateTime
updatedAt DateTime
```
Relations: has many `Category`, `Transaction`, `FixedExpense`

---

### Category
```
id        cuid  PK
name      string
icon      string  (Lucide icon name, kebab-case, default: "tag")
color     string  (hex, default: "#52B788")
isDefault boolean (default categories cannot be deleted — RN04)
userId    FK → User
createdAt / updatedAt
```
Relations: has many `Transaction`, `FixedExpense`

**7 default categories created on every new user registration:**
| Name | Icon | Color |
|------|------|-------|
| Alimentação | `utensils` | `#E07A5F` |
| Transporte | `car` | `#3D405B` |
| Moradia | `home` | `#81B29A` |
| Saúde | `heart-pulse` | `#F2CC8F` |
| Lazer | `gamepad-2` | `#52B788` |
| Educação | `graduation-cap` | `#2D6A4F` |
| Outros | `tag` | `#9DC4AD` |

---

### Transaction
```
id             cuid  PK
type           INCOME | EXPENSE
amount         Decimal(12,2)  — always positive
description    string
date           DateTime (UTC)
notes          string?
source         MANUAL | AUTO | IMPORT  (default: MANUAL)
deletedAt      DateTime?  ← SOFT DELETE — never hard-delete (RN02)
userId         FK → User
categoryId     FK → Category
fixedExpenseId FK → FixedExpense?
createdAt / updatedAt
```

**Indexes:** `userId`, `(userId, date)`, `(userId, type)`, `(userId, categoryId)`, `deletedAt`

**Critical rules:**
- Every query MUST filter `deletedAt: null` (active) unless explicitly showing history
- Every query MUST filter by `userId` from the session (never trust userId from request body)
- `amount` is always stored as positive; sign is inferred from `type`

---

### FixedExpense
```
id          cuid  PK
name        string
amount      Decimal(12,2)
type        INCOME | EXPENSE
frequency   DAILY | WEEKLY | MONTHLY | YEARLY
startDate   DateTime
endDate     DateTime?  (null = no end)
isActive    boolean (default: true)
nextDueDate DateTime  (used by cron job)
notes       string?
userId      FK → User
categoryId  FK → Category
createdAt / updatedAt
```

---

## Query Patterns

### Always safe transaction query
```ts
prisma.transaction.findMany({
  where: {
    userId,          // from session — never from request body
    deletedAt: null, // RN02
    // ...other filters
  }
})
```

### Soft delete (never hard delete)
```ts
prisma.transaction.update({
  where: { id, userId },
  data:  { deletedAt: new Date() }
})
```

### Atomic multi-table operation
```ts
prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ ... })
  await tx.category.createMany({ ... })
  return user
})
```

### Balance aggregation
```ts
prisma.transaction.groupBy({
  by:    ['type'],
  where: { userId, deletedAt: null },
  _sum:  { amount: true },
})
// income - expense = balance
```

---

## Migrations

```bash
# Create and apply migration
npx prisma migrate dev --name description_here

# Apply to production
npx prisma migrate deploy

# Regenerate client after schema change
npx prisma generate

# View data in browser
npx prisma studio
```

Migration files live in `prisma/migrations/`. Always commit them.
