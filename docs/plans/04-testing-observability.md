# Plano 4 — Testes e observabilidade

Regras comuns: prioridade de testes do doc 16 (disponibilidade, reserva, concorrência, hold, preço, cancelamento, alteração, overbooking, pagamentos, reembolsos, autenticação, autorização); testes unitários com fakes continuam em `tests/**` (Vitest); testes de integração usam MySQL/Redis reais e ficam em `tests/integration/**` (rodam com `npm run test:integration`, fora do `npm test` padrão para o CI rápido continuar rápido até QA-25); e2e em `e2e/**` (Playwright). Observabilidade nunca registra segredo, senha, token, CPF completo nem corpo de cartão; o stack trace nunca vai ao cliente (RNF024). O doc 16 não define limiares de cobertura nem seção de observabilidade: as decisões tomadas aqui devem ser registradas em `16-testing-quality.md` (workflow §6).

## QA-A · Infraestrutura de testes

#### QA-01 · Component test setup (jsdom + Testing Library) (#183)
- Milestone: F0 · Labels: area:testing, priority:must, type:chore · Depende: —
- Ler: `vitest.config.js`, `package.json`, doc 16.
- Escopo: devDependencies `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`; em `vitest.config.js` usar `projects`/ambiente por glob para `tests/components/**` e `tests/hooks/**` em `jsdom` (sem comentários inline nos arquivos); `tests/helpers/render.jsx` e `tests/setup/dom.js` (matchers, `cleanup`); `eslint.config.js` aceita JSX nos testes; **manter** `inline: ['next-auth']`.
- Teste: `tests/components/smoke.test.jsx` renderizando um componente trivial + interação com `userEvent`.
- Aceite: `npm test` roda node e jsdom juntos, CI passa.

#### QA-02 · Coverage configuration and CI report (#184)
- Milestone: F0 · Labels: area:testing, priority:should, type:chore · Depende: QA-01
- Ler: doc 16 (DoD), `.github/workflows/ci.yml`.
- Escopo: `@vitest/coverage-v8`; `npm run test:coverage`; incluir `src/**` e excluir `src/generated`, `src/domain`, `src/app/**/page|layout` triviais; relatório texto + `lcov` como artefato do CI; limiares iniciais **medidos** (baseline atual − margem pequena) e só crescentes, mais limiar maior em `src/modules/{availability,reservations,pricing}`; registrar a decisão no doc 16 e em `docs/progresso.md`. **Não** renomear o job `ci`.
- Teste: o próprio `test:coverage` passa; um teste de arquitetura confere que os limiares existem no config.
- Aceite: queda de cobertura abaixo do limiar derruba o CI.

#### QA-03 · Integration test infrastructure on real MySQL and Redis (#185)
- Milestone: F0 · Labels: area:testing, priority:must, type:chore · Depende: DB-01
- Ler: `docker-compose.yml`, `prisma.config.mjs`, `src/lib/prisma.js`, `src/lib/redis.js`, `src/lib/transaction.js`.
- Escopo: `vitest.integration.config.js` + `npm run test:integration`; banco de teste separado (`DATABASE_URL` de teste vindo de `.env.test`, **nunca** o de desenvolvimento; abortar se o nome do banco não terminar em `_test`); `tests/integration/helpers/` com `resetDatabase()` (truncate em ordem de FK ou recriação via `migrate deploy`), `seedBaseData()` e `flushRedis()` (prefixo de teste); `globalSetup` aplica migrations uma vez. Sem segredos em arquivo versionado (`.env.test.example`).
- Teste: `tests/integration/smoke.test.js` (conecta, migrations aplicadas, seed base, `resetDatabase` isola).
- Aceite: rodando duas vezes seguidas dá o mesmo resultado.

#### QA-04 · Integration tests for the existing hotel supply flows (#186)
- Milestone: F0 · Labels: area:testing, priority:must, type:test · Depende: QA-03
- Ler: `docs/progresso.md` (itens nunca rodados em MySQL), `tests/app/api/**`.
- Escopo: contra MySQL real, via services/repositórios reais: register/login (hash real), criar hotel→submit→approve (audit na mesma transação, rollback se o audit falhar), unidades (endereço 1:1, telefones), gestores adicionais, tipos/quartos (CHECKs, `P2002` ⇒ `ROOM_NUMBER_ALREADY_EXISTS`, histórico de preço/tipo, `outcome` do delete), amenidades/políticas/aceites (PK composta), `AUDIT_LOG` append-only.
- Teste: os próprios arquivos em `tests/integration/{auth,hotels,units,rooms,amenities}.test.js`.
- Aceite: marca como resolvidos os 6 itens "nunca rodou em MySQL" de `docs/progresso.md`.

#### QA-05 · Schema ↔ doc 25 conformance test (#187)
- Milestone: F0 · Labels: area:testing, priority:should, type:test · Depende: —
- Ler: doc 25 (lista de tabelas §3–§26), `tests/helpers/prisma-schema.js`.
- Escopo: `tests/prisma/doc-conformance.test.js` com a lista esperada de tabelas por seção e as que **ainda não existem** (31 pendentes, derrubar da lista de pendentes conforme as DB-xx entram); confere convenções (CHAR(36) id, snake_case singular, FKs `Restrict`, nenhum `float`/`double` em colunas monetárias).
- Teste: o próprio arquivo.
- Aceite: falha se alguém adicionar `Float` para dinheiro ou tabela fora da convenção.

#### QA-29 · Test data factories and builders (#188)
- Milestone: F0 · Labels: area:testing, priority:should, type:chore · Depende: QA-03
- Ler: `tests/helpers/*`, `tests/services/*` (fakes existentes).
- Escopo: `tests/helpers/factories/` (`buildUser`, `buildHotel`, `buildUnit`, `buildRoom`, `buildReservation`…) com valores válidos por padrão e override; versão que persiste no banco para integração; relógio injetável (`createFakeClock`) para hold/cancelamento/expiração.
- Teste: cada factory produz objeto válido segundo o schema Zod correspondente.
- Aceite: os testes novos de BE-4x usam as factories.

## QA-B · Suítes críticas (doc 16)

#### QA-09 · Availability conflict test suite (removes `passWithNoTests`) (#189)
- Milestone: F4 · Labels: area:testing, priority:must, type:test · Depende: BE-22
- Ler: doc 16 (casos de disponibilidade), 11, 07 RN018-022/037/072.
- Escopo: suíte completa em `tests/modules/availability/` + integração real em `tests/integration/availability.test.js`: livre, reservado, manutenção, bloqueio de quarto, bloqueio de unidade, datas encostando (permitido), sobreposição parcial/total/contida, hold ativo, quarto inativo; **remover `passWithNoTests`** de `vitest.config.js` (pendência registrada em `docs/progresso.md`).
- Teste: a própria suíte.
- Aceite: `npm test` falha se não houver testes.

#### QA-10 · Reservation concurrency tests (real DB + Redis) (#190)
- Milestone: F5 · Labels: area:testing, priority:must, type:test · Depende: BE-42, QA-03
- Ler: doc 16 (concorrência), 11, RNF017.
- Escopo: `tests/integration/reservation-concurrency.test.js`: N requisições simultâneas pelo mesmo quarto/noites (`Promise.all`) ⇒ exatamente 1 reserva, as demais `ROOM_NOT_AVAILABLE`; mesmo para vários quartos com interseção parcial; duas reservas em datas encostando coexistem; repetir o teste 20× para flakiness.
- Teste: a própria suíte.
- Aceite: invariante "nenhum quarto com duas reservas conflitantes" verificada por query direta no fim.

#### QA-11 · Hold tests (#191)
- Milestone: F5 · Labels: area:testing, priority:must, type:test · Depende: BE-41, QA-29
- Ler: doc 16 (hold), 11.
- Escopo: hold criado, expira aos 15 min (relógio falso), pagamento recusado **não** reinicia o prazo, dois usuários disputando, hold parcial desfeito, liberação explícita, expiração + `reservation.expiration` (se BE-85 existir).
- Teste: a própria suíte (unit + integração Redis real).
- Aceite: sem lock órfão ao final de cada caso.

#### QA-12 · Pricing test matrix (#192)
- Milestone: F5 · Labels: area:testing, priority:must, type:test · Depende: BE-40
- Ler: doc 12, 07 RN023-028/111, DT020.
- Escopo: tabela de casos em `tests/modules/pricing/`: prioridade período>quarto>tipo, período parcial, arredondamento para baixo em todo derivado (ex.: R$ 33,333… ⇒ 33,33), comissão e taxa 10%, soma dos itens = total, vários quartos/tipos, valores com 3 casas rejeitados na entrada; propriedade: total da reserva sempre = soma dos itens.
- Teste: a própria suíte.
- Aceite: nenhum `Number`/float nas funções de preço (verificado por QA-17).

#### QA-13 · Cancellation and change matrix (#193)
- Milestone: F5 · Labels: area:testing, priority:must, type:test · Depende: BE-45, BE-46
- Ler: doc 16, 07 RN039-045/077-078/112.
- Escopo: fronteiras 24 h 00 min ±1 min (cliente), 48 h (gestor), cancelamento parcial por quarto, cancelamento total, mudança com 24 h, mudança que conflita; fuso/`America/Sao_Paulo` explícito nas datas; integração real do rollback.
- Teste: a própria suíte.
- Aceite: fronteiras exatas cobertas.

#### QA-14 · Overbooking tests (#194)
- Milestone: F5 · Labels: area:testing, priority:should, type:test · Depende: BE-47
- Ler: doc 07 RN046-051, 19 DT006.
- Escopo: 0%/10%/limite±1, alerta único ao atingir, **DT006**: jamais dois hóspedes confirmados no mesmo quarto físico; teto > 10 rejeitado.
- Teste: a própria suíte + integração.
- Aceite: DT006 verificada por query.

#### QA-15 · Payments, webhook and refund tests (#195)
- Milestone: F10 · Labels: area:testing, priority:must, type:test · Depende: BE-91, BE-94
- Ler: doc 16 (pagamentos), 12, 15.
- Escopo: sucesso, falha, webhook duplicado (idempotência), assinatura inválida, eventos fora de ordem, pagamento após expiração ⇒ reembolso automático, reembolso parcial e total, falha de reembolso ⇒ retry/DLQ, soma de reembolsos ≤ pago; Stripe sempre por gateway fake com fixtures de payload reais de teste.
- Teste: a própria suíte.
- Aceite: nenhuma chamada real ao Stripe nos testes.

#### QA-16 · Authorization matrix test (#196)
- Milestone: F2 · Labels: area:testing, priority:must, type:test · Depende: —
- Ler: doc 15 (autorização), doc 16 (autenticação/autorização), `src/app/api/**`.
- Escopo: teste de arquitetura que **enumera todas as rotas** de `src/app/api/**/route.js` e exige, para cada uma, uma entrada numa tabela declarativa (`tests/architecture/route-access.table.js`: método, papéis permitidos ou `public`); para cada rota protegida, requisição sem sessão ⇒ 401, papel errado ⇒ 403/404 conforme regra; rota nova sem entrada na tabela falha o teste.
- Teste: o próprio arquivo.
- Aceite: impossível criar rota sem declarar o acesso.

#### QA-17 · Architecture guard tests (#197)
- Milestone: F0 · Labels: area:testing, priority:should, type:test · Depende: —
- Ler: CLAUDE.md (Architecture, Conventions), `tests/architecture/audit-log-append-only.test.js`.
- Escopo: testes que leem `src/**` e falham se: (1) `new PrismaClient` fora de `src/lib/prisma.js`; (2) `$transaction` fora de `src/lib/transaction.js` (e seed); (3) Route Handler importa repositório; (4) uso de `parseFloat/Number()/toFixed` em módulos de dinheiro (`pricing`, `payments`, `money`); (5) `console.*` fora do logger (após QA-18); (6) `process.env` lido fora de `src/config`/`src/lib` (permitir lista); (7) comentários inline `//` em `src/` (DT012, com allowlist de `src/domain` legado).
- Teste: o próprio arquivo (cada regra com um caso positivo e negativo em fixtures em memória).
- Aceite: regras de arquitetura do CLAUDE.md viram testes.

#### QA-30 · Security regression tests (#198)
- Milestone: F10 · Labels: area:testing, priority:should, type:test · Depende: BE-10, BE-91, BE-01
- Ler: doc 15.
- Escopo: resposta de erro nunca contém stack/segredo/`passwordHash` (varrer envelopes); upload com MIME/extensão/tamanho inválidos; webhook com assinatura inválida; rate limit de login/geocoding; IDOR (recurso de outro usuário ⇒ 404); injeção em filtros de busca (parâmetros Prisma).
- Teste: a própria suíte.
- Aceite: um teste por classe de risco.

## QA-C · E2E e acessibilidade

#### QA-06 · Playwright setup and CI job (#199)
- Milestone: F0 · Labels: area:testing, priority:should, type:chore · Depende: QA-03, FE-03
- Ler: `.github/workflows/ci.yml`, `package.json`.
- Escopo: `@playwright/test` (devDependency), `playwright.config.js` (chromium, `webServer` = `npm run build && npm start` contra banco de teste + seed), `e2e/` com helper de login por papel; job **separado** `e2e` no workflow (não mexe no job `ci` obrigatório); artefatos (trace/screenshot) em falha; sem segredos no repo (usuários de teste vindos do seed de teste).
- Teste: `e2e/smoke.spec.js` (home carrega, login falho mostra erro).
- Aceite: job `e2e` verde no PR.

#### QA-07 · E2E: manager registers a hotel and admin approves (#200)
- Milestone: F2 · Labels: area:testing, priority:should, type:test · Depende: QA-06, FE-11, FE-31, FE-17
- Ler: doc 16, 18.
- Escopo: gestor cria hotel, unidade, tipo, quarto, envia para análise; admin aprova com motivo; hotel aparece publicado; log de auditoria registrado.
- Teste: `e2e/hotel-approval.spec.js`.
- Aceite: roda sem dados prévios além do seed de teste.

#### QA-08 · E2E: customer searches and reserves (#201)
- Milestone: F5 · Labels: area:testing, priority:should, type:test · Depende: QA-06, FE-48, FE-52
- Ler: doc 16, 18.
- Escopo: busca → hotel → quarto → checkout com hóspedes → hold ativo → reserva `PENDING_PAYMENT` em "Minhas reservas"; (com F10) pagamento Stripe em modo teste e confirmação; cancelamento com reembolso exibido.
- Teste: `e2e/reservation-flow.spec.js`.
- Aceite: dois contextos de navegador disputando o mesmo quarto ⇒ só um segue.

#### QA-27 · Accessibility checks (#202)
- Milestone: F3 · Labels: area:testing, priority:could, type:test · Depende: QA-06, FE-41
- Ler: RNF001/002.
- Escopo: `@axe-core/playwright` nas telas públicas principais (home, busca, hotel, login) falhando em violações sérias/críticas; lista de exceções documentada.
- Teste: `e2e/a11y.spec.js`.
- Aceite: nenhuma violação crítica.

## QA-D · Observabilidade

#### QA-18 · Structured logger with redaction (#203)
- Milestone: F0 · Labels: area:observability, priority:must, type:feat · Depende: —
- Ler: doc 15 (INTERNAL_ERROR e logs), `src/lib/route-response.js`, `src/lib/redis.js`, `src/modules/audit/audit-logger.js`, `src/services/hotel-service.js` (usos atuais de `console.*`).
- Escopo: `src/lib/logger.js` (fábrica injetável; sugerir `pino` — justificar a dependência no PR); JSON em produção, legível em dev; níveis por `LOG_LEVEL`; **redação** de `password`, `passwordHash`, `token`, `authorization`, `cookie`, `secret`, `cpf` (mascarado), `stripe*`; função `serializeError` (nome, código, mensagem; stack só em dev e nunca no envelope); substituir os `console.*`; `route-response.js` registra o erro inesperado com `requestId`.
- Teste: `tests/lib/logger.test.js` (redação em objetos aninhados, `serializeError` sem stack em produção, nível filtra).
- Aceite: nenhum `console.*` restante em `src/` (regra de QA-17).

#### QA-19 · Request id propagation and request logging (#204)
- Milestone: F0 · Labels: area:observability, priority:must, type:feat · Depende: QA-18
- Ler: `src/lib/request-context.js` (`x-request-id`), `middleware`/`proxy` do Next 16, doc 15.
- Escopo: gerar `x-request-id` quando ausente (UUID) e devolver no header da resposta; `AsyncLocalStorage` para o logger anexar `requestId`/`userId`/rota; log de uma linha por requisição (método, rota normalizada, status, duração) sem query string com dado pessoal; o `requestId` entra no `AUDIT_LOG` (já existe) e no `correlationId` dos jobs (BE-80).
- Teste: `tests/lib/request-logging.test.js` (id gerado/propagado, rota sem ids dinâmicos nos rótulos, sem corpo/headers sensíveis).
- Aceite: toda resposta tem `x-request-id`.

#### QA-20 · Health and readiness endpoints (#205)
- Milestone: F0 · Labels: area:observability, priority:must, type:feat · Depende: DB-01
- Ler: `src/lib/prisma.js`, `src/lib/redis.js`, `docker-compose.yml`.
- Escopo: `GET /api/health` (liveness, sem dependências, 200) e `GET /api/health/ready` (checa MySQL `SELECT 1`, Redis `PING`, RabbitMQ quando BE-80 existir; timeout curto por checagem; 503 com lista de componentes `up/down`, **sem** detalhes de conexão); fora do envelope? seguir doc 10 (registrar a escolha); sem cache; público; adicionar à tabela de QA-16 como `public`.
- Teste: `tests/app/api/health.test.js` (tudo ok, MySQL fora ⇒ 503, Redis fora ⇒ 503, resposta sem URL/credencial).
- Aceite: usável como healthcheck do container e do deploy.

#### QA-21 · Error reporting hook (optional provider) (#206)
- Milestone: F6 · Labels: area:observability, priority:could, type:feat · Depende: QA-18
- Ler: `src/lib/route-response.js`, doc 15.
- Escopo: interface `errorReporter.capture(error, context)` (no-op por padrão; provedor, p.ex. Sentry, ligado só por env e **com filtro de PII/segredos**); chamado para `INTERNAL_ERROR` e falhas de worker; consultar o usuário antes de adicionar provedor/dependência.
- Teste: reporter chamado só em erros inesperados (não em `ValidationError`/404), contexto sem dados sensíveis.
- Aceite: desligado por padrão.

#### QA-22 · Application metrics endpoint (#207)
- Milestone: F9 · Labels: area:observability, priority:could, type:feat · Depende: QA-19
- Ler: doc 24 (jobs), 11.
- Escopo: `prom-client`; `GET /api/metrics` **protegido** (token de operação em env ou `requireRole([ADMIN])`, nunca público): requisições por rota/status e latência, holds criados/expirados, reservas criadas/confirmadas/canceladas, conflitos de disponibilidade, jobs por resultado (QA-23), pagamentos por status; rótulos de baixa cardinalidade (rota normalizada, sem ids).
- Teste: endpoint exige credencial, métricas incrementam em eventos simulados, rótulos sem ids.
- Aceite: nenhum dado pessoal em métricas.

#### QA-23 · Job and DLQ observability (#208)
- Milestone: F9 · Labels: area:observability, priority:could, type:feat · Depende: BE-81, QA-22
- Ler: doc 24, 25 §22.
- Escopo: logs estruturados no worker com `jobId`/`correlationId`/`attempt`; métricas (processados, falhos, retries, tamanho da DLQ); alerta em log `level=error` quando a DLQ recebe mensagem; consulta/relatório simples (`npm run jobs:report`) a partir de `JOB_EXECUTION`.
- Teste: worker emite log/métrica por transição (sucesso, retry, DLQ).
- Aceite: DLQ crescendo é visível sem abrir o RabbitMQ.

## QA-E · CI, segurança e entrega

#### QA-25 · CI: integration job with MySQL and Redis services (#209)
- Milestone: F0 · Labels: area:testing, priority:must, type:chore · Depende: QA-03, QA-04
- Ler: `.github/workflows/ci.yml`, CLAUDE.md (Git: job `ci` é check obrigatório; nunca pular por `paths`).
- Escopo: novo job `integration` (services `mysql:8.4` e `redis:7` com healthcheck) rodando `prisma migrate deploy` + `npm run test:integration`; **não** alterar nome/condições do job `ci`; se o `integration` deve virar check obrigatório, avisar o usuário para atualizar o ruleset `Protect Main` (não alterar sozinho).
- Teste: o próprio pipeline; falha proposital local confirma que o job reprova.
- Aceite: PR executa `ci` e `integration`.

#### QA-24 · CI: dependency audit and secret scanning (#210)
- Milestone: F0 · Labels: area:testing, priority:should, type:chore · Depende: —
- Ler: doc 15, `.github/workflows/ci.yml`.
- Escopo: `npm audit --omit=dev --audit-level=high` e varredura de segredos (gitleaks ou equivalente via action fixada por versão) num job separado; dependabot para npm e actions (`.github/dependabot.yml`); `.env*` já ignorados — teste que garante `.gitignore` cobrindo `.env`, `.env.test`.
- Teste: `tests/architecture/gitignore-secrets.test.js`.
- Aceite: nenhum segredo no histórico detectado (reportar sem imprimir valores).

#### QA-26 · Dockerfile and production environment notes (#211)
- Milestone: F6 · Labels: area:observability, priority:could, type:chore · Depende: QA-20
- Ler: RNF025, doc 04, `next.config.*`.
- Escopo: `Dockerfile` multi-stage (Node 22, `next build`, usuário não-root, `HEALTHCHECK` em `/api/health`), `.dockerignore`, doc `docs/deploy.md` com variáveis obrigatórias (nomes apenas, sem valores), ordem `migrate deploy` → start, worker como processo separado; sem credenciais na imagem.
- Teste: `docker build` no CI (job opcional) ou teste que valida `.dockerignore` contendo `.env*`.
- Aceite: imagem sobe com env injetado em runtime.

#### QA-28 · Security headers and CSP (#212)
- Milestone: F3 · Labels: area:observability, priority:should, type:feat · Depende: FE-15
- Ler: doc 15, `next.config.*`.
- Escopo: headers em `next.config` (CSP com `img-src`/`connect-src` para Cloudinary, OSM tiles, Stripe; `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`/`X-Frame-Options`, HSTS em produção); CSP em modo `Report-Only` primeiro e documentado.
- Teste: `tests/config/security-headers.test.js` (headers presentes, origens permitidas = lista esperada, sem `unsafe-eval` em produção).
- Aceite: mapa, uploads e Stripe continuam funcionando (verificado em e2e).

#### QA-31 · Search and availability load test (#213)
- Milestone: F5 · Labels: area:testing, priority:could, type:test · Depende: BE-30, BE-22, DB-19
- Ler: doc 06 (RNFs de desempenho, se houver), 11.
- Escopo: script `k6`/`autocannon` em `scripts/load/` para `GET /api/search` e `/api/availability` com o seed demo; orçamentos (p95) **propostos ao usuário** antes de virar limiar; registrar baseline em `docs/progresso.md`.
- Teste: o próprio script roda localmente e emite relatório.
- Aceite: baseline documentado; não roda no CI obrigatório.
