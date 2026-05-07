# Cash Maker — Briefing para Claude Code

> Este arquivo é lido automaticamente pelo Claude Code. Ele contém todas as
> decisões de produto, stack, design e regras de negócio do projeto.
> **Sempre siga estas diretrizes antes de gerar qualquer código.**

## Documentação técnica detalhada (`docs/`)

| Arquivo | Conteúdo |
|---------|----------|
| [docs/architecture.md](docs/architecture.md) | Stack, estrutura de pastas, fluxo de request, padrões de componentes |
| [docs/api-reference.md](docs/api-reference.md) | Todos os endpoints REST com body, response e erros |
| [docs/database.md](docs/database.md) | Schema Prisma, models, padrões de query, migrations |
| [docs/design-system.md](docs/design-system.md) | CSS variables, componentes, tipografia, regras visuais |
| [docs/decisions/](docs/decisions/) | ADRs — registro de decisões arquiteturais |

> Subpastas chave (`services/`, `components/`, `repositories/`, `app/api/`) também
> possuem seus próprios `CLAUDE.md` com contexto específico de cada camada.

---

## 1. O que é o projeto

**Cash Maker** é um sistema web de gestão financeira pessoal. O objetivo é
oferecer controle total sobre receitas, despesas e metas financeiras com uma
interface moderna inspirada na estética **Liquid Glass** da Apple.

- Slogan: _"Organize. Controle. Cresça."_
- Público-alvo inicial: uso pessoal (pessoa física)
- Roadmap: MVP pessoal → produto comercial escalável

---

## 2. Stack Tecnológica

| Camada        | Tecnologia                     | Versão   |
|---------------|-------------------------------|----------|
| Framework     | Next.js (App Router)          | 15+      |
| Estilo        | Tailwind CSS + shadcn/ui      | v4       |
| Ícones        | Lucide React                  | latest   |
| Gráficos      | Recharts                      | 2.x      |
| Backend       | Next.js API Routes (Node.js)  | 15+      |
| ORM           | Prisma                        | latest   |
| Banco         | PostgreSQL                    | latest   |
| DB Hosting    | Neon.tech                     | free tier|
| Deploy        | Vercel                        | free tier|
| Auth          | NextAuth.js                   | v5       |
| Validação     | Zod                           | latest   |
| E-mail        | Resend                        | latest   |
| Testes        | Jest + Supertest              | latest   |

### Regras de estilo
- Usar **Tailwind CSS v4** para utilitários
- Usar **shadcn/ui** para componentes base (Button, Card, Dialog, Table, Toast etc.)
- O efeito **Liquid Glass** é aplicado via CSS variables definidas em `globals.css`
- Toasts via **Sonner** (integrado ao shadcn/ui)
- **Nunca usar `style` inline** — sempre classes Tailwind ou CSS variables
- Fontes importadas via `next/font/google` (Space Grotesk, Inter, JetBrains Mono)

---

## 3. Identidade Visual — Liquid Glass

### Conceito
Interface inspirada no visionOS/iOS da Apple: superfícies translúcidas,
backdrop-filter blur, bordas luminosas e paleta verde suave. O glass é o
principal diferencial visual do produto.

### Classe glass base (definida em globals.css)
```css
.glass-card {
  background: rgba(240, 250, 244, 0.72);
  backdrop-filter: blur(20px) saturate(1.8);
  -webkit-backdrop-filter: blur(20px) saturate(1.8);
  border: 1px solid rgba(183, 228, 199, 0.6);
  border-radius: 20px;
  box-shadow:
    0 8px 32px rgba(45, 106, 79, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}
```

### Paleta de cores — CSS Variables (globals.css)
```css
:root {
  /* Verdes da marca */
  --green-deep:   #2D6A4F;  /* textos de destaque, logo, headings */
  --green-mid:    #52B788;  /* CTAs, elementos ativos, bordas glass */
  --green-soft:   #74C69D;  /* ícones, badges, indicadores */
  --green-mist:   #B7E4C7;  /* bordas de cards glass, separadores */
  --green-frost:  #D8F3DC;  /* fundo de cards, hover states */
  --green-air:    #F0FAF4;  /* background geral */

  /* Texto */
  --ink-dark:     #1B3A2D;  /* texto principal */
  --ink-mid:      #3D6B55;  /* subtítulos, corpo */
  --ink-soft:     #6B9E82;  /* captions, labels */
  --ink-ghost:    #9DC4AD;  /* textos discretos, rodapé */

  /* Glass neutros */
  --glass-silver: #EEF2F0;  /* seções alternadas */

  /* Status */
  --status-ok:    #52B788;  /* receita, sucesso */
  --status-err:   #E07A5F;  /* despesa, erro (terracota — não vermelho) */
  --status-warn:  #F2CC8F;  /* alerta, atenção */
  --status-info:  #81B29A;  /* informação neutra */

  /* Glass properties */
  --glass-bg:     rgba(240, 250, 244, 0.72);
  --glass-blur:   blur(20px) saturate(1.8);
  --glass-border: rgba(183, 228, 199, 0.6);
  --glass-shadow: 0 8px 32px rgba(45, 106, 79, 0.10);
}
```

### Dark mode (tokens)
```css
[data-theme="dark"] {
  --bg-base:      #0D1F17;
  --glass-bg:     rgba(30, 60, 45, 0.70);
  --glass-border: rgba(82, 183, 136, 0.25);
  --ink-dark:     #D8F3DC;
  --ink-mid:      #74C69D;
}
```

### Tipografia
| Papel            | Fonte           | Tamanho   | Peso    |
|------------------|-----------------|-----------|---------|
| Display / Logo   | Space Grotesk   | 48–72px   | 700     |
| Headings H1–H3   | Space Grotesk   | 18–40px   | 600–700 |
| Corpo de texto   | Inter           | 14–16px   | 400–500 |
| Valores monetários | JetBrains Mono | 14–32px  | 400–700 |

### Valores monetários — regras
- Receitas: `font-[JetBrains_Mono] font-bold text-[var(--status-ok)]`
- Despesas: `font-[JetBrains_Mono] font-bold text-[var(--status-err)]`
- Símbolo R$: Inter weight 400, 70% do tamanho do valor
- Casas decimais: 65% do tamanho do inteiro
- Saldo principal no dashboard: 32–48px, máximo destaque

### Border radius padrão
| Elemento           | Radius     |
|--------------------|------------|
| Cards glass        | 20–24px    |
| Botões             | 12px       |
| Inputs             | 10px       |
| Badges / Pills     | 999px      |
| Modais             | 24px (top) |

### Sombras (elevação)
```
Nível 1 (glass sutil):  0 2px 8px rgba(45,106,79, 0.06)
Nível 2 (card glass):   0 8px 32px rgba(45,106,79, 0.10), inset 0 1px 0 rgba(255,255,255,0.8)
Nível 3 (dropdown):     0 16px 40px rgba(45,106,79, 0.14)
Nível 4 (modal):        0 32px 80px rgba(45,106,79, 0.20)
```

---

## 4. Arquitetura do Projeto

### Estrutura de pastas (Next.js App Router)
```
cash-maker/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx          ← sidebar + header
│   │   ├── page.tsx            ← dashboard principal
│   │   ├── transactions/
│   │   │   └── page.tsx
│   │   ├── categories/
│   │   │   └── page.tsx
│   │   ├── fixed-expenses/
│   │   │   └── page.tsx
│   │   └── reports/
│   │       └── page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── transactions/route.ts
│   │   ├── transactions/[id]/route.ts
│   │   ├── categories/route.ts
│   │   ├── categories/[id]/route.ts
│   │   ├── fixed-expenses/route.ts
│   │   └── dashboard/route.ts
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/                     ← componentes shadcn/ui (gerados)
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── bottom-nav.tsx      ← mobile
│   ├── dashboard/
│   │   ├── summary-card.tsx
│   │   ├── balance-chart.tsx
│   │   └── category-chart.tsx
│   ├── transactions/
│   │   ├── transaction-list.tsx
│   │   ├── transaction-form.tsx
│   │   └── transaction-row.tsx
│   └── shared/
│       ├── currency-display.tsx
│       ├── date-picker.tsx
│       └── loading-skeleton.tsx
├── lib/
│   ├── prisma.ts               ← singleton do Prisma client
│   ├── auth.ts                 ← config do NextAuth
│   ├── validations/            ← schemas Zod
│   │   ├── transaction.ts
│   │   └── category.ts
│   └── utils.ts                ← helpers (formatCurrency, formatDate etc.)
├── services/                   ← lógica de negócio
│   ├── transaction.service.ts
│   ├── category.service.ts
│   ├── dashboard.service.ts
│   └── fixed-expense.service.ts
├── repositories/               ← queries ao banco via Prisma
│   ├── transaction.repository.ts
│   ├── category.repository.ts
│   └── fixed-expense.repository.ts
├── types/
│   └── index.ts                ← tipos TypeScript globais
├── prisma/
│   └── schema.prisma
├── .env.example
├── .env.local                  ← NUNCA commitar
├── CLAUDE.md                   ← este arquivo
└── README.md
```

### Padrão de camadas (obrigatório)
```
Route Handler (app/api/) → Service (services/) → Repository (repositories/) → Prisma → PostgreSQL
```
- **Route handlers**: apenas recebem request, validam com Zod, chamam service, retornam response
- **Services**: lógica de negócio, regras, orquestração
- **Repositories**: queries ao banco, sem lógica de negócio
- **Nunca** escrever queries Prisma direto no route handler

---

## 5. Regras de Negócio (obrigatório seguir)

### RN01 — Saldo negativo
- Saldo negativo é **permitido**
- Exibir badge de alerta vermelho no dashboard
- Disparar e-mail de notificação ao usuário

### RN02 — Soft delete de transações
- **Nunca deletar** transações do banco
- Sempre usar `deletedAt: DateTime` (soft delete)
- Transações deletadas: invisíveis no dashboard e relatórios
- Visíveis apenas no histórico, marcadas com `var(--status-err)`
- Todas as queries devem filtrar `deletedAt: null` por padrão

### RN03 — Isolamento de dados
- **Toda query** deve filtrar por `userId` da sessão atual
- Nunca retornar dados de outro usuário
- Validar `userId` no service, não no route handler

### RN04 — Categorias padrão
- 7 categorias criadas automaticamente no cadastro:
  `Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Outros`
- Categorias padrão: não podem ser excluídas, apenas renomeadas
- Categoria com transações vinculadas: não pode ser excluída
- Transação sem categoria → atribuir "Outros" automaticamente

### RN05 — Gastos fixos
- Cron job executa diariamente às **00:01 America/Sao_Paulo**
- Gera transações com campo `source: "auto"` para identificação
- Gasto fixo inativo não gera novas transações
- Editar valor não altera transações já geradas

### RN06 — Datas e fuso horário
- Todas as datas salvas no banco em **UTC**
- Conversão para `America/Sao_Paulo` apenas na **exibição**
- Formato de exibição: `dd/mm/yyyy`
- Relatórios mensais: 00:00 até 23:59 de Brasília

### RN07 — Transações atômicas
- Operações que afetam múltiplas tabelas usam `prisma.$transaction()`

---

## 6. Requisitos Não Funcionais

- **Senhas**: bcrypt, salt rounds >= 12
- **Auth**: NextAuth v5, cookies HttpOnly/Secure
- **Validação**: Zod em todas as rotas de entrada
- **Performance**: API < 500ms para 95% das requests
- **Responsividade**: mobile (360px+), tablet (768px+), desktop (1024px+)
- **Acessibilidade**: contraste mínimo WCAG AA (4.5:1)
- **TypeScript**: strict mode ativado, sem `any`
- **Commits**: padrão semântico (`feat:`, `fix:`, `chore:`, `docs:`)

---

## 7. Componentes shadcn/ui utilizados

Instalar com `npx shadcn@latest add`:
- `button`, `card`, `input`, `label`, `select`
- `dialog`, `sheet`, `drawer`
- `table`, `badge`, `avatar`
- `dropdown-menu`, `popover`, `tooltip`
- `form` (integrado com React Hook Form + Zod)
- `sonner` (toasts)
- `skeleton`
- `separator`, `scroll-area`
- `calendar`, `date-picker`
- `sidebar` (layout principal)

---

## 8. MVP — escopo da primeira versão

**Incluído no MVP:**
- [ ] Autenticação (login, cadastro, logout)
- [ ] CRUD de transações (receita/despesa)
- [ ] Categorias (padrão + personalizadas)
- [ ] Saldo em tempo real
- [ ] Dashboard com summary cards e gráficos básicos
- [ ] Filtros por período e categoria
- [ ] Responsividade mobile

**Fora do MVP (não implementar agora):**
- Importação de extrato bancário
- Gastos fixos automáticos (cron)
- Alertas por e-mail
- Exportação CSV
- Relatórios avançados

---

## 9. Comandos úteis

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Prisma — aplicar migrations
npx prisma migrate dev --name nome_da_migration

# Prisma — gerar client
npx prisma generate

# Prisma — visualizar banco
npx prisma studio

# shadcn/ui — adicionar componente
npx shadcn@latest add [componente]

# Testes
npm run test
```

---

## 10. Variáveis de ambiente necessárias

```bash
DATABASE_URL=""           # PostgreSQL (Neon.tech)
NEXTAUTH_SECRET=""        # string aleatória segura
NEXTAUTH_URL=""           # http://localhost:3000 (dev) / URL prod
RESEND_API_KEY=""         # e-mail transacional (futuro)
```
