# Planos gerais de desenvolvimento e backlog de issues — ProjResort

## Contexto

O repositório tem hoje só a **oferta de hotéis no backend**: auth/roles, hotéis (máquina de status + aprovação admin + audit log), unidades, gestores adicionais, tipos de quarto/quartos, amenidades, políticas e regras de aceitação (issues #30–#45, 23 models Prisma, 5 migrations, ~29 rotas, ~110 arquivos de teste, tudo com fakes — **nada rodou em MySQL real**). Não existe: nenhuma tela além do placeholder da home, disponibilidade/reserva/busca/pagamento/mídia/notificações/jobs, 31 tabelas do doc 25 (§10 `ROOM_PRICE_PERIOD` em diante), logger estruturado, health check, métricas, cobertura, e2e.

Objetivo: 4 planos (Front-end, Back-end, Banco de dados, Testes e observabilidade), quebrados em tarefas pequenas; **cada tarefa = 1 issue no GitHub** com teste associado. Como o contexto será limpo a cada tarefa, cada issue é autossuficiente: cita o que ler, o que criar/alterar, regras (RF/RN/DT), contrato de API, testes e critérios de aceite; um rodapé padrão (abaixo) é anexado a todas.

Fontes: `CLAUDE.md`, `docs/progresso.md`, `hotel-booking-github-docs/` (17 roadmap, 05 RFs, 07 RNs, 10 API, 18 UI, 25 BD, 16 testes, 24 jobs). Fases = doc 17 (11 fases); prioridade = MoSCoW do doc 17.

## Convenções do backlog

- **ID** no título: `[DB-03] ...`, `[BE-42] ...`, `[FE-15] ...`, `[QA-07] ...`. Dependências citam IDs; o executor confere com `gh issue list --state closed --search "DB-03 in:title"`.
- **Título em inglês** (convenção de código), **corpo em português**.
- **Milestones** (GitHub): `F0 Pendências`, `F2 Hotel e catálogo`, `F3 Pesquisa`, `F4 Disponibilidade`, `F5 Reserva`, `F6 Gestor e Admin`, `F7 Avaliações e favoritos`, `F8 Analytics`, `F9 Notificações`, `F10 Pagamentos`, `F11 Promoções`. (F1 já concluída; QA/observabilidade vai em F0 ou na fase do que testa.)
- **Labels:** `area:frontend|backend|database|testing|observability`, `priority:must|should|could`, `type:feat|test|chore|docs|refactor`.
- **Formato de cada tarefa** (também é o formato que o script de criação lê):
  `#### ID · Título` + linhas `Milestone/Labels/Depende`, `Ler`, `Escopo`, `Teste`, `Aceite`.
- **Rodapé padrão** (anexado a toda issue pelo script, não repetido abaixo):
  1. Ler `CLAUDE.md` e `docs/progresso.md`; ler só as linhas do mapa de docs citadas em **Ler**; declarar os RF/RN/DT aplicáveis.
  2. Conferir se as dependências estão fechadas; propor plano curto e esperar aprovação (Workflow §2 do CLAUDE.md).
  3. Reutilizar padrões existentes: Route Handler (`readJsonBody` → `parseWithSchema` → service → `jsonSuccess/jsonError`, `requireRole`, `parseRouteParams`, `getRequestContext`), fábricas `createXService({...})` + instância default, repositórios com `client` opcional e Prisma lazy (`getPrisma()`), `transactionRunner.run`, `auditLogger.recordAdminAction`, `canManageHotel/canEditHotel/canOperateHotel`, `hotelEvents.publish`, `src/utils/money.js`, `src/utils/time-of-day.js`, `src/modules/availability/date-range.js`, `src/modules/reservations/{stay-rules,cancellation-rules}.js`.
  4. Teste obrigatório: arquivo em `tests/**` espelhando `src/**`; toda query nova de repositório entra em `tests/repositories/prisma-query-shapes.test.js`; todo CHECK/tabela nova em `tests/prisma/migrations.test.js`.
  5. Regras de estilo: 4 espaços, sem comentários inline, código em inglês, mensagens de API em português, sem segredo em arquivo/log.
  6. Rodar `npm run lint`, `npm run format:check`, `npm test`, `npm run build`; atualizar doc de spec + `CLAUDE.md` + nota em `docs/progresso.md` se criar decisão/regra/tabela; branch `<type>/<nº>-<descrição>`; commit convencional; PR com `Closes #N`.

## Ordem sugerida de execução (por milestone)

| Milestone | Ordem (→ depende do anterior; itens na mesma linha podem ser paralelos) |
|---|---|
| F0 | DB-01 → QA-01, QA-03, QA-05, QA-17, QA-24 → QA-04, QA-29 → QA-18 → QA-19, QA-20 → QA-25, QA-02 → BE-01, BE-03 → BE-02 → FE-01 → FE-02 → FE-03 → FE-04, FE-05 → QA-06 |
| F2 | DB-02, DB-03, DB-04, DB-19 → BE-10 → BE-11, BE-12, BE-13, BE-14 → QA-16 → FE-10 … FE-20 (ordem numérica) e FE-30, FE-31 → QA-07 |
| F3 | DB-16 → BE-20 → BE-21 → BE-15 → BE-30 → BE-31, BE-32, BE-33, BE-34 → BE-35 → FE-40 … FE-47 → QA-27, QA-28 |
| F4 | DB-05 → BE-22 → BE-23, BE-24 → QA-09 → FE-21 |
| F5 | DB-06, DB-07, DB-18 → BE-40 → BE-43 → BE-41 → BE-42 → BE-44, BE-45, BE-46, BE-47, BE-48 → QA-10, QA-11, QA-12, QA-13, QA-14, QA-29, QA-31 → FE-48, FE-49, FE-52, FE-53 → QA-08 |
| F6 | DB-20 → BE-50 … BE-55 → FE-60, FE-61, FE-62, FE-32, FE-33, FE-34, FE-35 → QA-21, QA-26 |
| F7 | DB-10, DB-11, DB-12 → BE-60 … BE-66 (BE-56 depende de BE-64) → FE-36, FE-54, FE-55, FE-63 |
| F8 | DB-17 → BE-70, BE-71 → BE-72 (depende de BE-81) → FE-64, FE-70, FE-71 |
| F9 | DB-14, DB-15 → BE-80 → BE-81 → BE-82, BE-83, BE-84 → BE-85, BE-86, BE-87, BE-88, BE-89 → FE-38, FE-56 → QA-22, QA-23 |
| F10 | DB-08, DB-09 → BE-90 → BE-91 → BE-92 → BE-93 → BE-94 → QA-15, QA-30 → FE-50, FE-51, FE-37 |
| F11 | DB-13 → BE-100 → BE-101 → BE-102 → FE-72 |

(Pagamento no doc 17 vem na F10, mas a reserva confirma só após pagamento (RF060): na F5 a reserva termina em `PENDING_PAYMENT` com hold; FE-50 usa a confirmação real só após BE-91.)

## Índice

| Plano | Arquivo | Issues |
|---|---|---|
| 1 — Banco de dados | [01-database.md](01-database.md) | 20 (`DB-xx`) |
| 2 — Back-end | [02-backend.md](02-backend.md) | 64 (`BE-xx`) |
| 3 — Front-end | [03-frontend.md](03-frontend.md) | 51 (`FE-xx`) |
| 4 — Testes e observabilidade | [04-testing-observability.md](04-testing-observability.md) | 31 (`QA-xx`) |

Total: 166 issues. O número da issue no GitHub aparece entre parênteses no título de cada tarefa (`#### BE-22 · ... (#NN)`); o título da issue começa com o ID (`[BE-22] ...`).

## Como pedir uma issue ao Claude Code

Depois de `/clear`, use `/issue-cycle #<nº>` ou `/issue-cycle <ID>` (ex.: `/issue-cycle BE-22`). O corpo da issue já traz o que ler, o escopo, os testes e os critérios de aceite; não é preciso apontar documentação. O protocolo é idempotente (ver "Backlog e protocolo de issue" no `CLAUDE.md`): repetir o pedido retoma o trabalho em vez de refazê-lo.

## Manutenção destes planos

- Estes arquivos são o desenho original do backlog (2026-10-13). A fonte da verdade do andamento é a issue no GitHub (estado, comentários, PR) e `docs/progresso.md`.
- Ao concluir uma issue, não edite o plano: marque-a como feita em `docs/progresso.md` (seção Done). Se a execução mudar o escopo de outras issues, ajuste o corpo dessas issues no GitHub e registre a decisão em `docs/progresso.md`.
- Tabelas pendentes do doc 25 acompanhadas por `tests/prisma/doc-conformance.test.js` (QA-05) quando existir.
