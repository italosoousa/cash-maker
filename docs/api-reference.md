# API Reference — Cash Maker

All endpoints are under `/api/`. Every request requires an active session (NextAuth JWT cookie).
Unauthenticated requests return `401 { error: "Não autorizado" }`.

---

## Authentication

### POST `/api/auth/register`
Create a new user account. Atomically creates 7 default categories.

**Body**
```json
{ "name": "string", "email": "string", "password": "string (min 6)" }
```

**Response `201`**
```json
{ "message": "Usuário criado com sucesso" }
```

**Errors**
| Status | Reason |
|--------|--------|
| `400` | Zod validation failed |
| `409` | Email already in use |
| `500` | Internal error |

---

### NextAuth endpoints — `/api/auth/[...nextauth]`
Handled by NextAuth v5. Key routes:
- `POST /api/auth/callback/credentials` — login with email + password
- `POST /api/auth/signout` — logout, clears JWT cookie
- `GET  /api/auth/session` — returns current session

---

## Dashboard

### GET `/api/dashboard?period=month`

Returns all data needed to render the dashboard in one request.

**Query params**
| Param | Values | Default |
|-------|--------|---------|
| `period` | `today` \| `week` \| `month` \| `year` | `month` |

**Response `200`**
```json
{
  "data": {
    "summary": {
      "balance":          1234.56,   // all-time balance
      "periodIncome":      800.00,   // income in selected period
      "periodExpense":     320.00,   // expenses in selected period
      "periodBalance":     480.00,   // income - expense for period
      "incomeVariation":      12,    // % change vs previous period
      "expenseVariation":     -5     // % change vs previous period
    },
    "categoryBreakdown": [
      {
        "categoryId":  "cuid",
        "name":        "Alimentação",
        "icon":        "utensils",
        "color":       "#E07A5F",
        "total":       320.00,
        "percentage":  45
      }
    ],
    "monthlyEvolution": [
      { "label": "Nov", "income": 5160.00, "expense": 3200.00 }
    ],
    "recentTransactions": [ /* last 6, see Transaction shape below */ ]
  }
}
```

---

## Transactions

### GET `/api/transactions`

**Query params**
| Param | Values | Default |
|-------|--------|---------|
| `page` | integer | `1` |
| `limit` | integer | `20` |
| `type` | `INCOME` \| `EXPENSE` \| `ALL` | `ALL` |
| `categoryId` | cuid | — |
| `startDate` | ISO date string | — |
| `endDate` | ISO date string | — |
| `search` | string (description search) | — |

**Response `200`**
```json
{
  "data": {
    "transactions": [...],
    "pagination": { "page": 1, "limit": 20, "total": 142, "totalPages": 8 }
  }
}
```

### POST `/api/transactions`

**Body**
```json
{
  "type":        "INCOME | EXPENSE",
  "amount":      150.00,
  "description": "string (max 100)",
  "date":        "2025-01-15T03:00:00.000Z",
  "categoryId":  "cuid",
  "notes":       "string? (max 500)"
}
```

**Response `201`** — returns created transaction object.

### PATCH `/api/transactions/[id]`
Same body as POST, all fields optional. Returns updated transaction.

### DELETE `/api/transactions/[id]`
**Soft delete** — sets `deletedAt`, never removes from DB (RN02).
**Response `200`** `{ "message": "Transação excluída" }`

**Transaction shape**
```ts
{
  id:          string
  type:        "INCOME" | "EXPENSE"
  amount:      number           // always positive
  description: string
  date:        string           // ISO UTC
  notes:       string | null
  source:      "MANUAL" | "AUTO" | "IMPORT"
  deletedAt:   string | null    // non-null = soft-deleted
  categoryId:  string
  category: {
    id:    string
    name:  string
    icon:  string               // Lucide icon name (kebab-case)
    color: string               // hex
  }
  userId:    string
  createdAt: string
}
```

---

## Categories

### GET `/api/categories`
Returns all categories for the authenticated user (default + custom).

**Response `200`**
```json
{
  "data": [
    {
      "id": "cuid", "name": "Alimentação", "icon": "utensils",
      "color": "#E07A5F", "isDefault": true,
      "_count": { "transactions": 42 }
    }
  ]
}
```

### POST `/api/categories`
```json
{ "name": "string (max 50)", "icon": "string", "color": "#hex" }
```

### PATCH `/api/categories/[id]`
Same body, all fields optional.

### DELETE `/api/categories/[id]`
**Errors**
| Status | Reason |
|--------|--------|
| `400` | Default category (cannot delete) |
| `400` | Has linked transactions |
| `404` | Not found / wrong user |
