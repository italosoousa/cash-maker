<!--
Sync Impact Report
==================
Version change: [TEMPLATE] → 1.0.0 (initial ratification)

Modified principles: N/A (initial creation)

Added sections:
- Core Principles I–VII (Stack Tecnológica Fixa, Arquitetura em Camadas,
  Isolamento de Dados e Soft Delete, Transações Atômicas e Automação
  Confiável, Design System Liquid Glass, Segurança e Validação, Testes
  Obrigatórios)
- Estrutura de Projeto
- Proibições Absolutas
- Governance

Removed sections: N/A (replaced template placeholders)

Templates requiring updates:
- .specify/templates/plan-template.md ✅ already includes a "Constitution
  Check" gate compatible with this constitution (no edit required)
- .specify/templates/spec-template.md ✅ no constitution-specific references
  to update
- .specify/templates/tasks-template.md ✅ no constitution-specific references
  to update
- .specify/templates/commands/*.md — directory does not exist, nothing to
  update

Follow-up TODOs: none
-->

# Cashmaker Constitution

## Core Principles

### I. Stack Tecnológica Fixa (NON-NEGOTIABLE)

O projeto usa um conjunto fechado de tecnologias. Nenhuma alternativa pode ser
introduzida sem justificativa explícita registrada no plano (`plan.md`):

- **Framework**: Next.js 15.3.2 com App Router exclusivamente. Pages Router é PROIBIDO.
- **React**: versão 19. `React.FC` é PROIBIDO — usar function declarations com
  tipagem explícita de props e retorno.
- **TypeScript**: modo strict. `any` e `@ts-ignore` são PROIBIDOS. Todo tipo deve
  ser explícito.
- **Estilos**: Tailwind CSS v4 + CSS variables globais em `globals.css`. `style`
  inline, CSS Modules, styled-components e emotion são PROIBIDOS (exceção: ver
  Princípio V para cores dinâmicas de categoria via custom property).
- **Componentes**: shadcn/ui (radix-ui) como base. Não criar componente de UI do
  zero quando existir equivalente em shadcn.
- **Ícones**: Lucide React exclusivamente.
- **Gráficos**: Recharts 3.8 exclusivamente. Chart.js, D3 direto ou equivalentes
  são PROIBIDOS.
- **ORM**: Prisma 6.7 exclusivamente. SQL raw só via `prisma.$queryRaw` com
  tipagem explícita.
- **Banco**: PostgreSQL exclusivamente.
- **Auth**: NextAuth v5 (beta.28) com `@auth/prisma-adapter`. Implementação manual
  de autenticação é PROIBIDA.
- **Validação**: Zod em toda entrada de dados (API routes e formulários), com
  React Hook Form nos formulários.
- **Toasts**: Sonner exclusivamente.
- **HTTP client**: `fetch` nativo do Next.js com cache/revalidation. `axios` é
  PROIBIDO.
- **Package manager**: pnpm 11 exclusivamente. `npm` e `yarn` são PROIBIDOS.

**Rationale**: um stack fechado elimina decisões repetidas, mantém o bundle
previsível e garante que qualquer agente ou desenvolvedor produza código
consistente com o restante da base.

### II. Arquitetura em Camadas (NON-NEGOTIABLE)

Toda funcionalidade segue obrigatoriamente o fluxo:

```
Route Handler (app/api/[rota]/route.ts)
  → Service (services/[feature].service.ts)
  → Repository (repositories/[feature].repository.ts)
  → Prisma Client
  → PostgreSQL
```

- **Route Handler**: apenas validação Zod da entrada, chamada ao Service e
  retorno HTTP. NUNCA contém lógica de negócio.
- **Service**: concentra toda a lógica de negócio e orquestra chamadas ao
  Repository.
- **Repository**: apenas queries Prisma, sem lógica de negócio.
- Prisma NUNCA é acessado diretamente em Route Handlers ou componentes React —
  somente dentro de Repositories.
- Server Components NUNCA fazem fetch HTTP para a própria API quando podem
  chamar o Service diretamente.

**Rationale**: a separação de camadas mantém a lógica de negócio testável e
isolada do transporte HTTP e do acesso a dados, permitindo trocar qualquer
camada sem efeitos colaterais nas demais.

### III. Isolamento de Dados e Soft Delete (NON-NEGOTIABLE)

- **RN01 — Isolamento por usuário**: todo dado pertence a um `userId`. Toda
  query Prisma DEVE filtrar pelo `userId` da sessão autenticada. Retornar dados
  de outro usuário é uma violação crítica.
- **RN02 — Soft delete**: `Transaction` nunca é deletada fisicamente. Usa-se
  `deletedAt: DateTime?`. Toda query de listagem/relatório filtra
  `deletedAt: null` por padrão; registros soft-deleted só aparecem no histórico.
- **RN03 — Categorias do sistema**: categorias com `isSystem: true` nunca podem
  ser excluídas, apenas renomeadas/editadas pelo usuário.
- **RN04 — Guard de exclusão de categoria**: uma categoria com transações
  vinculadas nunca pode ser excluída; o Service DEVE verificar isso antes de
  qualquer exclusão.

**Rationale**: estas regras protegem a integridade e privacidade dos dados
financeiros do usuário e preservam o histórico para auditoria e relatórios.

### IV. Transações Atômicas e Automação Confiável

- **RN05 — Gastos fixos**: gastos fixos ativos geram transações automaticamente
  via Vercel Cron, executado diariamente às 00:01 BRT (03:01 UTC), usando
  `source: "auto"` para identificação. Gasto fixo inativo não gera novas
  transações; editar o valor não altera transações já geradas.
- **RN06 — Saving Plans**: o status (em dia / atrasado / concluído) é SEMPRE
  calculado em runtime, nunca persistido. O gráfico de evolução usa dados reais
  da tabela `SavingPlanSnapshot`. `Math.random()` ou dados mockados em produção
  são PROIBIDOS.
- **RN07 — Atomicidade**: qualquer operação que afete múltiplas tabelas DEVE
  usar `prisma.$transaction()`.

**Rationale**: automações financeiras e cálculos de progresso precisam ser
determinísticos, reproduzíveis e consistentes mesmo sob falhas parciais.

### V. Design System Liquid Glass

A identidade visual usa os tokens CSS REAIS definidos em `globals.css` — uma
paleta cinza/lavanda, não a paleta verde documentada em versões antigas do
`CLAUDE.md`:

- Escala neutra `--gray-50` a `--gray-900` como base da UI.
- Status financeiros usam SEMPRE `var(--status-income)` (receitas/saldo
  positivo) e `var(--status-expense)` (despesas/saldo negativo). Classes
  Tailwind `green-*` ou `red-*` para esses casos são PROIBIDAS.
- Erros/danger usam `var(--status-err)` ou `var(--status-expense)`; hover de
  danger usa `var(--status-expense-dark)` (criar o token se ainda não existir).
  `bg-red-*` é PROIBIDO.
- Aliases legados `--status-ok` / `--status-err` podem existir para
  compatibilidade, mas o código novo prefere `--status-income` /
  `--status-expense`.
- Glass card padrão: `background: rgba(244, 244, 250, 0.75)` (lavanda),
  `backdrop-filter: blur(20px) saturate(1.8)`,
  `border: 1px solid rgba(var(--gray-200), 0.6)`.
- Cores dinâmicas de categoria NUNCA usam `style={{ color: categoryColor }}`.
  Usar `style={{ '--cat-color': color } as React.CSSProperties}` e referenciar
  via `className="text-[--cat-color]"`.
- Tipografia: Inter para corpo de texto, Space Grotesk para headings,
  JetBrains Mono para todo valor monetário (R$, saldos, valores numéricos). O
  símbolo "R$" usa peso 400 e 70% do tamanho do valor principal; casas decimais
  ficam entre 60% e 70% do tamanho do inteiro.

**Rationale**: consistência visual é parte do produto — a estética Liquid Glass
e a codificação de cores por status (nunca vermelho/verde genéricos do
Tailwind) são decisões de marca, não detalhes incidentais.

### VI. Segurança e Validação

- `bcrypt` com `saltRounds` mínimo de 12 para qualquer hash de senha.
- Secrets nunca são expostos ao client; variáveis com prefixo `NEXT_PUBLIC_`
  são usadas apenas para valores genuinamente públicos.
- Toda API route verifica a sessão autenticada antes de qualquer operação:
  retorna `401` se não autenticado e `403` se o `userId` da sessão não
  corresponder ao recurso.
- Nenhum dado vindo do cliente é confiável sem validação Zod no servidor.

**Rationale**: dados financeiros pessoais exigem barreiras de segurança
redundantes — validação no cliente nunca substitui validação no servidor.

### VII. Testes Obrigatórios

- Framework: Jest + Supertest.
- Toda nova feature de Service DEVE ter um arquivo `.test.ts` correspondente
  (`[feature].service.test.ts`, `[feature].repository.test.ts`).
- Testes usam mocks do Prisma Client — nunca um banco real.
- Cobertura mínima obrigatória para: cálculo de saldo, soft delete, guards de
  categoria, lógica de cron de gastos fixos e isolamento por `userId`.

**Rationale**: regras de negócio financeiras (RN01–RN07) são as áreas de maior
risco de regressão silenciosa; testes automatizados são a única defesa
sustentável à medida que o produto cresce.

## Estrutura de Projeto

A organização de pastas é fixa e reflete diretamente o Princípio II:

```
app/
├── (auth)/login, /register
├── (dashboard)/
│   ├── dashboard/        ← página principal
│   ├── transactions/
│   ├── categories/
│   ├── fixed-expenses/
│   ├── saving-plans/
│   ├── importar/ + /revisar
│   ├── profile/
│   └── reports/          ← stub, pendente
└── api/
    ├── auth/
    ├── transactions/
    ├── categories/
    ├── fixed-expenses/
    ├── saving-plans/
    ├── importar/
    ├── profile/
    └── cron/fixed-expenses   ← Vercel Cron, 03:01 UTC

services/        ← lógica de negócio
repositories/    ← queries Prisma
lib/
├── auth.ts                ← config NextAuth
└── importar/parsers/       ← parsers por banco (Nubank implementado; demais pendentes)
components/
└── ui/            ← shadcn/ui — não modificar diretamente
```

Importação bancária: nenhum banco é habilitado na tela de importação sem um
parser correspondente em `lib/importar/parsers/`; bancos sem parser exibem
badge "Em breve".

## Proibições Absolutas

O agente NUNCA deve:

1. Mockar dados financeiros em produção (`Math.random()`, dados hardcoded).
2. Usar `style` inline para cores — sempre CSS variables ou Tailwind (exceção
   documentada no Princípio V para `--cat-color`).
3. Usar `red-*` do Tailwind para erros financeiros — sempre `var(--status-expense)`.
4. Acessar Prisma fora da camada Repository.
5. Retornar dados sem filtrar por `userId` da sessão.
6. Deletar fisicamente uma `Transaction` — sempre soft delete com `deletedAt`.
7. Adicionar dependências novas sem justificativa explícita no plano.
8. Habilitar um banco sem parser na tela de importação.
9. Escrever lógica de negócio em Route Handlers.
10. Usar `any` no TypeScript.

## Governance

- Esta constituição prevalece sobre qualquer prática, template ou preferência
  divergente, incluindo versões anteriores de `CLAUDE.md`.
- Qualquer plano (`plan.md`) gerado pelo `/speckit-plan` DEVE incluir uma seção
  "Constitution Check" que confirme aderência a todos os Princípios I–VII e às
  Proibições Absolutas, ou justifique cada desvio na tabela de Complexity
  Tracking.
- Emendas a esta constituição exigem: (a) descrição da mudança e motivação,
  (b) atualização do número de versão conforme semver abaixo, (c) atualização
  da data de "Last Amended", e (d) revisão dos templates dependentes em
  `.specify/templates/` para garantir consistência.
- Versionamento (semver):
  - **MAJOR**: remoção ou redefinição incompatível de princípios/regras de
    negócio existentes.
  - **MINOR**: adição de novo princípio, regra de negócio ou seção, ou
    expansão material de orientação existente.
  - **PATCH**: correções de redação, esclarecimentos e ajustes não semânticos.
- Toda revisão de código (própria ou de agente) DEVE verificar conformidade com
  as Regras de Negócio (RN01–RN07), o Design System (Princípio V) e as
  Proibições Absolutas antes de ser considerada concluída.

**Version**: 1.0.0 | **Ratified**: 2026-06-13 | **Last Amended**: 2026-06-13
