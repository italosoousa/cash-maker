# Data Model: Saving Plan Snapshots — Evolução Real

## SavingPlanSnapshot (nova tabela `saving_plan_snapshots`)

Registro mensal do saldo de um plano de poupança.

| Campo | Tipo Prisma | Notas |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `savingPlanId` | `String` | FK → `SavingPlan.id`, `onDelete: Cascade` |
| `balance` | `Decimal @db.Decimal(12, 2)` | Saldo do plano (`currentAmount`) no momento do registro/atualização do snapshot |
| `month` | `Int` | 1–12, calculado em `America/Sao_Paulo` (FR-001) |
| `year` | `Int` | calculado em `America/Sao_Paulo` (FR-001) |
| `createdAt` | `DateTime @default(now())` | Data/hora do primeiro registro deste snapshot |
| `updatedAt` | `DateTime @updatedAt` | Atualizada sempre que o snapshot do mês é sobrescrito (FR-002/FR-003) |

### Relações

```prisma
model SavingPlan {
  // ...campos existentes...
  snapshots SavingPlanSnapshot[]
}

model SavingPlanSnapshot {
  id           String   @id @default(cuid())
  savingPlanId String
  balance      Decimal  @db.Decimal(12, 2)
  month        Int
  year         Int
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  savingPlan   SavingPlan @relation(fields: [savingPlanId], references: [id], onDelete: Cascade)

  @@unique([savingPlanId, month, year])
  @@index([savingPlanId])
  @@map("saving_plan_snapshots")
}
```

### Constraints e regras

- **Unicidade** (FR-002): `@@unique([savingPlanId, month, year])` — no
  máximo um snapshot por plano por mês/ano. Toda gravação usa
  `upsert` sobre essa chave composta.
- **Isolamento de dados** (RN03): `SavingPlanSnapshot` não possui `userId`
  próprio. A propriedade é validada na camada de service via o
  `SavingPlan` relacionado (`savingPlan.userId === session.user.id`) antes
  de qualquer leitura/escrita.
- **Soft delete do plano** (clarificação Q4): `SavingPlanSnapshot` não tem
  `deletedAt` próprio. Quando `SavingPlan.deletedAt` é preenchido, os
  snapshots já registrados permanecem intactos e continuam acessíveis via
  `GET /api/saving-plans/[id]/snapshots`; apenas o processo automático
  mensal (FR-005) passa a ignorar o plano.
- **Sem retenção/expiração** (Assumption): nenhum job remove snapshots
  antigos.

### Ciclo de vida (quando um snapshot é criado/atualizado)

| Gatilho | Ação | Requisito |
|---|---|---|
| Criação de um `SavingPlan` | `upsert` do snapshot do mês/ano corrente com `balance = currentAmount` inicial | FR-003 |
| Atualização de `currentAmount` de um plano existente (aporte) | `upsert` do snapshot do mês/ano corrente com o novo `balance` | FR-003 |
| Cron diário (`/api/cron/fixed-expenses`), apenas quando a data BRT é dia 1 | Para cada plano ativo (`deletedAt: null`), `upsert` do snapshot do mês/ano corrente com `balance = currentAmount` | FR-004, FR-005 |

Em todos os casos, `upsert` sobre `[savingPlanId, month, year]` garante que
no máximo um registro existe por mês — gravações repetidas no mesmo mês
atualizam `balance` e `updatedAt` (FR-002).

### Transações atômicas (RN07)

- **Criação de plano**: `prisma.savingPlan.create()` + `prisma.savingPlanSnapshot.upsert()`
  do snapshot inicial são executados dentro de `prisma.$transaction([...])`,
  pois afetam duas tabelas.
- **Atualização de `currentAmount`**: `prisma.savingPlan.update()` +
  `prisma.savingPlanSnapshot.upsert()` também via `$transaction([...])`.
- **Cron mensal**: cada plano é processado com seu próprio `upsert`
  independente (já idempotente); não há necessidade de uma transação
  multi-tabela por iteração, seguindo o mesmo padrão de
  `fixedExpenseService.runCron()` (loop com `errors: string[]` por item).

## SavingPlan (alterações)

Nenhuma alteração de colunas. Apenas a nova relação `snapshots SavingPlanSnapshot[]`
(lado inverso da FK). Os campos existentes usados por esta feature:

| Campo | Uso nesta feature |
|---|---|
| `currentAmount` | Valor gravado em cada snapshot (`balance`) |
| `createdAt` | Base do "ponto de criação" do gráfico (FR-008) quando não há snapshot para esse mês |
| `deletedAt` | Determina se o plano é "ativo" para o cron mensal (FR-005); não afeta a visibilidade dos snapshots já gravados |
| `userId` | Usado para validar propriedade antes de acessar `snapshots` |

## Camadas (novos arquivos)

### `repositories/saving-plan-snapshot.repository.ts`

```ts
export const savingPlanSnapshotRepository = {
  findHistory(savingPlanId: string) { /* findMany orderBy [{year:'asc'},{month:'asc'}] */ },
  upsertForMonth(savingPlanId: string, month: number, year: number, balance: number) {
    /* prisma.savingPlanSnapshot.upsert(...) */
  },
  findActivePlanIds(userId?: string) {
    /* findMany SavingPlan where deletedAt: null, select { id, currentAmount } — usado pelo cron */
  },
}
```

### `services/saving-plan-snapshot.service.ts`

```ts
export const savingPlanSnapshotService = {
  async listHistory(userId: string, savingPlanId: string) {
    // 1. valida propriedade do plano (sem filtrar deletedAt — Q4)
    // 2. repository.findHistory(savingPlanId)
    // 3. retorna snapshots ordenados [{ month, year, balance }]
  },

  async upsertCurrentMonth(savingPlanId: string, balance: number, now = new Date()) {
    // calcula { month, year } em America/Sao_Paulo (research.md #2)
    // repository.upsertForMonth(savingPlanId, month, year, balance)
  },

  async runMonthlySnapshot(now = new Date()) {
    // para cada SavingPlan ativo (deletedAt: null):
    //   upsertCurrentMonth(plan.id, plan.currentAmount, now)
    // retorna { processed: number, errors: string[] } — mesmo formato de fixedExpenseService.runCron()
  },
}
```
