# Implementation Plan: Saving Plan Snapshots — Evolução Real

**Branch**: `001-saving-plan-snapshots` | **Date**: 2026-06-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-saving-plan-snapshots/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Substituir o gráfico de evolução dos Saving Plans — atualmente gerado com
`Math.random()` via `mockMonthlyData()` — por um histórico real baseado em um
novo modelo `SavingPlanSnapshot` (saldo mensal por plano, único por
`[savingPlanId, month, year]`, classificado em America/Sao_Paulo). Snapshots
são gravados: (1) na criação do plano, (2) em cada atualização de
`currentAmount` (aporte), e (3) automaticamente no dia 1 de cada mês via
extensão do cron diário já existente (`/api/cron/fixed-expenses`). Um novo
endpoint `GET /api/saving-plans/[id]/snapshots` expõe o histórico ordenado, e
o componente de gráfico passa a consumi-lo, combinando-o com um "ponto de
criação" calculado no cliente (FR-008).

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Next.js 15.3.2 (App Router), React 19

**Primary Dependencies**: Prisma 6.7 (ORM), Zod (validação de entrada), Recharts 3.8
(gráfico), NextAuth v5 (sessão/autenticação), `Intl.DateTimeFormat` /
`toLocaleDateString` com `timeZone: 'America/Sao_Paulo'` para cálculo de
mês/ano (mesmo padrão já usado em `services/dashboard.service.ts`)

**Storage**: PostgreSQL via Prisma — nova tabela `saving_plan_snapshots`,
relacionada 1:N com `saving_plans` existente

**Testing**: Jest 29 já está em `devDependencies`, mas o projeto não possui
nenhuma configuração de transform/mocks (sem `jest.config`, sem `ts-jest`,
sem `@types/jest`, sem helper de mock do Prisma). A Constituição (Princípio
VII) exige `saving-plan-snapshot.service.test.ts` com Prisma mockado — ver
[research.md](./research.md) para a decisão de setup mínimo.

**Target Platform**: Vercel (funções serverless) + Vercel Cron já configurado
em `vercel.json` (`/api/cron/fixed-expenses`, diário 00:01 BRT / 03:01 UTC)

**Project Type**: Web — monolito Next.js full-stack único (sem split
frontend/backend)

**Performance Goals**: API < 500ms p95 (NFR geral do projeto). Consulta de
snapshots é trivial — no máximo poucas dezenas de linhas por plano.

**Constraints**: Mês/ano do snapshot classificado em America/Sao_Paulo (BRT),
conforme clarificação da spec; constraint única de banco
`[savingPlanId, month, year]` garante idempotência (FR-002).

**Scale/Scope**: App de finanças pessoais — poucos planos por usuário,
~12 snapshots/ano/plano. Sem requisitos de escala adicionais.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Stack Tecnológica Fixa | ✅ Usa apenas Prisma, Zod, Recharts, TS strict — stack já aprovado. ⚠️ Necessário adicionar devDependencies de teste (ver Complexity Tracking) para cumprir o Princípio VII, que hoje é inviável (jest sem transform/mocks configurados). |
| II. Arquitetura em Camadas | ✅ Novo fluxo segue `app/api/saving-plans/[id]/snapshots/route.ts` → `saving-plan-snapshot.service.ts` → `saving-plan-snapshot.repository.ts` → Prisma. `saving-plan.service.ts` (criação/aporte) chama o novo service de snapshot — sem acesso a Prisma fora de repositories nos novos arquivos. |
| III. Isolamento de Dados e Soft Delete | ✅ Toda leitura/escrita de snapshot valida a propriedade do `SavingPlan` via `userId` da sessão antes de operar. Snapshots de planos soft-deleted permanecem acessíveis (decisão da clarificação Q4), consistente com RN02 (histórico preservado). |
| IV. Transações Atômicas e Automação Confiável (RN06) | ✅ Esta feature é a implementação direta de RN06 — remove `Math.random()`/`mockMonthlyData`, usa `SavingPlanSnapshot` real. Upserts são operações de tabela única (não requerem `$transaction()`); a criação de plano + snapshot inicial roda dentro de `prisma.$transaction()` por afetar duas tabelas (RN07). |
| V. Design System Liquid Glass | ✅ Estado vazio/fallback do gráfico (FR-011) reusa tokens existentes (`var(--ink-ghost)`, `glass-card`), sem novas cores ou `style` inline. |
| VI. Segurança e Validação | ✅ `GET /api/saving-plans/[id]/snapshots` exige sessão (401) e valida que o plano pertence ao usuário (404 caso contrário), mesmo padrão de `PATCH`/`DELETE` existentes. Cron mensal reusa o `CRON_SECRET` já validado pela rota `/api/cron/fixed-expenses`. |
| VII. Testes Obrigatórios | ⚠️ `saving-plan-snapshot.service.test.ts` cobre criação, constraint única (upsert) e ordenação com Prisma mockado — requer o setup de teste descrito no Complexity Tracking. |

Nenhum gate bloqueante: as duas ressalvas (⚠️) são resolvidas pela mesma
adição de dependências de teste, justificada abaixo.

### Re-avaliação pós-design (Fase 1)

Após `data-model.md`, `contracts/` e `quickstart.md`:

| Princípio | Status pós-design |
|---|---|
| I. Stack Tecnológica Fixa | ⚠️ → mantém-se como exceção documentada (Complexity Tracking); nenhuma dependência além de `ts-jest`, `@types/jest`, `jest-mock-extended` foi introduzida pelo design. |
| II–VI | ✅ Confirmados — `data-model.md` mantém a arquitetura em camadas, `contracts/saving-plans-snapshots.md` confirma autenticação/autorização (401/404) e ausência de novos tokens visuais; `quickstart.md` não revela violações novas. |
| VII. Testes Obrigatórios | ⚠️ → mantém-se como exceção documentada (mesma dependência de Princípio I); `quickstart.md` Cenário 5 define o escopo mínimo de `saving-plan-snapshot.service.test.ts`. |

Nenhuma nova violação introduzida na Fase 1. As duas exceções permanecem
cobertas pela mesma justificativa em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-saving-plan-snapshots/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── saving-plans-snapshots.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
prisma/
└── schema.prisma                                # + model SavingPlanSnapshot, + relação em SavingPlan

repositories/
└── saving-plan-snapshot.repository.ts           # NOVO — findHistory, upsertForMonth

services/
├── saving-plan.service.ts                        # MODIFICADO — create()/update() chamam o snapshot service
└── saving-plan-snapshot.service.ts               # NOVO — upsertCurrentMonth, listHistory, runMonthlySnapshot

app/api/
├── saving-plans/
│   └── [id]/
│       └── snapshots/
│           └── route.ts                          # NOVO — GET (histórico ordenado)
└── cron/
    └── fixed-expenses/
        └── route.ts                              # MODIFICADO — também roda runMonthlySnapshot() no dia 1 (BRT)

app/(dashboard)/saving-plans/
└── page.tsx                                      # MODIFICADO — remove mockMonthlyData(); busca snapshots reais; novo estado vazio (FR-011)

jest.config.ts                                    # NOVO — ts-jest + moduleNameMapper para "@/*"
services/
└── saving-plan-snapshot.service.test.ts          # NOVO — criação, constraint única, ordenação
```

**Structure Decision**: Monolito Next.js existente — nenhuma nova pasta de
alto nível. A feature adiciona um par repository/service seguindo o padrão já
estabelecido (`repositories/*.repository.ts` + `services/*.service.ts`),
um novo sub-recurso de rota (`[id]/snapshots/route.ts`) e estende o cron
diário já existente em vez de criar uma nova entrada em `vercel.json`. O
teste do novo service fica colocado junto ao arquivo (`*.service.test.ts`),
seguindo a convenção descrita em `services/CLAUDE.md` e no Princípio VII.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|---------------------------------------|
| Adicionar devDependencies de teste: `ts-jest`, `@types/jest`, `jest-mock-extended` (+ `jest.config.ts`) | O projeto já lista `jest` em `devDependencies`, mas não há nenhuma configuração de transform TS nem helper de mock do Prisma. O Princípio VII (Testes Obrigatórios) exige `saving-plan-snapshot.service.test.ts` com Prisma mockado — sem essas peças o teste não roda. | Não adicionar as dependências deixaria a Constituição sem cumprimento possível para esta feature, e qualquer feature futura herdaria o mesmo bloqueio; não há equivalente dentro do stack já aprovado (Prisma/Zod/Next/Jest) que resolva TS+mocks sem alguma dessas peças (ver alternativas avaliadas em research.md). |
