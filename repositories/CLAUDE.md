# Repositories Layer

Prisma queries live here. No business logic — only data access.

## Rules
- Always filter by `userId` (passed as parameter)
- Always filter `deletedAt: null` in transaction queries (unless intentionally showing history)
- Return raw Prisma results; services handle transformation
- No `throw` for business errors — only let Prisma errors bubble up

## Files
- `transaction.repository.ts` — findMany (with filters), findById, create, update, softDelete, getBalance, getPaginated
- `category.repository.ts` — findAll, findById, create, update, delete, hasTransactions
- `saving-plan-snapshot.repository.ts` — findHistory (ordered by year/month ASC), upsertForMonth (unique `[savingPlanId, month, year]`), findActiveSavingPlans

## Naming convention
```ts
export const myRepository = {
  findMany(userId: string, filters: FilterType) { ... }
  findById(id: string, userId: string) { ... }
  create(userId: string, data: CreateType) { ... }
  update(id: string, userId: string, data: UpdateType) { ... }
  softDelete(id: string, userId: string) { ... }   // transactions only
}
```
