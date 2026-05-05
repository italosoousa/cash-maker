# Cash Maker 💰

> **Organize. Controle. Cresça.**

Sistema web de gestão financeira pessoal com interface **Liquid Glass** — moderno, rápido e intuitivo.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-latest-336791?style=flat-square&logo=postgresql)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwindcss)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)

---

## ✨ Sobre o projeto

O **Cash Maker** nasceu da necessidade de ter controle financeiro real, sem a complexidade de sistemas bancários ou a limitação de planilhas. A proposta é simples: lançar uma transação em menos de 10 segundos e ter uma visão 360° das finanças na primeira tela.

### O que diferencia o Cash Maker

- **Estética Liquid Glass** — interface translúcida inspirada no design language da Apple (visionOS/iOS)
- **Controle sem fricção** — fluxos diretos, sem menus profundos ou jargão contábil
- **Dashboard inteligente** — visão completa com gráficos, filtros e insights em tempo real

---

## 🚀 Funcionalidades

### MVP (versão atual)
- [x] Autenticação segura (login, cadastro, logout)
- [x] CRUD de transações (receitas e despesas)
- [x] Categorias personalizáveis
- [x] Saldo em tempo real
- [x] Dashboard com summary cards e gráficos
- [x] Filtros por período e categoria
- [x] Interface responsiva (mobile, tablet, desktop)

### Próximas versões
- [ ] Gastos fixos automáticos com detecção de recorrência
- [ ] Importação de extrato bancário (OFX, CSV, PDF)
- [ ] Alertas por e-mail (saldo negativo, gastos elevados)
- [ ] Exportação de relatórios em CSV
- [ ] Dark mode completo

---

## 🛠️ Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Linguagem | TypeScript (strict) |
| Estilo | Tailwind CSS v4 + shadcn/ui |
| Gráficos | Recharts |
| ORM | Prisma |
| Banco de dados | PostgreSQL (Neon.tech) |
| Autenticação | NextAuth.js v5 |
| Validação | Zod |
| Deploy | Vercel |

---

## ⚙️ Como rodar localmente

### Pré-requisitos
- Node.js 20+
- npm ou yarn
- Conta no [Neon.tech](https://neon.tech) (banco de dados gratuito)

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/cash-maker.git
cd cash-maker
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais:
```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="sua-chave-secreta"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Configure o banco de dados
```bash
# Aplicar as migrations
npx prisma migrate dev

# (Opcional) Popular com dados de exemplo
npx prisma db seed
```

### 5. Inicie o servidor de desenvolvimento
```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## 📁 Estrutura do projeto

```
cash-maker/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Rotas de autenticação
│   ├── (dashboard)/        # Rotas protegidas
│   └── api/                # API Routes
├── components/
│   ├── ui/                 # Componentes shadcn/ui
│   ├── layout/             # Sidebar, Header, BottomNav
│   ├── dashboard/          # Cards, gráficos
│   └── transactions/       # Lista, formulário
├── services/               # Lógica de negócio
├── repositories/           # Queries ao banco
├── lib/                    # Prisma client, auth, utils
├── types/                  # Tipos TypeScript
└── prisma/
    └── schema.prisma       # Modelo do banco
```

---

## 🎨 Design System

O Cash Maker usa a estética **Liquid Glass** com paleta verde suave:

| Token | Cor | Uso |
|---|---|---|
| `--green-deep` | `#2D6A4F` | Logo, headings, CTAs |
| `--green-mid` | `#52B788` | Elementos ativos, bordas |
| `--green-soft` | `#74C69D` | Ícones, badges |
| `--green-frost` | `#D8F3DC` | Fundos de cards |
| `--status-err` | `#E07A5F` | Despesas, alertas |

Fontes: **Space Grotesk** (títulos) · **Inter** (corpo) · **JetBrains Mono** (valores)

---

## 📜 Licença

MIT © [Seu Nome] — veja o arquivo [LICENSE](LICENSE) para detalhes.

---

<p align="center">
  Feito com 💚 · <strong>Cash Maker</strong> · Organize. Controle. Cresça.
</p>
