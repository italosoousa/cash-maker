# Contracts: Saving Plan Snapshots

## GET /api/saving-plans/[id]/snapshots (NOVO)

Retorna o histórico de snapshots mensais de um plano de poupança, ordenado
cronologicamente.

### Autenticação

- Requer sessão válida (NextAuth v5). Sem sessão → `401`.

### Autorização

- O plano `[id]` deve pertencer ao usuário da sessão
  (`savingPlan.userId === session.user.id`), **sem** filtrar por `deletedAt`
  — snapshots de planos soft-deleted permanecem acessíveis (clarificação Q4,
  RN02).
- Plano inexistente ou pertencente a outro usuário → `404`.

### Request

```
GET /api/saving-plans/:id/snapshots
```

Sem query params, sem body.

### Response 200

```json
{
  "data": [
    { "month": 1, "year": 2026, "balance": "1500.00" },
    { "month": 2, "year": 2026, "balance": "1800.50" }
  ]
}
```

- `data`: array ordenado por `year` ASC, depois `month` ASC.
- `balance`: string decimal (serialização padrão de `Decimal` do Prisma via
  `toData()`), consistente com `currentAmount` em
  `GET /api/saving-plans`.
- Array vazio (`"data": []`) quando o plano não possui nenhum snapshot
  gravado ainda — o cliente aplica FR-008 (ponto de criação) nesse caso.

### Erros

| Status | Condição |
|---|---|
| 401 | Sem sessão autenticada |
| 404 | Plano não existe ou não pertence ao usuário da sessão |
| 500 | Erro inesperado (ex.: falha de banco) |

---

## Efeitos colaterais em endpoints existentes

Nenhuma alteração de contrato (request/response) dos endpoints abaixo. A
mudança é exclusivamente de **side-effect** no backend.

### POST /api/saving-plans (existente — sem alteração de contrato)

Após criar o `SavingPlan` com sucesso, o service grava (via `upsert`) um
`SavingPlanSnapshot` para o mês/ano corrente (BRT) com
`balance = currentAmount` informado na criação (FR-003). Ambas as escritas
ocorrem dentro de `prisma.$transaction()` (RN07).

- Falha ao gravar o snapshot é tratada como falha da transação inteira —
  a criação do plano e o snapshot inicial são atômicos.
- Response e status codes (`201`, `400`, `401`, `500`) permanecem
  inalterados.

### PATCH /api/saving-plans/[id] (existente — sem alteração de contrato)

Quando o body inclui `currentAmount` (aporte/edição de saldo), o service
grava (via `upsert`) um `SavingPlanSnapshot` para o mês/ano corrente (BRT)
com o novo `balance` (FR-003), dentro de `prisma.$transaction()` junto com
o `update` do plano (RN07).

- Quando `currentAmount` não está presente no body do PATCH, nenhum
  snapshot é gravado/atualizado.
- Response e status codes (`200`, `400`, `401`, `404`, `500`) permanecem
  inalterados.

### POST /api/cron/fixed-expenses (existente — response amplia, sem breaking change)

Quando a execução ocorre em dia 1 do mês (BRT), o handler adicionalmente
chama `savingPlanSnapshotService.runMonthlySnapshot(now)` (FR-004, FR-005)
após processar os gastos fixos.

- Response passa a incluir, condicionalmente, a chave `savingPlanSnapshots`:
  ```json
  {
    "data": {
      "fixedExpenses": { "processed": 3, "errors": [] },
      "savingPlanSnapshots": { "processed": 5, "errors": [] }
    }
  }
  ```
- Em dias que não são dia 1 (BRT), `savingPlanSnapshots` está ausente do
  payload (mesmo formato atual, sem breaking change).
- Autenticação (`Authorization: Bearer <CRON_SECRET>`) e status codes
  (`200`, `401`, `500`) permanecem inalterados.
