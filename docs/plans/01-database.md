# Plano 1 — Banco de dados (Prisma / MySQL / Redis / seeds)

Regras comuns a toda tarefa de schema (valem para DB-02…DB-20): ler doc 25 na seção citada e o `prisma/schema.prisma` atual; models PascalCase/campos camelCase mapeados para tabelas/colunas snake_case singulares; ids `CHAR(36)` UUID; FKs `onDelete: Restrict`; 4 espaços no schema, **não rodar `prisma format`**; CHECKs escritos à mão no fim do `migration.sql`; migration nova (nunca editar migration já em `main`); sem Docker, gerar com `npx prisma migrate diff --from-schema <schema da main> --to-schema prisma/schema.prisma --script --output prisma/migrations/<timestamp>_<name>/migration.sql` e rodar `npm run prisma:generate`. Teste padrão: `tests/prisma/migrations.test.js` (tabelas, colunas, CHECKs, FKs, índices lidos do `migration.sql`/schema via `tests/helpers/prisma-schema.js`). Regras cruzadas entre tabelas vão no service (MySQL não tem índice parcial).

#### DB-01 · Run migrations and seed against a real MySQL and close the "never ran on MySQL" gap (#48)
- Milestone: F0 · Labels: area:database, priority:must, type:chore · Depende: —
- Ler: `docs/progresso.md` (lista "nunca rodou em MySQL"), `docker-compose.yml`, `.env.example`, `prisma/migrations/*`, `prisma/seeds/*`.
- Escopo: `cp .env.example .env`, `npm run db:up`, `npm run prisma:migrate:deploy`, `npm run db:seed` (duas vezes: idempotência). Corrigir qualquer erro de SQL/CHECK/seed encontrado (via **nova** migration se já estiver em `main`). Subir `npm run dev` e exercitar à mão: register → login → criar hotel → unidade → tipo → quarto → amenidade → política → aceite → submit-review → approve (admin do seed). Registrar em `docs/progresso.md` o resultado e marcar os itens "nunca rodou em MySQL" como resolvidos. Nunca imprimir `.env`/segredos.
- Teste: script `scripts/smoke-api.mjs` (fetch no envelope da API) que executa o fluxo acima contra `http://localhost:3000` e sai com código ≠ 0 em falha; documentado em `docs/progresso.md`. (Reaproveitado depois por QA-04.)
- Aceite: migrations aplicam do zero; seed roda 2× sem erro nem duplicata; smoke passa.

#### DB-02 · Seed the global amenity catalog (#49)
- Milestone: F2 · Labels: area:database, priority:must, type:feat · Depende: DB-01
- Ler: doc 25 §11; doc 07 RN (amenidades); `src/constants/amenity.js`, `prisma/seeds/seed-database.js`.
- Escopo: `prisma/seeds/seed-amenities.js` com amenidades globais (`is_global = true`, `created_by` nulo ou ADMIN do seed, conforme §11) cobrindo Wi‑Fi, estacionamento, piscina, café da manhã, ar‑condicionado, TV, acessibilidade (rampa, banheiro adaptado), aceita pets etc.; upsert idempotente por nome; chamar de `seed-database.js`. Os nomes em português (dado), identificadores em inglês.
- Teste: `tests/prisma/seed-amenities.test.js` (padrão de `seed-database.test.js`): idempotente, todas `is_global = true`, nomes únicos.
- Aceite: `npm run db:seed` cria o catálogo; `GET /api/amenities` o lista.

#### DB-03 · Add `ROOM_PRICE_PERIOD` (price by period) (#50)
- Milestone: F2 · Labels: area:database, priority:must, type:feat · Depende: DB-01
- Ler: doc 25 §10; doc 12; doc 07 RN023-028; schema atual (`RoomPriceHistory`, `RoomType`, `Room`).
- Escopo: model + migration `add_room_price_period` com alvo room ou room type (conforme §10), `validFrom/validUntil` (DATE), `price DECIMAL(10,2)`, CHECK `valid_from <= valid_until`, CHECK `price > 0`, índice por alvo+datas. Sobreposição de períodos **não** é constraint: fica para o service (BE-14).
- Teste: migrations.test.js (colunas, CHECKs, índice) + query-shape de qualquer repositório (não criar repositório aqui).
- Aceite: `prisma:validate` ok; client regenerado.

#### DB-04 · Add image tables (`HOTEL_IMAGE`, `UNIT_IMAGE`, `ROOM_TYPE_IMAGE`) (#51)
- Milestone: F2 · Labels: area:database, priority:must, type:feat · Depende: DB-01
- Ler: doc 25 §12; doc 22 (limites e pastas Cloudinary).
- Escopo: 3 models + migration `add_images` com `publicId`, `url`, `isCover`, `position`, metadados; só metadados no MySQL (RNF029); unicidade `publicId`; capa única e limite de 10 fotos do hotel ficam no service (BE-11/12/13).
- Teste: migrations.test.js.
- Aceite: migration aplica; schema valida.

#### DB-05 · Add availability blocks (`UNIT_BLOCK`, `ROOM_BLOCK`) (#52)
- Milestone: F4 · Labels: area:database, priority:must, type:feat · Depende: DB-01
- Ler: doc 25 §13 e §30; doc 11; doc 07 RN018-022.
- Escopo: models + migration `add_blocks` com período (`startDate/endDate` com CHECK `start_date <= end_date`), motivo, `createdBy`, índices (unit/room + datas) para a query de conflito.
- Teste: migrations.test.js (CHECK + índices).
- Aceite: migration aplica.

#### DB-06 · Add reservation tables (`RESERVATION`, `RESERVATION_ROOM`, `RESERVATION_ROOM_NIGHT`) (#53)
- Milestone: F5 · Labels: area:database, priority:must, type:feat · Depende: DB-05
- Ler: doc 25 §14 e §30; doc 07 RN013-038, RN111; doc 11; doc 12.
- Escopo: models + enums de status + migration `add_reservations` seguindo §14 exatamente: `Decimal` para dinheiro, snapshot de preço por `RESERVATION_ROOM`/noite, `holdExpiresAt`, totais como soma dos itens (RN111). CHECKs (`check_in < check_out`, valores ≥ 0). Avaliar com o §30 se `RESERVATION_ROOM_NIGHT` deve ter unique (room, night) para fechar a corrida de reserva (seguir o doc; se omisso, **perguntar**, não decidir).
- Teste: migrations.test.js (CHECKs, uniques, FKs Restrict).
- Aceite: migration aplica; `prisma:validate` ok.

#### DB-07 · Add `GUEST` (#54)
- Milestone: F5 · Labels: area:database, priority:must, type:feat · Depende: DB-06
- Ler: doc 25 §15; doc 07 (hóspedes RN013-038); `src/utils/cpf.js`.
- Escopo: model + migration `add_guests` ligando hóspede ao `RESERVATION_ROOM`, CPF normalizado (dígitos), idade/criança conforme §15.
- Teste: migrations.test.js.
- Aceite: migration aplica.

#### DB-08 · Add `PAYMENT` and `STRIPE_WEBHOOK_EVENT` (#55)
- Milestone: F10 · Labels: area:database, priority:must, type:feat · Depende: DB-06
- Ler: doc 25 §16; doc 12; doc 24 (idempotência).
- Escopo: models + migration `add_payments`: `stripePaymentIntentId` único, status, método, parcelas, `Decimal`; `STRIPE_WEBHOOK_EVENT` com `stripeEventId` **único** (idempotência de webhook, RNF015/016).
- Teste: migrations.test.js (uniques, CHECK parcelas 1-12).
- Aceite: migration aplica.

#### DB-09 · Add `REFUND` (#56)
- Milestone: F10 · Labels: area:database, priority:must, type:feat · Depende: DB-08
- Ler: doc 25 §17; doc 12; doc 07 RN060-065.
- Escopo: model + migration `add_refunds` (por pagamento e opcionalmente por `RESERVATION_ROOM` para reembolso parcial, status, `stripeRefundId` único, valor Decimal ≥ 0).
- Teste: migrations.test.js.
- Aceite: migration aplica.

#### DB-10 · Add `REVIEW` and `REVIEW_SCORE` (#57)
- Milestone: F7 · Labels: area:database, priority:should, type:feat · Depende: DB-06
- Ler: doc 25 §18; doc 07 RN052-057, RN079-087.
- Escopo: models + migration `add_reviews`: nota geral 1-5 (CHECK), 5 critérios (limpeza, localização, atendimento, conforto, custo-benefício) em `REVIEW_SCORE` com CHECK 1-5, uma avaliação por reserva (unique), original não editável (sem `updatedAt` de conteúdo, conforme §18).
- Teste: migrations.test.js.
- Aceite: migration aplica.

#### DB-11 · Add `REVIEW_MEDIA`, `REVIEW_COMMENT`, `REVIEW_REPORT` (#58)
- Milestone: F7 · Labels: area:database, priority:should, type:feat · Depende: DB-10, DB-04
- Ler: doc 25 §18; doc 22.
- Escopo: models + migration `add_review_extras` (mídia máx. 4 no service; comentário do autor com mídia; resposta do gestor só texto; denúncia com status e motivo).
- Teste: migrations.test.js.
- Aceite: migration aplica.

#### DB-12 · Add favorites (`FAVORITE_HOTEL_LIST/ITEM`, `FAVORITE_ROOM_LIST/ITEM`) (#59)
- Milestone: F7 · Labels: area:database, priority:should, type:feat · Depende: DB-01
- Ler: doc 25 §19; doc 07 RN058-059.
- Escopo: 4 models + migration `add_favorites`; unique (lista, item) e nome de lista único por usuário e tipo (conforme §19).
- Teste: migrations.test.js (uniques).
- Aceite: migration aplica.

#### DB-13 · Add promotions (`PROMOTION` + 4 association tables) (#60)
- Milestone: F11 · Labels: area:database, priority:could, type:feat · Depende: DB-01
- Ler: doc 25 §20; doc 23 (Promotions); doc 07 RN091-098.
- Escopo: models + migration `add_promotions`: tipo percentual (CHECK 1–70) ou valor fixo (mín. R$ 1,00), período de validade e de estadia, `isActive`, tabelas de associação por hotel/unidade/tipo/quarto (PK composta).
- Teste: migrations.test.js (CHECKs).
- Aceite: migration aplica.

#### DB-14 · Add `NOTIFICATION` and `EMAIL_DELIVERY` (#61)
- Milestone: F9 · Labels: area:database, priority:should, type:feat · Depende: DB-01
- Ler: doc 25 §21; doc 13; doc 24.
- Escopo: models + migration `add_notifications` (tipo, payload JSON, `readAt`, canal, status de entrega, tentativas, `correlationId`).
- Teste: migrations.test.js.
- Aceite: migration aplica.

#### DB-15 · Add `JOB_EXECUTION` (#62)
- Milestone: F9 · Labels: area:database, priority:should, type:feat · Depende: DB-01
- Ler: doc 25 §22; doc 24.
- Escopo: model + migration `add_job_executions` (`jobId` único, tipo, status, `attempt`, `correlationId`, erro truncado, timestamps).
- Teste: migrations.test.js.
- Aceite: migration aplica.

#### DB-16 · Add search tables (`SEARCH_HISTORY`, `SEARCH_IMPRESSION`, `SEARCH_CLICK`) (#63)
- Milestone: F3 · Labels: area:database, priority:must, type:feat · Depende: DB-01
- Ler: doc 25 §23; doc 23 (relevância); RF086, RF132-133.
- Escopo: models + migration `add_search_tracking` com índices por hotel/data (para CTR e destinos populares).
- Teste: migrations.test.js.
- Aceite: migration aplica.

#### DB-17 · Add `DAILY_METRIC` (#64)
- Milestone: F8 · Labels: area:database, priority:should, type:feat · Depende: DB-06
- Ler: doc 25 §24; doc 14.
- Escopo: model + migration `add_daily_metrics` (escopo hotel/unidade, data, métricas; unique por escopo+data para upsert idempotente).
- Teste: migrations.test.js.
- Aceite: migration aplica.

#### DB-18 · Apply the recommended indexes of doc 25 §27 (#65)
- Milestone: F5 · Labels: area:database, priority:must, type:chore · Depende: DB-06, DB-16
- Ler: doc 25 §27; schema atual; `EXPLAIN` das queries de disponibilidade/busca.
- Escopo: comparar §27 com os índices existentes e criar migration `add_recommended_indexes` só com os que faltam; justificar cada um (query alvo).
- Teste: migrations.test.js (índices esperados) + `tests/prisma/schema-indexes.test.js` listando os do §27 que devem existir.
- Aceite: migration aplica; teste lista todos os índices do §27.

#### DB-19 · Demo seed for local development (#66)
- Milestone: F2 · Labels: area:database, priority:should, type:chore · Depende: DB-02
- Ler: `prisma/seeds/*`, `package.json`.
- Escopo: `npm run db:seed:demo` (`prisma/seeds/seed-demo.js`): 1 gestor, 1 cliente, 2 hotéis `PUBLISHED` com unidades em cidades diferentes (endereço completo, lat/lng preenchidos), tipos de quarto, ≥ 6 quartos, preços, amenidades. Idempotente; **bloqueado em produção** (`NODE_ENV === 'production'` aborta); senhas vindas de variável/arquivo local, nunca impressas.
- Teste: `tests/prisma/seed-demo.test.js` (idempotente, recusa produção).
- Aceite: front/busca têm dados para trabalhar.

#### DB-20 · Production grants for the append-only `AUDIT_LOG` and DB hardening notes (#67)
- Milestone: F6 · Labels: area:database, priority:should, type:chore · Depende: DB-01
- Ler: doc 15 (audit), doc 25 §25; `docker-compose.yml`.
- Escopo: script SQL `prisma/ops/grant-app-user.sql` (usuário da aplicação com SELECT/INSERT em `audit_log` e CRUD no resto) + `docker/mysql/init` aplicando-o localmente; documentar em `docs/progresso.md`.
- Teste: `tests/architecture/audit-log-grants.test.js` (o SQL contém só SELECT, INSERT para `audit_log`).
- Aceite: usuário de app não consegue UPDATE/DELETE em `audit_log` (verificado no smoke local).
