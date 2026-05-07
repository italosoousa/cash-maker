# API Route Handlers

Route handlers in `app/api/`. Every handler follows the same structure.

## Pattern
```ts
export async function GET(request: Request) {
  // 1. Auth check — always first
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // 2. Parse and validate input with Zod
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // 3. Call service (never Prisma directly)
  const result = await myService.doSomething(session.user.id, parsed.data)

  // 4. Return response
  return NextResponse.json({ data: result }, { status: 200 })
}
```

## Rules
- **Never** query Prisma directly in route handlers
- **Always** validate `session.user.id` exists before any data operation
- **Always** validate request body with Zod before passing to services
- Use `try/catch` and return appropriate HTTP status codes
- `userId` comes **only** from session — never trust request body

## Response shape convention
```ts
// Success
{ data: T }

// Error
{ error: string }
{ error: ZodFlattenedError }
```
