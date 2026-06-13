# Tasks: Saving Plan Snapshots — Evolução Real

**Input**: Design documents from `/specs/001-saving-plan-snapshots/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/saving-plans-snapshots.md](./contracts/saving-plans-snapshots.md), [quickstart.md](./quickstart.md)

**Tests**: Constitution Principle VII (NON-NEGOTIABLE) requires
`services/saving-plan-snapshot.service.test.ts` with Prisma mockado
(`jest-mock-extended`). Test tasks below are therefore included and split
per user story (each covers the methods that story depends on).

**Organization**: Tasks are grouped by user story (US1/US2/US3, per
[spec.md](./spec.md)) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact and relative to the repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the missing test toolchain (Constitution Complexity
Tracking exception) so `*.service.test.ts` files can run.

- [X] T001 Add `ts-jest`, `@types/jest`, `jest-mock-extended` to `devDependencies` in `package.json` and run `npm install`
- [X] T002 [P] Create `jest.config.js` at repo root with `preset: 'ts-jest'`, `testEnvironment: 'node'`, and `moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' }` (per [research.md](./research.md) §1) — written as `.js` (CommonJS) instead of `.ts` to avoid an additional `ts-node` dependency, which Jest 29 requires to load `.ts` config files

**Checkpoint**: `npm run test` runs (with zero test files) without configuration errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, repository and service shared by all three user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Add `SavingPlanSnapshot` model (`id, savingPlanId, balance Decimal(12,2), month Int, year Int, createdAt, updatedAt`, `@@unique([savingPlanId, month, year])`, `@@index([savingPlanId])`, `@@map("saving_plan_snapshots")`) and the inverse `snapshots SavingPlanSnapshot[]` relation on `SavingPlan` in `prisma/schema.prisma`, then run `npx prisma migrate dev --name add_saving_plan_snapshot` and `npx prisma generate` (per [data-model.md](./data-model.md)) — ⚠️ dev DB unreachable in this environment (`localhost:5432` down); `npx prisma generate` ran successfully (client types available), and the migration SQL was written by hand to `prisma/migrations/20260613120000_add_saving_plan_snapshot/migration.sql` following the same pattern as the existing `add_saving_plans` migration. Run `npx prisma migrate dev` (or `migrate deploy`) once the database is reachable to apply it and record it in `_prisma_migrations`.
- [X] T004 [P] Create `repositories/saving-plan-snapshot.repository.ts` exporting `savingPlanSnapshotRepository` with `findHistory(savingPlanId)` (orderBy `[{ year: 'asc' }, { month: 'asc' }]`), `upsertForMonth(savingPlanId, month, year, balance)` (via `prisma.savingPlanSnapshot.upsert` on the `[savingPlanId, month, year]` unique constraint), and `findActiveSavingPlans()` (returns `{ id, currentAmount }` for `SavingPlan` where `deletedAt: null`) (depends on T003)
- [X] T005 Create `services/saving-plan-snapshot.service.ts` exporting `savingPlanSnapshotService` with: a private BRT month/year helper using `new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })` (per [research.md](./research.md) §2); `listHistory(userId, savingPlanId)` (validates `prisma.savingPlan.findFirst({ where: { id: savingPlanId, userId } })` exists — no `deletedAt` filter per Q4 — then calls `findHistory`); `upsertCurrentMonth(savingPlanId, balance, now = new Date())` (computes month/year in BRT, calls `upsertForMonth`); `runMonthlySnapshot(now = new Date())` (loops `findActiveSavingPlans()`, calls `upsertCurrentMonth` per plan, returns `{ processed, errors }` like `fixedExpenseService.runCron()`) (depends on T004)

**Checkpoint**: Foundation ready — `saving-plan-snapshot.service.ts` compiles and is importable by route handlers and `saving-plan.service.ts`.

---

## Phase 3: User Story 1 - Ver evolução real do plano de poupança (Priority: P1) 🎯 MVP

**Goal**: O gráfico de evolução exibe pontos reais (snapshots + ponto de
criação) em vez de `mockMonthlyData()`, com estado de erro/indisponível
quando nenhum ponto pode ser determinado (FR-006 a FR-011).

**Independent Test**: Com snapshots já existentes no banco (inseridos
manualmente via Prisma Studio para este teste, já que a escrita automática
é US2/US3), abrir a página de detalhes do plano e confirmar que o gráfico
mostra um ponto por mês em ordem cronológica, idêntico em recargas
sucessivas; com nenhum snapshot, confirmar que aparece apenas o ponto de
criação.

### Tests for User Story 1

- [X] T006 [P] [US1] In `services/saving-plan-snapshot.service.test.ts`, add tests for `listHistory`: returns snapshots ordered by `year` then `month` ASC (mocked `prisma.savingPlanSnapshot.findMany`), and throws when the plan's `userId` does not match the requesting user (mocked `prisma.savingPlan.findFirst` returning `null`) — RN03 (depends on T005, T002)

### Implementation for User Story 1

- [X] T007 [P] [US1] Create `app/api/saving-plans/[id]/snapshots/route.ts` with `GET` handler: 401 if no session (`auth()`), call `savingPlanSnapshotService.listHistory(session.user.id, params.id)`, 404 if it throws an ownership/not-found error, 200 with `{ data: [{ month, year, balance }] }` otherwise (per [contracts/saving-plans-snapshots.md](./contracts/saving-plans-snapshots.md)) (depends on T005)
- [X] T008 [US1] In `app/(dashboard)/saving-plans/page.tsx`, remove `mockMonthlyData()` entirely; in the `DetailPanel` component, fetch `GET /api/saving-plans/[id]/snapshots` and build the chart series by applying FR-008: if the first returned snapshot matches `plan.createdAt`'s month/year (BRT) use it as the first point, otherwise prefix a synthetic point `{ date: plan.createdAt, balance: plan.currentAmount }`; if `snapshots` is empty, the synthetic point is the only point
- [X] T009 [US1] In `app/(dashboard)/saving-plans/page.tsx`, replace the existing `"Dados insuficientes para o gráfico"` fallback with the FR-011 error/empty state: when the snapshots fetch fails or no point can be determined at all, render an explanatory message (reuse `glass-card` / `var(--ink-ghost)` tokens, no inline `style`) instead of a blank or broken chart (depends on T008)

**Checkpoint**: User Story 1 fully functional and testable independently — chart renders real data with FR-008/FR-011 behavior.

---

## Phase 4: User Story 2 - Aporte registra snapshot do mês corrente (Priority: P1)

**Goal**: Criar um plano ou atualizar `currentAmount` grava/atualiza o
snapshot do mês corrente (BRT), sem duplicar (FR-002, FR-003).

**Independent Test**: Criar um novo plano com saldo inicial e confirmar via
`GET /api/saving-plans/[id]/snapshots` que existe exatamente um snapshot do
mês corrente com esse saldo; atualizar `currentAmount` no mesmo mês e
confirmar que o mesmo snapshot é atualizado (sem segundo registro).

### Tests for User Story 2

- [X] T010 [P] [US2] In `services/saving-plan-snapshot.service.test.ts`, add tests for `upsertCurrentMonth`: first call for a `[savingPlanId, month, year]` performs a create (mocked `prisma.savingPlanSnapshot.upsert` with `create` branch), a second call for the same `savingPlanId`/month/year updates `balance` via the `update` branch of the same `upsert` call — no duplicate record (FR-002) (depends on T005, T002)

### Implementation for User Story 2

- [X] T011 [US2] In `services/saving-plan.service.ts`, wrap the existing `create()` logic in `prisma.$transaction([...])` (RN07) so that, after creating the `SavingPlan`, it also calls `savingPlanSnapshotService.upsertCurrentMonth(plan.id, currentAmount)` for the initial snapshot (FR-003) (depends on T005) — ⚠️ implemented with the **interactive transaction** form `prisma.$transaction(async (tx) => {...})` instead of the array form, because the snapshot's `savingPlanId` depends on the `id` generated by `tx.savingPlan.create()`, which is only available once that operation resolves (array-form `$transaction([...])` cannot reference a sibling operation's result). The `month`/`year` (BRT) are computed via the now-exported `monthYearBRT()` from `saving-plan-snapshot.service.ts`, and the upsert is issued via `tx.savingPlanSnapshot.upsert(...)` with the same shape as `savingPlanSnapshotRepository.upsertForMonth`
- [X] T012 [US2] In `services/saving-plan.service.ts`, wrap the existing `update()` logic in `prisma.$transaction([...])` (RN07) so that, when `data.currentAmount` is present, it also calls `savingPlanSnapshotService.upsertCurrentMonth(id, data.currentAmount)` after updating the plan (FR-003); when `currentAmount` is absent, no snapshot call is made (depends on T011, T005) — implemented with array-form `prisma.$transaction([...])` (the plan `id` is already known here, so no chicken-and-egg issue); when `currentAmount` is `undefined`, runs a plain `prisma.savingPlan.update()` with no transaction (single table, nothing to make atomic)

**Checkpoint**: User Stories 1 AND 2 both work independently — chart now reflects real writes from plan creation/aporte.

---

## Phase 5: User Story 3 - Snapshot mensal automático para planos ativos (Priority: P2)

**Goal**: No dia 1 do mês (BRT), o cron diário existente grava/atualiza o
snapshot do mês corrente para todo plano ativo (FR-004, FR-005).

**Independent Test**: Simular a execução do cron em dia 1 (BRT) e confirmar
que todo plano com `deletedAt: null` passa a ter um snapshot do mês/ano
corrente refletindo `currentAmount`, sem duplicar se já existir (ex.: de um
aporte do mesmo mês), e que planos soft-deleted não são processados.

### Tests for User Story 3

- [X] T013 [P] [US3] In `services/saving-plan-snapshot.service.test.ts`, add tests for `runMonthlySnapshot`: calls `upsertCurrentMonth` once per plan returned by `findActiveSavingPlans()` (mocked), returns `{ processed: N, errors: [] }`, and re-running it for the same month does not error or duplicate (idempotent via the same `upsert` path as T010) (depends on T005, T002)

### Implementation for User Story 3

- [X] T014 [US3] In `app/api/cron/fixed-expenses/route.ts`, after the existing fixed-expenses processing, compute today's date in BRT (reuse the `toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })` pattern); if the day is `1`, call `savingPlanSnapshotService.runMonthlySnapshot(now)` and include its result as `data.savingPlanSnapshots` in the response (per [contracts/saving-plans-snapshots.md](./contracts/saving-plans-snapshots.md)); on other days, omit the key entirely (depends on T005) — note: the response shape changed from flat `data: { processed, errors, total }` to `data: { fixedExpenses: { processed, errors, total }, savingPlanSnapshots?: {...} }` per the contract's "amplia, sem breaking change" wording for the `data.savingPlanSnapshots` key

**Checkpoint**: All three user stories independently functional — full feature complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T015 [P] Update `repositories/CLAUDE.md` and `services/CLAUDE.md` to list `saving-plan-snapshot.repository.ts` / `saving-plan-snapshot.service.ts` (and the modified `saving-plan.service.ts`) per the existing file-list convention
- [X] T016 Run all 5 scenarios in [quickstart.md](./quickstart.md) end-to-end (including `npm run test -- saving-plan-snapshot.service.test.ts`) and confirm `grep -r "mockMonthlyData\|Math.random" app/ services/ components/` returns no matches (FR-009, FR-010, SC-005) — ⚠️ Cenários 1, 2 and 4 require a running dev server + reachable PostgreSQL (`npx prisma migrate dev` applied), which is unavailable in this environment (`localhost:5432` down, same limitation as T003); Cenário 3 (chart UI) likewise needs the dev server. Cenário 5 (`npm run test -- saving-plan-snapshot.service.test.ts`) was run — 7/7 tests pass. The grep returns one match in `components/ui/sidebar.tsx:611` (`Math.floor(Math.random() * 40) + 50` for the shadcn/ui menu-skeleton loading width) — this is unrelated pre-existing shadcn/ui-generated code outside this feature's scope (`components/CLAUDE.md`: "ui/ — shadcn/ui generated files. Never edit manually"), not `mockMonthlyData`/chart data. Manual verification of Cenários 1-4 must be performed once the database is reachable.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T002 for test config) and adds the shared model/repository/service — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 only
- **User Story 2 (Phase 4)**: Depends on Phase 2 only — independent of Phase 3
- **User Story 3 (Phase 5)**: Depends on Phase 2 only — independent of Phases 3 and 4
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: No dependency on US2/US3 for its own code paths, but its *Independent Test* requires snapshot rows to exist — seed manually for isolated testing, or complete US2 first for a fully realistic test
- **US2 (P1)**: Fully independent — testable via the snapshots GET endpoint from US1's T007, or directly via repository/service mocks in T010
- **US3 (P2)**: Fully independent — testable via T013 mocks; real end-to-end validation only meaningful on day 1 BRT

### Within Each User Story

- Tests (T006/T010/T013) before/alongside their implementation tasks — write first, confirm they fail against the Phase 2 skeleton, then implement
- US1: T007 (route) before T008 (page fetch), T008 before T009 (empty state)
- US2: T011 (create) before T012 (update) — both edit `services/saving-plan.service.ts`
- US3: T014 only, after T013

### Parallel Opportunities

- T001 and T002 (different files) can run in parallel
- T004 can start as soon as T003 (schema) is done; T005 depends on T004
- Once Phase 2 is complete, US1 (T006–T009), US2 (T010–T012) and US3 (T013–T014) can proceed in parallel by different developers
- T006, T007 (different files) can run in parallel within US1
- T010 can run in parallel with T011/T012 (different files) within US2
- T013 can run in parallel with T014 (different files) within US3
- T015 (docs) can run in parallel with T016 (validation)

---

## Parallel Example: Foundational → User Stories

```bash
# After Phase 2 (T003-T005) completes, work on all three stories in parallel:
Task: "US1 — Add listHistory tests in services/saving-plan-snapshot.service.test.ts"          # T006
Task: "US1 — Create GET /api/saving-plans/[id]/snapshots route"                               # T007
Task: "US2 — Add upsertCurrentMonth tests in services/saving-plan-snapshot.service.test.ts"   # T010
Task: "US3 — Add runMonthlySnapshot tests in services/saving-plan-snapshot.service.test.ts"   # T013
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational)
2. Complete Phase 3 (US1) — chart reads real data via the new endpoint
3. **STOP and VALIDATE**: Seed a few `SavingPlanSnapshot` rows manually, confirm the chart renders them correctly and the FR-011 empty state works
4. Demo: gráfico já não usa `Math.random()`

### Incremental Delivery

1. Setup + Foundational → shared model/service ready
2. Add US1 → chart consumes real (seeded) data → Demo
3. Add US2 → plan creation/aporte writes real snapshots → Demo (chart now fully data-driven end-to-end)
4. Add US3 → monthly cron keeps history continuous for inactive plans → Demo
5. Polish → docs + full quickstart validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Constitution Principle VII test tasks (T006, T010, T013) all target the
  same file (`services/saving-plan-snapshot.service.test.ts`) — they are
  marked [P] relative to *other tasks in their phase* (different files),
  but multiple test tasks editing this same file across phases should be
  applied sequentially (append test blocks, don't overwrite)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
