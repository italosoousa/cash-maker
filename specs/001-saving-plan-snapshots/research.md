# Research: Saving Plan Snapshots — Evolução Real

## 1. Setup de testes (Jest + TS + mock do Prisma)

**Contexto**: `package.json` já tem `"test": "jest"` e `jest@29.7.0` em
`devDependencies`, mas:
- Não existe `jest.config.*` no repo.
- Não existe `@types/jest`.
- Não existe nenhum arquivo `*.test.ts` no projeto ainda.
- `babel-jest@29.7.0` só está presente como dependência transitiva do
  próprio `jest` (não há `babel.config.*` nem `@babel/preset-typescript`).
- O `tsconfig.json` define `paths: { "@/*": ["./*"] }`, usado em todo o
  código (`@/lib/prisma`, `@/services/...`).

**Decision**: Adicionar `ts-jest`, `@types/jest` e `jest-mock-extended` como
devDependencies, e criar `jest.config.ts` com:
- `preset: 'ts-jest'`
- `testEnvironment: 'node'`
- `moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' }` (replica o alias `@/*`
  do `tsconfig.json` para o resolvedor do Jest)

`jest-mock-extended` fornece `mockDeep<PrismaClient>()`, permitindo mockar
`prisma.savingPlanSnapshot.upsert/findMany` com tipagem completa, sem tocar
em banco real — exigência explícita do Princípio VII ("Testes usam mocks do
Prisma Client — nunca um banco real").

**Rationale**: `ts-jest` dá type-checking real durante os testes (alinhado
ao TypeScript strict do Princípio I) e exige o menor número de peças novas —
`@babel/preset-typescript` (alternativa via babel) não faz checagem de tipos
e ainda exigiria criar `babel.config.*` do zero; `@swc/jest` exigiria
adicionar `@swc/core` + `@swc/jest`, duas dependências em vez de uma, sem
ganho relevante para uma suíte pequena.

**Alternatives considered**:
- `babel-jest` + `@babel/preset-typescript` — já parcialmente presente
  (transitivo), mas sem type-checking e exige `babel.config` novo. Rejeitado.
- `@swc/jest` — mais rápido, mas adiciona 2 dependências novas (`@swc/core`,
  `@swc/jest`) para um ganho de performance irrelevante na escala do
  projeto. Rejeitado.
- Mock manual do Prisma via `jest.mock('@/lib/prisma', ...)` sem
  `jest-mock-extended` — viável, mas perde a tipagem automática dos métodos
  (`upsert`, `findMany`, etc.), aumentando o risco de testes que não
  refletem a assinatura real do Prisma Client. Rejeitado em favor de
  `jest-mock-extended`, que é o padrão de mercado para esse caso e é
  amplamente usado com `ts-jest`.

## 2. Cálculo de mês/ano em America/Sao_Paulo

**Contexto**: A clarificação da spec define que mês/ano do snapshot usam o
fuso `America/Sao_Paulo` (BRT), igual ao cron de gastos fixos (RN05) e à
convenção de "mês" dos relatórios (RN06). `services/dashboard.service.ts`
já resolve esse mesmo problema sem bibliotecas externas de timezone:

```ts
const today = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) + 'T00:00:00Z')
```

**Decision**: Reusar o mesmo padrão — `new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })`
retorna `YYYY-MM-DD` em BRT; extrair `month = Number(parts[1])` e
`year = Number(parts[0])`. Nenhuma dependência nova necessária.

**Alternatives considered**:
- `date-fns-tz` — adicionaria uma dependência nova só para algo que
  `Intl.DateTimeFormat`/`toLocaleDateString` já resolve e que já é o padrão
  estabelecido no código existente. Rejeitado (Prohibição #7 — sem
  dependências novas sem justificativa, e aqui não há justificativa: o
  padrão nativo já é usado em produção no projeto).

## 3. Disparo do snapshot mensal automático (FR-004)

**Contexto**: `vercel.json` já define um único cron:
`POST /api/cron/fixed-expenses` às `1 3 * * *` (03:01 UTC = 00:01 BRT,
diário). A spec assume que o snapshot mensal "estende a infraestrutura de
automação agendada já existente" em vez de criar um novo mecanismo.

**Decision**: Estender o handler `POST /api/cron/fixed-expenses` para,
após processar os gastos fixos, verificar se a data atual em BRT é dia 1 do
mês e, se for, chamar `savingPlanSnapshotService.runMonthlySnapshot(now)`
(FR-004). A resposta do endpoint passa a incluir também o resultado desse
processo (ex.: `{ data: { fixedExpenses: {...}, savingPlanSnapshots?: {...} } }`).

**Rationale**: Mantém um único cron diário (alinhado ao plano gratuito da
Vercel, que tem número limitado de cron jobs), reaproveita o mecanismo de
autenticação por `CRON_SECRET` já existente, e satisfaz literalmente a
suposição "estende o cron diário existente" da spec.

**Alternatives considered**:
- Nova rota `/api/cron/saving-plan-snapshots` + nova entrada em
  `vercel.json` — rejeitado: consome um slot de cron adicional para uma
  tarefa que só precisa rodar 1x/mês, e contradiz a suposição de "estender"
  a automação existente.

## 4. Idempotência do snapshot (FR-002)

**Decision**: Usar `prisma.savingPlanSnapshot.upsert()` com a constraint
única composta `@@unique([savingPlanId, month, year])` — `create` na
primeira gravação do mês, `update` (sobrescrevendo `balance`) em gravações
subsequentes no mesmo mês/ano. Isso cobre, com a mesma chamada:
- Primeiro aporte do mês → `create`
- Aportes subsequentes no mesmo mês → `update`
- Cron mensal reexecutado / cron rodando no mesmo mês de um aporte já
  registrado → `update` (sem duplicar)

**Alternatives considered**: `findFirst` + `create`/`update` condicional —
funcionalmente equivalente, mas com race condition entre o `findFirst` e o
`create` sob escrita concorrente; `upsert` delega essa garantia ao banco via
a constraint única. Rejeitado em favor de `upsert`.

## 5. Escopo de consulta por usuário (RN03) sem denormalizar `userId`

**Contexto**: `SavingPlanSnapshot` pertence a um `SavingPlan`, que já tem
`userId`. RN03 exige que toda query filtre por `userId` da sessão.

**Decision**: Não duplicar `userId` em `SavingPlanSnapshot`. A camada de
*service* sempre valida a propriedade do plano primeiro
(`prisma.savingPlan.findFirst({ where: { id, userId } })` — sem filtro de
`deletedAt`, pois snapshots de planos excluídos permanecem acessíveis por
decisão da clarificação Q4) e só então delega ao repository, que filtra
`saving_plan_snapshots` por `savingPlanId` (já validado como pertencente ao
usuário). Isso evita uma coluna redundante e mantém o isolamento de dados na
camada correta (service), como já ocorre em `saving-plan.service.ts`.

## 6. Combinação do "ponto de criação" com snapshots reais (FR-008)

**Decision**: O endpoint `GET /api/saving-plans/[id]/snapshots` retorna
apenas os snapshots reais, ordenados por `year` e `month` ASC — exatamente
como descrito no critério de aceite original. O componente de gráfico (que
já recebe `plan.createdAt` e `plan.currentAmount` da listagem existente)
calcula o ponto de criação no cliente, seguindo FR-008:
- Se o primeiro snapshot retornado corresponde ao mês/ano de
  `plan.createdAt` (sempre verdade para planos criados após esta feature,
  por força de FR-003) → usa esse snapshot como primeiro ponto, sem
  duplicar.
- Caso contrário (planos pré-existentes sem snapshot do mês de criação) →
  prefixa um ponto sintético `{ date: plan.createdAt, balance: plan.currentAmount }`
  antes dos snapshots reais.
- Se `snapshots` vier vazio → exibe apenas o ponto sintético de criação.

**Rationale**: Mantém o contrato da API simples e literal ao critério de
aceite ("retorna array ordenado"), e concentra a lógica de apresentação
(FR-008) no componente que já tem acesso a `plan.createdAt`/`currentAmount`
sem necessidade de uma segunda chamada de rede.
