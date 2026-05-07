# ADR-002: JWT Session Strategy (no DB sessions)

**Status:** Accepted
**Date:** 2025-01

## Context
NextAuth v5 supports two session strategies: `database` (sessions stored in DB) and `jwt`
(sessions encoded in a signed cookie). The app uses Prisma but opted out of the Prisma adapter.

## Decision
Use JWT strategy. Session data (`id`, `name`, `email`) is stored in a signed HttpOnly cookie.

## Consequences
- No `Session` table needed in the database
- `auth()` works in middleware without a DB round-trip (faster route protection)
- `session.user.id` is available in all server components and route handlers after augmenting the type in `types/next-auth.d.ts`
- Logout invalidates the cookie client-side; for server-side invalidation, a token blacklist would be needed (out of scope for MVP)

## Implementation
```ts
// lib/auth.ts
NextAuth({ session: { strategy: 'jwt' }, ... })

// types/next-auth.d.ts — augment to add .id
declare module 'next-auth' {
  interface Session { user: { id: string } & DefaultSession['user'] }
}
```
