# Quickstart: Validação — Saving Plan Snapshots

Guia para validar manualmente, de ponta a ponta, que o gráfico de evolução
dos Saving Plans usa dados reais (sem `Math.random()`).

## Pré-requisitos

- Branch `001-saving-plan-snapshots` com as migrations da Fase de
  implementação aplicadas:
  ```bash
  npx prisma migrate dev --name add_saving_plan_snapshot
  npx prisma generate
  ```
- Servidor de desenvolvimento rodando:
  ```bash
  npm run dev
  ```
- Usuário autenticado (sessão NextAuth válida) — login normal pela UI ou
  cookie de sessão para chamadas via `curl`.
- `CRON_SECRET` definido em `.env.local` (necessário para o cenário 4).

## Cenário 1 — Criação de plano gera o primeiro snapshot (FR-003)

1. Na UI, em **Saving Plans**, crie um novo plano com `currentAmount` inicial
   (ex.: `R$ 100,00`).
2. Verifique no banco (Prisma Studio ou `psql`) que existe um registro em
   `saving_plan_snapshots` para esse `savingPlanId` com `month`/`year`
   correspondentes ao mês atual em **America/Sao_Paulo** e
   `balance = 100.00`.
3. Chame o novo endpoint:
   ```bash
   curl -s http://localhost:3000/api/saving-plans/<ID>/snapshots \
     -H "Cookie: <session-cookie>"
   ```
   **Esperado**: `{"data":[{"month":<mês atual>,"year":<ano atual>,"balance":"100.00"}]}`

## Cenário 2 — Aporte atualiza o snapshot do mês (FR-002/FR-003)

1. Edite o plano criado no Cenário 1 e altere `currentAmount` para
   `R$ 250,00` (mesmo mês/ano).
2. Repita a chamada GET do Cenário 1.
   **Esperado**: ainda **um único** item no array, agora com
   `"balance":"250.00"` (sobrescrita via `upsert`, sem duplicata —
   valida a constraint `[savingPlanId, month, year]`, FR-002).

## Cenário 3 — Gráfico exibe dados reais (FR-008, FR-011)

1. Acesse a página de detalhe do plano (`/saving-plans`, painel de detalhe).
2. **Esperado**: o gráfico de evolução não usa mais `mockMonthlyData()` —
   exibe o(s) ponto(s) reais do(s) snapshot(s) do Cenário 1/2, combinados
   com o ponto de criação do plano conforme FR-008.
3. Para validar o estado de erro/indisponível (FR-011): force uma falha
   temporária na chamada da API de snapshots (ex.: interrompa o servidor ou
   simule erro de rede via devtools) e confirme que o gráfico mostra uma
   mensagem explicativa em vez de quebrar ou exibir gráfico vazio.

## Cenário 4 — Snapshot mensal automático via cron (FR-004/FR-005)

1. Garanta que existe pelo menos um plano ativo (`deletedAt: null`) com
   `currentAmount` diferente do snapshot do mês atual (edite manualmente no
   banco o `balance` do snapshot do mês atual para simular um valor
   desatualizado, ou apague o snapshot do mês atual).
2. Chame o endpoint do cron simulando o dia 1 (BRT) — se o teste não estiver
   sendo executado no dia 1, valide a lógica via o teste automatizado
   (Cenário 5) em vez de uma chamada HTTP real, OU ajuste temporariamente o
   relógio do ambiente de teste.
3. Em dia 1 (BRT) real:
   ```bash
   curl -s -X POST http://localhost:3000/api/cron/fixed-expenses \
     -H "Authorization: Bearer $CRON_SECRET"
   ```
   **Esperado**: response inclui `data.savingPlanSnapshots.processed >= 1` e
   o snapshot do mês atual do plano passa a refletir `currentAmount`.
4. Em dias que não são dia 1 (BRT):
   **Esperado**: response **não** inclui a chave `savingPlanSnapshots`
   (comportamento idêntico ao atual).

## Cenário 5 — Testes automatizados (Princípio VII)

```bash
npm run test -- saving-plan-snapshot.service.test.ts
```

**Esperado**: suíte cobre, no mínimo:
- Criação do primeiro snapshot do mês (`create` via `upsert`).
- Upsert idempotente — segunda chamada no mesmo mês atualiza `balance` sem
  criar novo registro (constraint `[savingPlanId, month, year]`).
- `listHistory` retorna snapshots ordenados por `year, month` ASC.
- Validação de propriedade (RN03): usuário sem acesso ao plano recebe erro
  ao chamar `listHistory`.

Todos os testes devem rodar com o Prisma mockado (`jest-mock-extended`),
sem conexão a banco real — ver [research.md](./research.md) §1.

## Critério de sucesso geral

- Nenhuma ocorrência de `Math.random()` ou `mockMonthlyData` permanece no
  código (`grep -r "mockMonthlyData\|Math.random" app/ services/ components/`
  retorna vazio para este escopo).
- O gráfico de evolução, em qualquer plano (novo ou pré-existente), exibe
  apenas dados originados de `SavingPlanSnapshot` e/ou do ponto de criação
  do plano (FR-008) — nunca dados sintéticos aleatórios.
