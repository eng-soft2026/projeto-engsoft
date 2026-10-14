# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

UNIFESP Software Engineering project: a hotel booking platform restricted to Brazil, with fictional hotels registered by managers. Three roles: customer, hotel manager, global admin.

- The repo is at an early stage. Code so far: three plain entities in `src/domain/` (`acomodacao.js`, `hospede.js`, `reserva.js`), the base Next.js structure, `src/lib/` helpers (API response, domain errors, Prisma and Redis singletons, transaction runner, request context), the local infra (`docker-compose.yml`) and Prisma schema part 1: models for doc 25 §3-7 and §26 (users, hotels, managers, review notes, acceptance rules, policies, units, addresses, phones, system settings), the first migration and a seed. Auth and roles (issue #30): Auth.js v5 credentials login with JWT sessions, `UserService`/`AuthService`, `UserRepository`, auth guards, register/login/logout and `/api/users/me` routes, and the ADMIN seed. Hotel registration and approval (issue #37): `HotelService` with the status machine, CNPJ validation, the `AUDIT_LOG` model (§25, migration `add_audit_log`) with the append-only `auditLogger`, manager routes under `/api/hotels` and admin routes under `/api/admin/hotels`. Hotel units (issue #39): `UnitService` creating and editing `HOTEL_UNIT`, `ADDRESS` (1:1) and `UNIT_PHONE` together, migration `make_address_coordinates_nullable`, routes `/api/hotels/:id/units` and `/api/units/:id`. Additional hotel managers (issue #41): `HotelManagerService`, `hotelManagerRepository`, routes `/api/hotels/:id/managers` and `/api/hotels/:id/managers/:userId`, and `canManageHotel` for the owner and the additional managers. Room types and rooms (issue #43): Prisma models for doc 25 §8-10 (`ROOM_TYPE`, `BED_CONFIGURATION`, `ROOM`, `ROOM_TYPE_HISTORY`, `ROOM_PRICE_HISTORY`), migration `add_room_types_and_rooms` with hand-written CHECKs, `RoomTypeService` and `RoomService`, `roomTypeRepository` and `roomRepository`, routes `/api/hotels/:id/room-types`, `/api/room-types/:id`, `/api/units/:id/rooms` and `/api/rooms/:id`, and `src/utils/money.js`. Amenities, policies and acceptance rules (issue #45): `AMENITY` and the four association tables (migration `add_amenities`), `AmenityService`, `AmenityAssociationService`, `AcceptanceService` and `PolicyService`, `amenityRepository`, `hotelAcceptanceRepository` and `hotelPolicyRepository`, routes `/api/amenities`, `/api/{hotels,units,room-types,rooms}/:id/amenities`, `/api/hotels/:id/acceptances`, `/api/hotels/:id/policies` and `/api/policies/:id`. MySQL run (issue #48): the migrations and the seed were applied to a real MySQL, and `scripts/check-mysql-constraints.mjs` (`npm run db:check`) and `scripts/smoke-api.mjs` (`npm run smoke`) verify the database and the main API flow. Component test setup (issue #183): Vitest projects `unit` (node) and `dom` (jsdom) with Testing Library. Integration test infrastructure (issue #185): `npm run test:integration` against a separate `_test` MySQL database and a dedicated Redis database, with `resetDatabase`, `seedBaseData` and `flushRedis` helpers. Schema conformance (issue #187): `tests/prisma/doc-conformance.test.js` checks the Prisma models against the tables of doc 25 and its conventions. Everything else is specification.
- The remaining work is planned as 166 GitHub issues in four plans (database, back-end, front-end, tests and observability) kept in `docs/plans/`. See "Backlog and issue protocol" below.
- The specification in `hotel-booking-github-docs/` (Portuguese) is the source of truth for scope, rules and target architecture. If code and docs disagree, the docs win.
- The root `README.md` is obsolete (old "resort" scope with different cancellation rules). Ignore it.
- Current status, tooling problems and a decisions log live in `docs/progresso.md`. Read it at the start of a session.

## Language

- Reply to me in Brazilian Portuguese.
- Code, identifiers, file names, error codes, commit messages and PR titles in English.
- User-facing text (UI copy, API error `message`) in Portuguese, as in `10-api-spec.md`.
- Keep the spec docs in Portuguese.

## Commands

```bash
npm install
npm test                               # vitest run
npx vitest run path/to/file.test.js    # single file
npx vitest run --project dom           # only the jsdom project (unit = node)
npx vitest run -t "test name"          # single test by name
npm run test:integration               # tests/integration/** on real MySQL + Redis (copy .env.test.example to .env.test; needs db:up)
npm run lint                           # eslint (flat config in eslint.config.js)
npm run format                         # prettier --write
npm run format:check                   # prettier --check (runs in CI)
npm run dev | build | start            # next
npm run db:up | db:down                # docker compose: MySQL 8.4 + Redis 7 (copy .env.example to .env first)
npm run db:seed                        # prisma db seed: acceptance types, default settings and the ADMIN user from ADMIN_* (idempotent)
npm run db:check                       # MySQL structure, seed counts and CHECK violations (rolled back); needs db:up + migrations
npm run smoke                          # API smoke flow against SMOKE_BASE_URL (default http://localhost:3000); needs dev/start and the seeded ADMIN
openssl rand -base64 32                # generate a value for AUTH_SECRET in .env
npm run prisma:generate | prisma:validate
npm run prisma:migrate:dev | prisma:migrate:deploy
```

ESM package (`"type": "module"`). CI runs on Node 22 for pushes and PRs to `main`: lint, format check, tests, build. `npm install` runs `prisma generate` (client in `src/generated/prisma`, git-ignored). Prisma 7 connects through `@prisma/adapter-mariadb`; use `getPrisma()` and `await getRedis()` from `src/lib/`, never instantiate the clients elsewhere. Prisma 7 never seeds on `migrate dev`; run `npm run db:seed`. Tests live in `tests/**/*.test.{js,jsx}` (shared helpers in `tests/helpers/` are not picked up as tests). `vitest.config.js` has two projects that `npm test` runs together: `unit` (node) for everything else and `dom` (jsdom, setup `tests/setup/dom.js` with the jest-dom matchers and `cleanup`) for `tests/components/**` and `tests/hooks/**`; render components with `renderWithUser` (`tests/helpers/render.jsx`, Testing Library plus a `userEvent` instance). Integration tests live in `tests/integration/**`, excluded from `npm test` and run by `vitest.integration.config.js` one file at a time: the config reads `.env.test` (git-ignored) or the environment and aborts unless the database name ends with `_test` and `REDIS_URL` uses a Redis database index greater than 0; `tests/setup/integration-global.js` runs `prisma migrate deploy` once (it creates the test database); call `resetDatabase()`, `seedBaseData()` (`tests/integration/helpers/database.js`) and `flushRedis()` (`helpers/redis.js`) in `beforeEach`. Repository tests use fakes, so add every new repository query to `tests/repositories/prisma-query-shapes.test.js`, which runs it through the real `PrismaClient` with a stub adapter and fails on a wrong field name or enum without needing MySQL; `tests/prisma/doc-conformance.test.js` lists the doc 25 tables by section and the ones still pending, so a migration that creates a table removes it from `PENDING_TABLES` (and a new table in doc 25 goes into `DOC_TABLES_BY_SECTION`), and it fails on any `Float`/`Double` or a money field that is not `Decimal` with 2 places; `vitest.config.js` inlines `next-auth` for both projects (it imports `next/server` without an extension, which plain Node ESM cannot resolve).

Prisma schema rules: models in PascalCase and fields in camelCase, mapped to singular snake_case tables and columns; `CHAR(36)` UUID ids; FKs `onDelete: Restrict`. Keep 4-space indentation in `schema.prisma` and do not run `prisma format` (it rewrites to 2 spaces). Prisma cannot express CHECK constraints and MySQL has no partial indexes: write CHECKs by hand at the end of the generated `migration.sql` (and keep the test in `tests/prisma/migrations.test.js` covering them); enforce conditional uniqueness and cross-table rules in the service. Never edit a migration already merged into `main`; create a new one. Without Docker, generate it offline with `npx prisma migrate diff --from-schema <schema.prisma of main> --to-schema prisma/schema.prisma --script --output prisma/migrations/<timestamp>_<name>/migration.sql` (create the folder first; the command only reads the schemas), then run `npm run prisma:generate`. The generated client is Prisma 7.10: `prisma.$transaction` exists there but not in Prisma 8, so keep its use inside `src/lib/transaction.js` (the seed also uses it).

## Docs map: task → documents

Numbers refer to files in `hotel-booking-github-docs/` (e.g. `25` = `25-database-model.md`). Read only the rows for the current task. Never read the whole folder. In big files (05, 07, 25) grep by ID (`RF038`, `RN077`) or section instead of reading everything.

| Task | Read |
|---|---|
| Setup, dependencies, folder structure | 02, 04 |
| Auth, users, roles | 05 (RF001-006), 15, 25 §3-4, 07 (RN116-118), 10 (Auth) |
| Hotel: registration, approval, blocking, managers, acceptance rules, policies | 07 (RN001-006, RN105-114, RN119-123), 14 (hotel review), 25 §4-6, 15 (authorization, CNPJ), 13 (hotel events) |
| Unit, address, geocoding, map | 23 (Maps), 07 (RN088-090), 25 §7, 04 |
| Room types, rooms, amenities | 07 (RN007-012), 25 §8-11 |
| Availability, blocks, concurrency | 11, 07 (RN018-022, RN037, RN072), 25 §13 and §30, 16 |
| Pricing, promotions, price snapshot | 12, 23 (Promotions), 07 (RN023-028, RN073-076, RN091-098, RN111, RN115), 25 §10, §14, §20 |
| Search, filters, relevance, popular destinations | 05 (RF030-048, RF132-135), 23, 07 (RN099-101), 25 §23, 11 |
| Reservation, hold, guests, checkout | 07 (RN013-038), 11, 25 §14-15 and §30, 10 |
| Cancel or change a reservation | 07 (RN039-045, RN077-078, RN112), 12, 25 §16-17 |
| Overbooking | 07 (RN046-051), 19 (DT006), 25 §7 |
| Payments, Stripe, refunds, webhooks | 12, 07 (RN060-065), 15, 24, 25 §16-17 |
| Reviews and reports | 07 (RN052-057, RN079-087), 22, 25 §18 |
| Favorites | 07 (RN058-059), 25 §19 |
| Media uploads (Cloudinary) | 22, 15, 25 §12 |
| Notifications and e-mail | 13, 24, 25 §21 |
| Jobs, RabbitMQ, retry, DLQ | 24, 04, 25 §22, 15 |
| Admin, analytics, audit | 14, 07 (RN069-071, RN107-108, RN122), 25 §24-25, 15 (audit) |
| Prisma schema, migrations, seeds, repositories | 25, 09 |
| API routes and contracts | 10 plus the domain doc |
| Screens and UI | 18, 01 |
| Tests | 16 plus the domain doc |
| Scoping an issue, roadmap | 17, 05, 06 |

Skip by default: the docs `README.md`, 20 (open questions), 21 (glossary), and 19 (read only the DT being cited).

Precedence when docs overlap: 25 for tables, columns and enums; 07 for business rules; 12 for money; 24 for queues and jobs; 23 for relevance, geocoding and promotions; 22 for media limits. The docs `README.md` has the full table. If a conflict is not covered there, ask.

## Architecture

Modular monolith on Next.js (JavaScript, no TypeScript per DT002). Server Components by default; `"use client"` only for local state, browser events or APIs, and charts.

```
UI → Route Handler / Server Action → Zod schema → Service → Repository → Prisma → MySQL
```

- Route Handlers and Server Actions validate, authorize, delegate to a Service and format the response. No business logic there.
- Business rules live in Services (`ReservationService`, `AvailabilityService`, `PricingService`, `OverbookingService`, `PaymentService`, ...). Repositories own persistence and complex queries. Rules are never duplicated.
- MySQL is the source of truth. Redis is only cache, 15-minute holds and ephemeral locks. Integrations (RabbitMQ, Cloudinary, Stripe, Leaflet/Nominatim, Nodemailer) are described in the docs; Stripe is implemented last (DT011).
- API responses use the envelope in `10-api-spec.md` (`success`, `data` or `error.code`/`error.message`).
- Route Handler pattern: `readJsonBody` (`src/lib/request-body.js`, requires JSON) → `parseWithSchema` (`src/lib/validation.js`, throws `ValidationError`) → service → `jsonSuccess`/`jsonError` (`src/lib/route-response.js`, maps the error class to the HTTP status and hides unexpected errors behind `INTERNAL_ERROR`). Wrap the handler body in `try/catch` and return `jsonError(error)`. Check the role first (`requireRole`), then the params and the body: dynamic routes read `params` (a Promise in Next 16) with `parseRouteParams(context, schema)` (`src/lib/route-params.js`), and admin routes pass `getRequestContext(request)` (`src/lib/request-context.js`) to the service for the audit log.
- Services and repositories are factories with injected dependencies (`createUserService({ userRepository, passwordHasher })`) plus a default instance (`userService`). Repositories resolve the Prisma client lazily, so importing them never needs `DATABASE_URL`. Public selects never include `passwordHash`.
- Auth: Auth.js v5 lives in `src/modules/auth/` (`auth-config.js`, `auth.js`, `guards.js`, `password-hasher.js`). Authorize in Route Handlers with `requireAuth()`/`requireRole([...roles])` (throw `UnauthorizedError`/`ForbiddenError`) and in Server Components with `requirePageAuth()`/`requirePageRole([...roles])` (redirect to `/login` or `notFound()`). Guards reload the user from MySQL on every call; never authorize from the JWT role. No role hierarchy: list `ADMIN` explicitly when it is allowed. Roles come from `USER_ROLES` in `src/constants/user-roles.js`.
- Hotels: `src/modules/hotels/` has the pure status machine (`hotel-status-machine.js`), the access policy (`hotel-access.js`: the owner and the additional managers of `HOTEL_MANAGER` manage a hotel through `canManageHotel`, only the owner (`isHotelOwner`) changes and sees the manager list, RN110; the hotel read by `hotelRepository.findById` carries `managers: [{ userId }]` and `HotelService` strips it from responses), the domain events (`hotel-events.js`, a no-op publisher today) and `admin-action-handler.js` (the shared Route Handler of the four admin actions). A hotel of a manager who is not owner or additional manager answers 404 `HOTEL_NOT_FOUND`, a wrong role 403. Status changes are conditional (`updateStatusIfCurrent`, an `updateMany` on the expected status); `false` becomes `INVALID_HOTEL_STATUS` (409).
- Units: `unit-service.js` follows the hotel rules (the owner and the additional managers manage, a manager outside them answers 404 `HOTEL_NOT_FOUND` or `UNIT_NOT_FOUND`, the ADMIN only reads) and creates, edits or deactivates units only while the hotel is in `DRAFT` (RN124), rechecking the status inside the transaction. Overbooking is an integer 0-10 in the Zod schema and in the service (which also reads `MAX_OVERBOOKING_PERCENT` through `systemSettingRepository`, a value that can only lower the ceiling). `address.latitude` and `address.longitude` are nullable: only the geocoding (phase 3) fills them, the client cannot send them and `replaceAddress` resets them on every address change. Times are `HH:mm` in the API and a `1970-01-01` UTC `Date` in the `TIME(0)` columns (`src/utils/time-of-day.js`); phones and CEP are stored as digits. The unit routes reuse the `[id]` slug of `/api/hotels/[id]` because Next rejects two slug names at the same level.
- Rooms: `room-type-service.js` and `room-service.js` follow the hotel access rules (the owner and the additional managers manage, the ADMIN only reads, anyone else gets 404). Structural changes and creation need the hotel in `DRAFT` (`canEditHotel`); the daily operation of a room (status, notes, room price, deactivation, delete) and the type's `defaultPrice` also work in `PUBLISHED` (`canOperateHotel` in `hotel-status-machine.js`, RN129). The room price is the `ROOM_PRICE_HISTORY` row with `valid_until` null (`price: null` closes it, so the type price applies); changing the type writes `ROOM_TYPE_HISTORY`. `DELETE` removes a room physically only without history and otherwise deactivates it (`status INACTIVE` and `is_active false` go together, a CHECK enforces it); the answer carries `outcome`. A type of another hotel, or an inactive one, answers 404 `ROOM_TYPE_NOT_FOUND`; a duplicate number answers 409 `ROOM_NUMBER_ALREADY_EXISTS` (the service translates Prisma `P2002`). Money and area are `Decimal` columns handled as 2-place strings (`src/utils/money.js`, `createPositiveDecimalSchema`): more than 2 places is rejected, never rounded, and responses return strings.
- Amenities, acceptances and policies: all follow the hotel access rules (the owner and the additional managers write, the ADMIN only reads, anyone else gets 404) and write only while the hotel is in `DRAFT` (RN135), rechecking the status inside the transaction. `amenity-association-service.js` serves the four targets through `AMENITY_TARGETS` (`src/constants/amenity.js`) and one handler factory (`src/modules/amenities/amenity-association-handler.js`); `PUT` replaces the whole set, and an amenity is usable when it is active and global or created by the hotel owner or an additional manager (otherwise 404 `AMENITY_NOT_FOUND`). The association tables use a composite primary key, which blocks the duplicated pair. Global amenities are seed-only, a manager creates only `is_global = false` rows, and the name is unique per creator (the service also refuses a name taken by a global one, `AMENITY_ALREADY_EXISTS`). `PUT /api/hotels/:id/acceptances` replaces the set in one transaction and the Zod schema enforces RN113 (`customLabel` only and always for `OTHER`, one rule per standard type, unique labels ignoring case); `HOTEL_POLICY` rows made through the API are never `is_system` and are deactivated, not deleted (RN136).
- Audit: admin actions call `auditLogger.recordAdminAction(entry, client)` (`src/modules/audit/audit-logger.js`, reason required through `normalizeAuditReason`) inside `transactionRunner.run(async (client) => ...)`, so the status change, the review note and the audit row commit or roll back together. Repositories take an optional `client` (the transaction) as the last argument. `AUDIT_LOG` is append-only: `audit-log-repository.js` only has `create`, and `tests/architecture/audit-log-append-only.test.js` fails if code under `src/` or `prisma/` updates or deletes rows.

### Target structure

```
src/
    app/            routes and pages
    components/     small reusable React components
    modules/        one folder per domain (auth, hotels, units, rooms, reservations, ...)
    services/
    repositories/
    schemas/        Zod
    lib/ hooks/ utils/ constants/ config/
prisma/             schema.prisma, migrations/, seed.js (entry) and seeds/ (prisma.config.mjs at the root)
tests/
```

`src/domain/` is legacy: migrate its entities into `modules/` when you touch them.

### Domain invariants

- The customer always picks a specific physical room. A reservation holds one or more rooms, possibly of different types. Room types belong to the hotel; rooms belong to a unit (RN009).
- A room never has two conflicting confirmed reservations: conflict if `newCheckIn < existingCheckOut AND newCheckOut > existingCheckIn`; back-to-back dates are allowed. Overbooking (0-10% per unit) is a commercial limit only and never shares a physical room (DT006).
- Always revalidate availability on the backend, inside a transaction, before confirming. Never trust the front end or Redis. A declined payment does not restart the 15-minute hold.
- Money uses `Decimal`, never float. Every derived value is rounded down to 2 places (DT020). Calculations are per `ReservationRoom`; reservation totals are the sum of items (RN111). Price priority: period > room > room type, then the single best promotion; commission and service fee are 10% of the gross value (12).
- Cancellation: customer gets a full refund up to 24h before check-in and none after; manager can cancel up to 48h before. No internal credit. Changing a reservation refunds the previous payment and creates a new one.
- Historical records are never physically deleted (soft delete or deactivation). Audit logs are append-only, and admin actions require a reason (RN107-108).
- Hotel status machine (RN003, RN105, RN106, RN120-123): `DRAFT` → `UNDER_REVIEW` (owner); `UNDER_REVIEW` → `PUBLISHED` or → `DRAFT` (admin); `PUBLISHED` or `UNDER_REVIEW` → `BLOCKED` (admin); `BLOCKED` → `PUBLISHED` or `DRAFT` (admin, explicit `targetStatus`). The hotel is editable only in `DRAFT`. Every admin action needs a reason and writes the audit log in the same transaction.
- CPF and CNPJ are validated by check digits and stored normalized (`src/utils/cpf.js`, `src/utils/cnpj.js`). The CNPJ accepts the numeric and the alphanumeric format and is not unique across hotels (RN119).

## Conventions

- 4-space indentation, no tabs (DT013). Existing domain files use 2 spaces; normalize when touched.
- No inline comments (DT012). Clarity comes from names and small functions. Early returns, single responsibility.
- Booleans use `is`/`has`/`can`/`should` prefixes. Functions start with a verb.
- Validate all input on the server with Zod. Never expose stack traces, secrets or password hashes.
- Add a dependency only with a clear need (02). Use a single Redis library.
- Testing priority: availability, reservation, concurrency, hold, pricing, cancellation. Definition of Done is in `16-testing-quality.md`.

## Workflow

1. Before implementing, read the rows of the docs map for the task and state in one or two lines which RF/RN/DT IDs apply.
2. For anything beyond a small fix, propose a short plan and wait for my approval before editing.
3. If the docs are ambiguous or conflict, ask. Do not pick silently.
4. Stay inside the scope of the issue. Mention out-of-scope problems instead of fixing them.
5. Prefer small, verifiable steps. Run `npm run lint`, `npm run format:check`, `npm test` and `npm run build` (the checks of the `ci` job, which blocks the merge) before finishing and report the result; if something cannot run, say why.
6. When a task creates a new decision, rule or table change, update the relevant spec doc and this file in the same PR, and add a short note to `docs/progresso.md`.

### Git

- Every task is a GitHub issue. Branch: `<type>/<ticket-id>-<short-description>`, where `<ticket-id>` is the issue number (e.g. `feat/12-hotel-search`).
- Conventional commits (`feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `test:`, `chore:`). Reference the issue (`Closes #N`).
- Changes reach `main` through a PR reviewed by another team member. The `Protect Main` ruleset (GitHub: Settings → Rules → Rulesets) enforces it: 1 approving review, the `ci` check passing (GitHub Actions), the branch up to date with `main`, no force-push, no branch deletion and no bypass actors. A failing `ci` blocks the merge: fix the cause.
- The required check is the job id `ci` in `.github/workflows/ci.yml`: if you rename the job, update the ruleset in the same change. Never let the workflow be skipped on a PR (`paths`/`paths-ignore` filters, `[skip ci]` in a commit message): a skipped required check stays pending and blocks the merge (GitHub docs, "Troubleshooting required status checks").
- Never commit `.env`. Keep `.env.example` updated without real secrets.

<!-- code-review-graph MCP tools -->
## Backlog and issue protocol

- The plans live in `docs/plans/` (`README.md` has the index and the suggested order; `01-database.md` is `DB-xx`, `02-backend.md` is `BE-xx`, `03-frontend.md` is `FE-xx`, `04-testing-observability.md` is `QA-xx`). Each task is one GitHub issue whose title starts with the ID (`[BE-22] ...`), with a milestone per phase (`F0`, `F2` to `F11`, from doc 17) and the labels `area:*`, `priority:*` and `type:*`. The plans are the original design; the issue (state, comments, PR) and `docs/progresso.md` track the progress.
- The issue body is the task: **Depende de**, **Ler antes** (the docs and files to read), **Escopo**, **Testes** and **Critérios de aceite**. Read only what it lists, plus the docs-map rows for the area. Where the issue says to verify or ask because the docs are silent, ask (Workflow 3); do not decide.
- I ask for one issue per session, with `/issue-cycle #N` or `/issue-cycle <ID>`. Every run must be idempotent, so before any edit:
    1. Resolve the issue (`gh issue view N`, or `gh issue list --state all --search "<ID> in:title"`). Never create a duplicate issue.
    2. Stop if the issue is closed.
    3. Stop and list the open ones if a dependency under **Depende de** is not closed.
    4. Look for existing work: `git branch -a --list "*<N>-*"` and `gh pr list --state all --search "<N>"`. Reuse the existing branch, never create a second one; with an open PR, report it and ask.
    5. If the branch already has commits, read `git log main..<branch>` and `git diff main --stat` and continue from there instead of redoing the work.
    6. Before writing to `docs/progresso.md`, this file or a spec doc, check whether the entry for the issue already exists and update it instead of adding another.
    7. Before generating a migration, check `prisma/migrations` for the same name. Seeds, scripts and helpers added by a task must be safe to run twice.
- Dependencies between issues are not enforced by GitHub: the order in `docs/plans/README.md` and the **Depende de** line are the contract.

## MCP Tools: code-review-graph

Narrow scope with the graph before reading files, then verify in the source (the source wins over a stale graph; an empty result can mean "not indexed").

- Explore: `semantic_search_nodes_tool`, `query_graph_tool` (`callers_of`, `callees_of`, `imports_of`, `tests_for`), `get_architecture_overview_tool`.
- Impact: `get_impact_radius_tool`, `get_affected_flows_tool`.
- Review: `detect_changes_tool` + `get_review_context_tool`.
- The graph auto-updates on file changes via hooks.
<!-- /code-review-graph MCP tools -->
