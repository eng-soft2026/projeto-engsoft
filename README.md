# Plataforma de Reservas de Hotéis

Projeto da disciplina de Engenharia de Software (UNIFESP).

Plataforma web de reservas de hotéis no Brasil, com três perfis de usuário: cliente, gestor de hotel e administrador da plataforma. O sistema tem regras de negócio próprias (cadastro e aprovação de hotéis, política de cancelamento, overbooking controlado por unidade, conflito de datas) e é desenvolvido de forma incremental, com testes automatizados e revisão de código por Pull Request.

## Status

Em desenvolvimento. Já implementado no backend:

- Autenticação e perfis (cliente, gestor e admin)
- Cadastro e aprovação de hotéis, com log de auditoria
- Unidades do hotel, com endereço, telefones e limite de overbooking
- Gestores adicionais, tipos de quarto e quartos físicos
- Comodidades, políticas do hotel e regras de aceitação
- Regras de datas, conflito de reservas e cancelamento (funções puras com testes)

Ainda não implementado: busca, reserva completa, pagamento e telas do frontend.

## Tecnologias

- Next.js 16, React 19 e Tailwind CSS 4
- Auth.js (autenticação) e Zod (validação)
- Prisma 7 com MySQL 8.4
- Redis 7
- Vitest e Testing Library (testes)
- ESLint e Prettier
- GitHub Actions (CI)

## Como executar

Pré-requisitos: Node.js (versão LTS) e Docker.

1. Instale as dependências:

```bash
npm install
```

2. Copie o arquivo de ambiente e preencha `AUTH_SECRET` e as variáveis `ADMIN_*` (nome, e-mail, CPF válido e senha do administrador):

```bash
cp .env.example .env
```

No PowerShell, use `Copy-Item .env.example .env`. Para gerar um `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

3. Suba o MySQL e o Redis:

```bash
npm run db:up
```

4. Aplique as migrações e o seed (tipos de aceitação, configurações padrão e usuário admin):

```bash
npm run prisma:migrate:deploy
npm run db:seed
```

5. Inicie o servidor de desenvolvimento e acesse http://localhost:3000:

```bash
npm run dev
```

Para parar o banco e o Redis: `npm run db:down`.

## Testes e qualidade

```bash
npm test                  # testes unitários e de componentes, sem banco
npm run test:integration  # testes com MySQL e Redis reais (veja abaixo)
npm run lint
npm run format:check
npm run build
```

Os testes de integração usam o banco `hotel_booking_test`, que o Docker Compose não cria. Com o MySQL no ar (`npm run db:up`), crie o banco uma vez:

```bash
docker compose exec mysql mysql -uroot -proot -e "CREATE DATABASE IF NOT EXISTS hotel_booking_test"
```

Depois copie `.env.test.example` para `.env.test` e rode `npm run test:integration`. O CI roda esses testes automaticamente.

O CI roda lint, formato, testes e build a cada Pull Request, e a `main` só aceita merge com o CI verde e uma aprovação de outro membro.

## Arquitetura

O fluxo de uma requisição é: Route Handler, validação (Zod), Service, Repository, Prisma. As regras de negócio ficam nos services e nos módulos de `src/modules/`, isoladas de banco e HTTP para serem testadas sem infraestrutura.

```
src/
├── app/            rotas (App Router) e Route Handlers
├── services/       regras de negócio e orquestração
├── repositories/   acesso ao banco (Prisma)
├── schemas/        validação com Zod
├── modules/        regras puras e módulos de domínio
├── lib/            utilitários (erros, logger, Prisma, Redis)
└── constants/      constantes compartilhadas
tests/              testes automatizados
prisma/             schema, migrações e seeds
```

## Documentação

- `hotel-booking-github-docs/`: especificação completa (requisitos, regras de negócio, API, modelo de dados, decisões técnicas)
- `docs/plans/`: backlog dividido em tarefas por área (banco, backend, frontend, testes)
- `docs/progresso.md`: status e decisões do projeto
- `CLAUDE.md`: convenções de código, Git e fluxo de trabalho

## Fluxo de trabalho

- Toda tarefa é uma issue do GitHub
- Uma branch por issue, no formato `<tipo>/<número>-<descrição>`
- Commits no padrão Conventional Commits, referenciando a issue
- Mudanças entram na `main` por Pull Request com review

## Equipe

- Graziele Sales
- Isabela Montandon
- Vinícius Gonçalves
