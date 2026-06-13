# Feature Specification: Saving Plan Snapshots — Evolução Real

**Feature Branch**: `001-saving-plan-snapshots`

**Created**: 2026-06-13

**Status**: Draft

**Input**: User description: "Saving Plans — Substituição de dados falsos por dados reais: o gráfico de evolução dos Saving Plans usa Math.random() (mockMonthlyData) e precisa ser substituído por um sistema de snapshots mensais que registra o saldo real de cada plano de poupança ao longo do tempo."

## Clarifications

### Session 2026-06-13

- Q: Qual fuso horário determina a que mês/ano um snapshot pertence (tanto
  para o snapshot gerado por aporte quanto para o automático mensal)? → A:
  America/Sao_Paulo (BRT) — mesma referência usada pelo cron de gastos fixos
  (RN05) e pela convenção de "mês" usada nos relatórios mensais (RN06).
- Q: Ao criar um novo plano de poupança (com saldo inicial), o sistema deve
  gravar imediatamente um snapshot do mês de criação? → A: Sim — a criação
  do plano grava imediatamente um snapshot do mês corrente com o saldo
  inicial; FR-008 ("sem snapshots") passa a ser cenário aplicável apenas a
  planos pré-existentes a esta funcionalidade.
- Q: Quando já existir ao menos um snapshot real, mas nenhum cobrindo o mês
  de criação do plano (cenário possível para planos pré-existentes), o
  gráfico deve...? → A: Sempre incluir um ponto de criação (data de criação
  do plano + saldo do plano nesse momento) como primeiro ponto do gráfico,
  complementado pelos snapshots reais a partir de seus respectivos meses.
- Q: Após um plano de poupança ser excluído (soft delete), o histórico de
  snapshots já registrado deve...? → A: Permanecer no banco e continuar
  acessível via API, consistente com a filosofia de soft delete do projeto
  (RN02) — o histórico é preservado mesmo que o plano não esteja mais ativo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver evolução real do plano de poupança (Priority: P1)

Ao acessar os detalhes de um plano de poupança, o usuário vê um gráfico de
evolução baseado em saldos reais já registrados, em vez de valores
gerados aleatoriamente a cada visualização.

**Why this priority**: É o problema central reportado — exibir dados falsos
em um app financeiro quebra a confiança do usuário no produto. Resolver isso
é o valor mínimo entregável da feature.

**Independent Test**: Pode ser testado abrindo a página de detalhes de um
plano com snapshots registrados e confirmando que o gráfico exibe um ponto
por mês com o saldo correspondente, na ordem cronológica, e que os valores
permanecem idênticos em recarregamentos sucessivos da página.

**Acceptance Scenarios**:

1. **Given** um plano de poupança com snapshots mensais registrados, **When**
   o usuário abre a página de detalhes do plano, **Then** o gráfico exibe um
   ponto por mês com o saldo registrado, em ordem cronológica (mais antigo →
   mais recente).
2. **Given** um plano de poupança sem nenhum snapshot registrado, **When** o
   usuário abre a página de detalhes do plano, **Then** o gráfico exibe
   apenas o ponto inicial, correspondente à data de criação do plano e ao
   saldo inicial.
3. **Given** o gráfico já está exibido, **When** o usuário recarrega a página
   múltiplas vezes sem alterar o saldo do plano, **Then** os valores exibidos
   no gráfico são idênticos em todas as recargas.

---

### User Story 2 - Aporte registra snapshot do mês corrente (Priority: P1)

Ao atualizar o saldo de um plano de poupança (registrar um aporte), o sistema
grava ou atualiza o snapshot referente ao mês corrente com o novo saldo, para
que o histórico de evolução reflita a mudança imediatamente.

**Why this priority**: Sem isso, o histórico nunca seria atualizado pelas
ações do próprio usuário, tornando o gráfico estático e o sistema de
snapshots inútil na prática. É tão crítico quanto a User Story 1.

**Independent Test**: Pode ser testado atualizando o saldo atual de um plano
e verificando que passa a existir um snapshot para o mês/ano corrente com o
novo saldo; repetir a atualização no mesmo mês deve atualizar esse mesmo
snapshot, sem criar um segundo registro para o mesmo mês.

**Acceptance Scenarios**:

1. **Given** um plano de poupança existente sem snapshot para o mês corrente,
   **When** o usuário atualiza o saldo atual do plano, **Then** um novo
   snapshot é criado para o mês/ano corrente com o saldo atualizado.
2. **Given** um plano de poupança já possui um snapshot para o mês corrente,
   **When** o usuário atualiza o saldo atual do plano novamente dentro do
   mesmo mês, **Then** o snapshot existente do mês corrente é atualizado com
   o novo saldo, sem criar um registro duplicado para o mesmo mês.

---

### User Story 3 - Snapshot mensal automático para planos ativos (Priority: P2)

No primeiro dia de cada mês, o sistema registra automaticamente um snapshot
do saldo atual de todos os planos de poupança ativos, garantindo que o
histórico de evolução continue mesmo para planos sem aportes recentes.

**Why this priority**: Garante continuidade do histórico para planos que não
recebem aportes com frequência. É complementar às User Stories 1 e 2 — o
gráfico já funciona com dados reais sem isto, mas planos "esquecidos" teriam
lacunas no histórico.

**Independent Test**: Pode ser testado simulando a execução do processo
mensal automático e confirmando que todo plano ativo (não excluído) passa a
ter exatamente um snapshot para o mês/ano da execução, refletindo seu saldo
atual no momento.

**Acceptance Scenarios**:

1. **Given** é o primeiro dia de um novo mês, **When** o processo automático
   mensal é executado, **Then** todo plano de poupança ativo (não excluído)
   passa a ter um snapshot registrado para aquele mês/ano com seu saldo
   atual.
2. **Given** um plano já recebeu um snapshot para o mês corrente (por
   exemplo, via aporte), **When** o processo automático mensal é executado,
   **Then** nenhum snapshot duplicado é criado para aquele mês — o registro
   existente é preservado/atualizado.

---

### Edge Cases

- O que acontece quando um plano de poupança é criado no meio do mês e ainda
  não recebeu nenhum aporte? → O gráfico exibe apenas o ponto inicial (data
  de criação + saldo inicial, vindo do snapshot gerado na criação do plano).
- O que acontece com um plano pré-existente (criado antes desta
  funcionalidade) que ainda não possui nenhum snapshot e recebe seu primeiro
  snapshot real em um mês posterior ao de criação? → O gráfico exibe o ponto
  de criação (data de criação + saldo atual no momento da visualização)
  seguido pelos snapshots reais a partir do mês em que passaram a ser
  registrados.
- O que acontece com um plano que possui histórico de múltiplos
  meses/anos? → Os snapshots são retornados em ordem cronológica (ano e mês
  crescentes) para que o gráfico seja renderizado corretamente da esquerda
  para a direita.
- O que acontece quando um plano de poupança é excluído (soft delete)? → O
  plano é excluído do processo automático mensal a partir de então (nenhum
  novo snapshot é registrado para ele), mas os snapshots já registrados
  permanecem no histórico e continuam acessíveis via API.
- O que acontece se o processo automático mensal for executado mais de uma
  vez no mesmo mês (ex.: reexecução)? → Nenhum snapshot duplicado é criado; o
  snapshot existente do mês/ano é atualizado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST registrar snapshots mensais do saldo de cada
  plano de poupança, cada snapshot identificado pelo plano, mês e ano a que
  se refere, com mês/ano determinados pelo fuso horário America/Sao_Paulo
  (BRT).
- **FR-002**: O sistema MUST impedir mais de um snapshot por plano de
  poupança por mês/ano — uma nova gravação para um mês/ano já existente
  atualiza o snapshot existente em vez de criar um duplicado.
- **FR-003**: O sistema MUST registrar um snapshot do mês corrente (mês/ano
  em America/Sao_Paulo) com o saldo inicial ao criar um novo plano de
  poupança, e MUST registrar ou atualizar o snapshot do mês corrente sempre
  que o usuário atualizar o saldo atual de um plano de poupança existente
  (registrar um aporte).
- **FR-004**: O sistema MUST registrar automaticamente, no primeiro dia de
  cada mês (America/Sao_Paulo), um snapshot para todo plano de poupança
  ativo.
- **FR-005**: O sistema MUST excluir planos de poupança inativos (excluídos
  via soft delete) do processo automático mensal de snapshots, preservando
  os snapshots já registrados anteriormente para esse plano.
- **FR-006**: O sistema MUST expor o histórico de snapshots de um plano de
  poupança como uma lista ordenada cronologicamente (do mais antigo para o
  mais recente), independentemente de o plano estar ativo ou excluído (soft
  delete).
- **FR-007**: O gráfico de evolução MUST exibir o histórico de saldos
  registrados quando existirem snapshots para o plano.
- **FR-008**: O gráfico de evolução MUST sempre exibir, como primeiro ponto,
  a data de criação do plano combinada com o saldo do plano nesse momento —
  usando o saldo registrado no snapshot do mês de criação quando ele existir
  (caso de planos criados após esta funcionalidade, via FR-003), ou o saldo
  atual do plano como melhor estimativa quando não houver snapshot do mês de
  criação (caso de planos pré-existentes a esta funcionalidade). Os demais
  snapshots reais, se houver, são exibidos em seguida, em ordem cronológica.
  Quando não existir nenhum snapshot para o plano, esse ponto de criação é o
  único ponto exibido.
- **FR-009**: O gráfico de evolução MUST NOT exibir, em nenhuma circunstância,
  valores gerados aleatoriamente ou simulados.
- **FR-010**: O sistema MUST remover a geração de dados aleatórios atualmente
  usada pelo gráfico de evolução dos planos de poupança.
- **FR-011**: Se, por qualquer motivo, não for possível determinar nenhum
  ponto para o gráfico (nem snapshots, nem o ponto de criação do FR-008 —
  por exemplo, falha ao carregar os dados de evolução), o gráfico de
  evolução MUST exibir uma mensagem explicativa de estado vazio/indisponível
  em vez de um gráfico em branco ou quebrado.

### Key Entities *(include if feature involves data)*

- **Snapshot de Plano de Poupança**: registro mensal do saldo de um plano de
  poupança em um determinado mês/ano. Atributos conceituais: plano ao qual
  pertence, mês, ano, saldo registrado naquele momento, data/hora do
  registro. Não pode haver mais de um snapshot por combinação plano +
  mês + ano.
- **Plano de Poupança**: entidade existente que representa uma meta de
  economia do usuário (nome, saldo atual, meta, data de criação). Passa a
  possuir um histórico de snapshots mensais associado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuários que visualizam o gráfico de evolução de qualquer plano
  de poupança veem apenas valores reais previamente registrados — os valores
  exibidos nunca mudam entre recarregamentos da página sem que o saldo
  subjacente tenha mudado.
- **SC-002**: 100% das atualizações de saldo de um plano de poupança
  resultam no snapshot do mês corrente refletindo o novo saldo dentro da
  mesma operação.
- **SC-003**: No início de cada mês, todos os planos de poupança ativos
  passam a ter um snapshot registrado para aquele mês sem necessidade de
  intervenção manual.
- **SC-004**: Um plano de poupança sem histórico exibe um estado de gráfico
  claro e compreensível (ponto inicial ou mensagem de estado vazio) em vez de
  erro ou gráfico vazio sem explicação.
- **SC-005**: Não há mais nenhuma ocorrência de dados financeiros
  aleatórios/simulados na feature de planos de poupança.

## Assumptions

- "Registrar um aporte" é interpretado como qualquer atualização do saldo
  atual (`currentAmount`) de um plano de poupança através do fluxo de edição
  existente — esta feature não introduz um novo conceito de "lançamento de
  aporte" separado. A criação de um plano (que define o saldo inicial) é
  tratada como o primeiro registro de saldo do plano, gerando seu primeiro
  snapshot.
- O snapshot mensal automático estende a infraestrutura de automação
  agendada já existente no projeto (ex.: o cron diário de gastos fixos),
  em vez de introduzir um novo mecanismo de agendamento.
- "Plano ativo" significa um plano de poupança não excluído via soft delete
  (`deletedAt` nulo), consistente com a convenção já usada para outras
  entidades do sistema.
- Snapshots retroativos para o histórico anterior ao lançamento desta feature
  estão fora de escopo — o histórico passa a ser acumulado a partir do
  momento em que esta feature entra em produção.
- Exportação do histórico de snapshots está fora de escopo.
- Não há limite de retenção definido para os snapshots — todos os registros
  mensais são mantidos indefinidamente, salvo definição futura em contrário.
