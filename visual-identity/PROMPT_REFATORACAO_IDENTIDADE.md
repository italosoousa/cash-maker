# PROMPT — REFATORAÇÃO DE IDENTIDADE VISUAL
## Cash Maker · Verde → Gray Glass

---

## CONTEXTO

Preciso que você refatore **toda a identidade visual** do Cash Maker.
A mudança é estratégica: o verde estava sendo usado em demasia e perdeu
o impacto. A nova identidade usa **cinza translúcido como base neutra**,
reservando o verde **exclusivamente** para receitas, saldo positivo e
elementos de marca.

Leia os novos documentos de contexto antes de começar:
- `CashMaker_IdentidadeVisual_v3_GrayGlass.pdf`
- `CashMaker_PRD_v2_GrayGlass.pdf`

---

## NOVA PALETA — SUBSTITUIÇÕES OBRIGATÓRIAS

### globals.css — substituir COMPLETAMENTE o bloco :root

```css
:root {
  /* === BASE NEUTRA === */
  --gray-900:  #1A1A2E;
  --gray-800:  #2D2D44;
  --gray-700:  #4A4A6A;
  --gray-500:  #8888AA;
  --gray-300:  #C8C8E0;
  --gray-200:  #E8E8F4;
  --gray-100:  #F4F4FA;
  --gray-50:   #FAFAFE;

  /* === VERDE FUNCIONAL (uso restrito) === */
  --green-brand:   #2D6A4F;  /* logo/marca apenas */
  --green-income:  #52B788;  /* receitas, positivo */
  --green-soft:    #74C69D;  /* badges receita */
  --green-frost:   #D8F3DC;  /* fundo cards receita */

  /* === STATUS === */
  --status-income:  #52B788;
  --status-expense: #E07A5F;
  --status-warn:    #F2CC8F;
  --status-info:    #7B9FC7;

  /* === GLASS NEUTRO === */
  --glass-bg:     rgba(244, 244, 250, 0.75);
  --glass-blur:   blur(20px) saturate(1.4);
  --glass-border: rgba(200, 200, 224, 0.6);
  --glass-shadow: 0 8px 32px rgba(26, 26, 46, 0.08);
}

/* Dark mode */
[data-theme="dark"] {
  --gray-50:  #0F0F1A;
  --gray-100: #1A1A2E;
  --gray-200: #2D2D44;
  --gray-900: #F4F4FA;
  --glass-bg:     rgba(26, 26, 46, 0.80);
  --glass-border: rgba(100, 100, 160, 0.3);
}

/* === CLASSES GLASS === */
.glass-card {
  background: rgba(244, 244, 250, 0.75);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  border: 1px solid rgba(200, 200, 224, 0.6);
  border-radius: 20px;
  box-shadow:
    0 8px 32px rgba(26, 26, 46, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

/* Card de receita — toque verde sutil */
.glass-card-income {
  background: rgba(216, 243, 220, 0.60);
  border: 1px solid rgba(82, 183, 136, 0.4);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(45, 106, 79, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

/* Card de despesa — toque terracota sutil */
.glass-card-expense {
  background: rgba(244, 230, 226, 0.60);
  border: 1px solid rgba(224, 122, 95, 0.4);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(224, 122, 95, 0.06),
              inset 0 1px 0 rgba(255, 255, 255, 0.9);
}
```

---

## REGRAS DE SUBSTITUIÇÃO (aplicar em TODO o código)

### Verde que deve virar cinza

| Onde estava verde | Nova cor |
|---|---|
| Sidebar background | `var(--glass-bg)` neutro |
| Header background | `var(--gray-50)` ou glass neutro |
| Item ativo da sidebar (fundo) | `var(--gray-100)` |
| Item ativo da sidebar (borda) | `var(--gray-700)` |
| Badges "Em breve" | Fundo `var(--gray-200)`, texto `var(--gray-500)` |
| Skeleton loading | Cinza `var(--gray-200)` pulsando |
| Separadores/divisores | `var(--gray-300)` |
| Fundo de inputs | `var(--gray-100)` |
| Hover de botões ghost | `var(--gray-100)` |
| Cor de ícones de navegação | `var(--gray-500)` inativo, `var(--gray-800)` ativo |
| Texto de labels/captions | `var(--gray-500)` |
| Texto de corpo | `var(--gray-700)` |
| Texto de headings | `var(--gray-900)` |
| Background da página | `var(--gray-50)` |

### Verde que deve PERMANECER verde

| Elemento | Cor verde | Motivo |
|---|---|---|
| Valor de receita | `var(--status-income)` | Dado financeiro positivo |
| Saldo positivo | `var(--status-income)` | Dado financeiro |
| Badge de receita | `var(--green-soft)` | Indicador de tipo |
| Ícone TrendingUp | `var(--status-income)` | Tendência positiva |
| Card de receita | `.glass-card-income` | Destaque do dado |
| Logo/marca | `var(--green-brand)` | Identidade da marca |
| Botão "Adicionar Receita" | `var(--status-income)` | Ação de receita |
| Progresso de meta atingida | `var(--green-soft)` | Status positivo |

---

## COMPONENTES — MUDANÇAS ESPECÍFICAS

### 1. Sidebar (`components/layout/sidebar.tsx`)

```tsx
// ANTES: verde em tudo
// DEPOIS: cinza base, verde apenas na marca

// Background da sidebar:
className="glass-card" // neutro — sem verde

// Logo:
// Manter verde profundo APENAS no logo
className="text-[var(--green-brand)]" // OK — é marca

// Item de navegação ATIVO:
className="bg-[var(--gray-100)] border-l-[3px] border-[var(--gray-700)]
           text-[var(--gray-900)]"

// Item de navegação HOVER:
className="hover:bg-[var(--gray-50)] hover:text-[var(--gray-700)]"

// Item de navegação INATIVO:
className="text-[var(--gray-500)]"

// Ícones de navegação:
// inativo: var(--gray-400)
// ativo: var(--gray-800)
// NUNCA verde nos ícones de navegação
```

### 2. Header (`components/layout/header.tsx`)

```tsx
// Background:
className="bg-[var(--gray-50)] border-b border-[var(--gray-300)]"

// Barra de busca:
className="glass-card rounded-full px-4 py-2"
// placeholder: var(--gray-500)
// ícone de busca: var(--gray-400)

// Ícone de notificação: var(--gray-500), badge vermelho para alertas
// Avatar: sem borda verde — borda var(--gray-300)
```

### 3. Summary Cards (`components/dashboard/summary-card.tsx`)

```tsx
// Card de SALDO TOTAL (neutro):
<div className="glass-card p-6">
  <span className="text-[var(--gray-500)] text-xs uppercase tracking-wider">
    Saldo Total
  </span>
  <span className={`font-mono font-bold text-4xl ${
    balance >= 0
      ? 'text-[var(--status-income)]'   // positivo: verde
      : 'text-[var(--status-expense)]'  // negativo: terracota
  }`}>
    {formatCurrency(balance)}
  </span>
</div>

// Card de RECEITAS:
<div className="glass-card-income p-6"> // verde sutil
  <span className="text-[var(--gray-600)] text-xs uppercase">Receitas</span>
  <span className="text-[var(--status-income)] font-mono font-bold text-3xl">
    {formatCurrency(income)}
  </span>
</div>

// Card de DESPESAS:
<div className="glass-card-expense p-6"> // terracota sutil
  <span className="text-[var(--gray-600)] text-xs uppercase">Despesas</span>
  <span className="text-[var(--status-expense)] font-mono font-bold text-3xl">
    {formatCurrency(expense)}
  </span>
</div>
```

### 4. Botões (`components/ui/button.tsx` — customizar variantes)

```tsx
// Botão primário PADRÃO (cinza escuro):
variant="default" → bg: var(--gray-900), hover: var(--gray-800)

// Botão de RECEITA (verde — só para adicionar receita):
variant="income" → bg: var(--status-income), hover: var(--green-brand)

// Botão SECUNDÁRIO:
variant="secondary" → border: var(--gray-300), text: var(--gray-700)

// Botão DANGER:
variant="destructive" → bg: var(--status-expense)

// Botão GHOST:
variant="ghost" → hover-bg: var(--gray-100), text: var(--gray-700)
```

### 5. Tabela de transações (`components/transactions/transaction-list.tsx`)

```tsx
// Header da tabela: var(--gray-100), texto var(--gray-500) uppercase
// Linha zebra par: var(--gray-50)
// Linha zebra ímpar: white
// Hover de linha: var(--gray-100)

// Badge tipo RECEITA:
className="bg-[var(--green-frost)] text-[var(--status-income)]
           text-xs font-medium px-2 py-0.5 rounded-full"

// Badge tipo DESPESA:
className="bg-[rgba(244,230,226,0.8)] text-[var(--status-expense)]
           text-xs font-medium px-2 py-0.5 rounded-full"

// Valor RECEITA: text-[var(--status-income)] font-mono font-bold
// Valor DESPESA: text-[var(--status-expense)] font-mono font-bold
```

### 6. Gráficos Recharts (`components/dashboard/balance-chart.tsx`)

```tsx
// Barras de RECEITA: fill="#52B788" (verde — dado positivo)
// Barras de DESPESA: fill="#E07A5F" (terracota)
// Grid lines: stroke="#C8C8E0" (cinza 300)
// Eixos (texto): fill="#8888AA" (cinza 500)
// Tooltip: glass neutro, border cinza 300
// Cursor: rgba(200, 200, 224, 0.3) — cinza translúcido
```

### 7. Formulário de transação (`components/transactions/transaction-form.tsx`)

```tsx
// Toggle RECEITA ativo:
className="bg-[var(--status-income)] text-white"
// Toggle DESPESA ativo:
className="bg-[var(--status-expense)] text-white"
// Toggle inativo:
className="bg-[var(--gray-100)] text-[var(--gray-500)]"

// Inputs: border var(--gray-300), focus: border var(--gray-500)
// Labels: text-[var(--gray-600)]
// Placeholder: text-[var(--gray-400)]
```

### 8. Bottom Navigation Mobile (`components/layout/bottom-nav.tsx`)

```tsx
// Background: glass neutro
// Ícone inativo: var(--gray-400)
// Ícone ativo: var(--gray-900)
// Texto ativo: var(--gray-900)

// Botão central "+" (adicionar):
// Manter destaque, mas usar var(--gray-900) em vez de verde
// OU: se for botão de "adicionar receita" especificamente → verde OK
```

---

## TAILWIND CONFIG — ATUALIZAR TEMA

```js
// tailwind.config.js ou tailwind.config.ts
theme: {
  extend: {
    colors: {
      gray: {
        900: 'var(--gray-900)',
        800: 'var(--gray-800)',
        700: 'var(--gray-700)',
        500: 'var(--gray-500)',
        300: 'var(--gray-300)',
        200: 'var(--gray-200)',
        100: 'var(--gray-100)',
        50:  'var(--gray-50)',
      },
      green: {
        brand:  'var(--green-brand)',
        income: 'var(--green-income)',
        soft:   'var(--green-soft)',
        frost:  'var(--green-frost)',
      },
      status: {
        income:  'var(--status-income)',
        expense: 'var(--status-expense)',
        warn:    'var(--status-warn)',
        info:    'var(--status-info)',
      }
    }
  }
}
```

---

## SEQUÊNCIA DE EXECUÇÃO

Execute nesta ordem para evitar quebras:

**1. globals.css** — substituir paleta e classes glass
**2. tailwind.config** — atualizar tokens de cor
**3. Sidebar** — maior impacto visual, testar primeiro
**4. Header** — segunda peça do layout
**5. Summary Cards** — três variantes (neutro, income, expense)
**6. Botões** — variantes atualizadas
**7. Tabela de transações** — badges e valores
**8. Gráficos** — cores das barras e tooltip
**9. Formulário de transação** — toggle e inputs
**10. Bottom navigation** — mobile
**11. Demais componentes** — varrer tudo procurando verde decorativo restante

---

## CHECKLIST DE REVISÃO FINAL

Após aplicar todas as mudanças, verifique:

- [ ] Sidebar sem nenhum verde decorativo (só marca/logo)
- [ ] Header sem verde (fundo cinza claro)
- [ ] Skeleton loading cinza (não verde)
- [ ] Badges "Em breve" em cinza
- [ ] Separadores e bordas em cinza 300
- [ ] Ícones de navegação em cinza (não verde)
- [ ] Receitas em verde (correto)
- [ ] Despesas em terracota (correto)
- [ ] Saldo positivo em verde (correto)
- [ ] Saldo negativo em terracota (correto)
- [ ] Logo mantém verde profundo (correto)
- [ ] Gráficos: barras de receita verdes, despesa terracota
- [ ] Background geral: cinza 50 (quase branco)
- [ ] Inputs e forms: bordas cinza, sem verde

---

## TESTE VISUAL FINAL

Ao terminar, abra o dashboard e faça este teste mental:
**"O verde que aparece aqui representa dinheiro entrando ou a marca?"**

Se a resposta for não → ainda tem verde decorativo para remover.
Se a resposta for sim → está correto.

O verde deve causar impacto quando aparece. Se estiver em todo lugar, não causa mais.
