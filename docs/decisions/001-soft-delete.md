# ADR-001: Soft Delete for Transactions

**Status:** Accepted
**Date:** 2025-01

## Context
Financial applications require audit trails. Users may accidentally delete transactions,
and regulatory best practices suggest never destroying financial records.

## Decision
Transactions are never hard-deleted from the database.
Instead, a `deletedAt: DateTime?` field is set when a user "deletes" a transaction.

## Consequences
- Every transaction query **must** include `where: { deletedAt: null }` to exclude deleted records
- Deleted transactions remain visible only in audit/history views, styled with `opacity-45` and strikethrough
- The `source: "MANUAL" | "AUTO" | "IMPORT"` field helps distinguish origin
- Future: restore functionality (set `deletedAt: null`) requires no data recovery

## Implementation
```ts
// Delete
prisma.transaction.update({ where: { id, userId }, data: { deletedAt: new Date() } })

// Query active only
prisma.transaction.findMany({ where: { userId, deletedAt: null } })
```
