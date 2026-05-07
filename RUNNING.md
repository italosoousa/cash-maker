# Como rodar o Cash Maker

Guia rápido para subir o ambiente de desenvolvimento.

---

## Pré-requisitos

- **Node.js** 20+
- **pnpm** 11+ → `npm install -g pnpm`
- **Docker Desktop** instalado e rodando

---

## 1. Instalar dependências

```bash
pnpm install
```

---

## 2. Variáveis de ambiente

Copie o arquivo de exemplo para dois destinos (ambos são necessários):

```bash
cp env.example .env.local   # lido pelo Next.js
cp env.example .env         # lido pelo Prisma CLI
```

> O `.env.local` já vem configurado para o banco Docker local.
> Nunca comite nenhum dos dois arquivos.

---

## 3. Banco de dados (Docker)

```bash
# Subir o PostgreSQL
docker compose up -d

# Verificar se está rodando
docker compose ps
```

O banco sobe em `localhost:5432` com as credenciais do `env.example`.

---

## 4. Migrations do banco

```bash
# Aplicar todas as migrations e gerar o Prisma Client
npx prisma migrate dev

# Regenerar o client depois de mudar o schema (sem criar migration)
npx prisma generate

# Abrir o Prisma Studio (GUI do banco)
npx prisma studio
```

---

## 5. Rodar o frontend

```bash
pnpm dev
```

Acesse em: [http://localhost:3000](http://localhost:3000)

---

## 6. Seeds (dados de teste)

```bash
# Criar usuários fake (necessário antes dos seeds de transações)
pnpm seed:users

# Gerar ~450 transações por usuário (últimos 12 meses)
pnpm seed:transactions

# Apagar todas as transações e regerar do zero
pnpm seed:transactions:clear

# Rodar usuários + transações de uma vez
pnpm seed:all
```

**Credenciais criadas pelo seed:**

| E-mail | Senha |
|--------|-------|
| `italo@cashmaker.dev` | `Teste123` |
| `ana@cashmaker.dev` | `Teste123` |
| `bruno@cashmaker.dev` | `Teste123` |

> Você também pode criar sua própria conta em `/register`.

---

## 7. Build de produção

```bash
pnpm build    # gera o build otimizado
pnpm start    # sobe o servidor de produção
```

---

## 8. Outros comandos úteis

```bash
pnpm lint               # verificar erros de lint
pnpm test               # rodar testes (Jest)

docker compose down     # parar o banco
docker compose down -v  # parar e apagar os dados do banco
```

---

## Resumo do fluxo completo (primeira vez)

```bash
pnpm install
cp env.example .env.local && cp env.example .env
docker compose up -d
npx prisma migrate dev
pnpm seed:all
pnpm dev
```
