# Services Layer

Business logic lives here. Called by route handlers, never by components.

## Rules
- Validate business rules here (not in route handlers or repositories)
- Always receive `userId` as a parameter — never read from request body
- Throw descriptive `Error` messages; route handlers convert them to HTTP responses
- Use `prisma.$transaction()` for operations that touch multiple tables (RN07)

## Files
- `transaction.service.ts` — create, update, soft-delete, list with filters
- `category.service.ts` — CRUD + guards: no delete on default or categories with transactions (RN04)
- `dashboard.service.ts` — aggregation: summary, category breakdown, monthly evolution, recent transactions

## Pattern
```ts
export const myService = {
  async doSomething(userId: string, data: ValidatedInput) {
    // 1. Business rule checks
    // 2. Call repository
    // 3. Return result
  }
}
```
