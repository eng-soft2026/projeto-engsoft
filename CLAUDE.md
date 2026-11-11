# CLAUDE.md

Agent-only notes. Terse; essentials only. What was built is in git, issues and PRs, not here.

## Project

UNIFESP Software Engineering: hotel booking platform for Brazil, fictional hotels registered by managers. Roles: CUSTOMER, MANAGER, ADMIN.

- Spec (Portuguese, source of truth; docs win over code): `hotel-booking-github-docs/`. Root `README.md` is obsolete.
- Backlog: 166 GitHub issues from `docs/plans/` (`01-database` DB-xx, `02-backend` BE-xx, `03-frontend` FE-xx, `04-testing-observability` QA-xx; order in `docs/plans/README.md`).
- Open items and decisions: `docs/progresso.md`. Read it at session start.
- Built so far: auth, hotels (status machine, managers, admin review, audit), units, room types and rooms, amenities/acceptances/policies, media signed upload and galleries (hotel, unit, room type), logging, request id, health, rate limit, password reset, UI base components, auth/profile screens, role layouts, test infra (unit, dom, integration, e2e). Check `src/` before assuming something is missing.

## Language

- Reply in Brazilian Portuguese. Code, identifiers, files, error codes, commits and PR titles in English. User-facing text (UI, API `message`) and spec docs in Portuguese.

## Commands

```bash
npm test                      # vitest (projects unit=node, dom=jsdom)
npx vitest run <file>         # single file
npm run test:coverage | test:integration | test:e2e
npm run lint | format | format:check | build
npm run db:up | db:down       # docker MySQL 8.4 + Redis 7 (.env from .env.example)
npm run db:seed | db:seed:demo | db:check | smoke | audit:check
npm run prisma:generate | prisma:validate | prisma:migrate:dev | prisma:migrate:deploy
```

- ESM, Node 22. CI (`.github/workflows/ci.yml`) on PRs to `main`: `ci` (lint, format check, coverage, build; required by ruleset `Protect Main`, keep the job id), `security` (audit allowlist `scripts/npm-audit-allowlist.json`, gitleaks), `integration`, `e2e`. Never skip the workflow on a PR.
- Tests run in CI only. Do not run the suite locally unless asked or debugging a failure the PR reported.
- gitleaks scans all history: fake test values must be low-entropy (`"token-de-recuperacao"`); a pushed false positive goes to `.gitleaksignore` by fingerprint; never force-push.

## Prisma

- Models PascalCase, fields camelCase, mapped to singular snake_case; `CHAR(36)` UUIDs; FKs `onDelete: Restrict`; 4-space `schema.prisma`, never `prisma format`.
- CHECKs hand-written at the end of `migration.sql`, covered in `tests/prisma/migrations.test.js`. No partial indexes: conditional uniqueness in the service.
- Never edit a merged migration. Offline: `npx prisma migrate diff --from-schema <main schema> --to-schema prisma/schema.prisma --script --output prisma/migrations/<ts>_<name>/migration.sql`.
- `getPrisma()` / `await getRedis()` from `src/lib/` only; `$transaction` only in `src/lib/transaction.js` and the seed (Prisma 7.10).
- Money/area `Decimal` (2 places, strings in API, `src/utils/money.js`); never float.

## Tests (what to add)

- Files in `tests/**` mirroring `src/**`; components/hooks under `tests/components|hooks` (jsdom, `renderWithUser`).
- Every new repository query → `tests/repositories/prisma-query-shapes.test.js`.
- New table → remove from `PENDING_TABLES` in `tests/prisma/doc-conformance.test.js`.
- New route → `withRequestLogging` label = file path, entry in `tests/architecture/route-access.table.js` and `tests/app/api/authorization-matrix.test.js` (count assertion).
- New error code → `tests/lib/errors.test.js` and `src/lib/error-messages.js`.
- Input builders: `tests/helpers/factories` (a new create schema adds its factory); time: `createFakeClock`. Mock only `auth()` for guards. Fake logger or `vi.spyOn(logger, ...)`.
- Integration: `tests/integration/**`, `_test` DB, `resetDatabase`/`seedBaseData`/`flushRedis` in `beforeEach`, fixtures in `tests/integration/helpers/fixtures.js`. Never run with e2e at the same time.
- Architecture guards (`tests/architecture/`): no `new PrismaClient`, `$transaction`, repository imports in `src/app`, float ops in money paths, `console.*` (use `src/lib/logger.js`), `process.env` outside `src/config` and `src/lib`, `//` comments outside `src/domain`. Coverage thresholds only go up.

## Docs map: task → documents

Numbers = files in `hotel-booking-github-docs/`. Grep by ID or section; never read whole big files (05, 07, 25).

| Task | Read |
|---|---|
| Setup, structure | 02, 04 |
| Auth, users | 05 (RF001-006), 15, 25 §3-4, 07 (RN116-118), 10 |
| Hotel, managers, acceptances, policies | 07 (RN001-006, RN105-114, RN119-123), 14, 25 §4-6, 15, 13 |
| Unit, address, geocoding | 23, 07 (RN088-090), 25 §7 |
| Room types, rooms, amenities | 07 (RN007-012), 25 §8-11 |
| Availability, blocks, concurrency | 11, 07 (RN018-022, RN037, RN072), 25 §13, §30, 16 |
| Pricing, promotions | 12, 23, 07 (RN023-028, RN073-076, RN091-098, RN111, RN115), 25 §10, §14, §20 |
| Search | 05 (RF030-048, RF132-135), 23, 07 (RN099-101), 25 §23, 11 |
| Reservation, hold, checkout | 07 (RN013-038), 11, 25 §14-15, §30, 10 |
| Cancel/change | 07 (RN039-045, RN077-078, RN112), 12, 25 §16-17 |
| Overbooking | 07 (RN046-051), 19 (DT006), 25 §7 |
| Payments, Stripe | 12, 07 (RN060-065), 15, 24, 25 §16-17 |
| Reviews | 07 (RN052-057, RN079-087), 22, 25 §18 |
| Favorites | 07 (RN058-059), 25 §19 |
| Media | 22, 15, 25 §12 |
| Notifications, e-mail | 13, 24, 25 §21 |
| Jobs, RabbitMQ | 24, 04, 25 §22, 15 |
| Admin, analytics, audit | 14, 07 (RN069-071, RN107-108, RN122), 25 §24-25, 15 |
| Schema, migrations, repositories | 25, 09 |
| API | 10 + domain doc |
| Screens | 18, 01 |
| Tests | 16 + domain doc |

Skip docs `README.md`, 20, 21; 19 only for the cited DT. Precedence: 25 tables/enums, 07 rules, 12 money, 24 queues, 23 relevance/geocoding/promotions, 22 media. Uncovered conflict: ask.

## Architecture

Modular monolith, Next.js, JavaScript only (DT002). Server Components by default.

`UI → Route Handler → Zod → Service → Repository → Prisma → MySQL`

- Route Handler: `export const GET = withRequestLogging("/api/x/[id]", async (request, context) => { try { requireRole([...]) → parseRouteParams(context, schema) → readJsonBody → parseWithSchema → service → jsonSuccess } catch (e) { return jsonError(e, request) } })`. No business logic. Admin routes pass `getRequestContext(request)` for the audit log. Envelope per doc 10.
- Services and repositories: factories with injected deps plus a default instance; repositories resolve Prisma lazily and take an optional trailing `client` (transaction). Never select `passwordHash`.
- Auth (`src/modules/auth/`): `requireAuth`/`requireRole` in routes, `requirePageAuth`/`requirePageRole` in pages; guards reload the user from MySQL; no role hierarchy (list ADMIN explicitly); roles from `USER_ROLES`.
- Hotel access (`src/modules/hotels/hotel-access.js`): owner and additional managers manage (`canManageHotel`), only owner manages the manager list (RN110), ADMIN reads only (`canViewHotel`); anyone else gets 404 of the resource, wrong role 403.
- Hotel status (RN003, RN105, RN106, RN120-123): `DRAFT → UNDER_REVIEW` (owner); `UNDER_REVIEW → PUBLISHED | DRAFT`, `PUBLISHED | UNDER_REVIEW → BLOCKED`, `BLOCKED → PUBLISHED | DRAFT` (admin, reason required, audit row in the same transaction). Conditional update `updateStatusIfCurrent`; mismatch → 409 `INVALID_HOTEL_STATUS`.
- Editing: hotel, units, room types (structure), amenities, acceptances, policies, galleries only in `DRAFT` (`canEditHotel`), rechecked inside the transaction. Room daily operation and the type `defaultPrice` also in `PUBLISHED` (`canOperateHotel`, RN129).
- Rooms: price = open `ROOM_PRICE_HISTORY` row; type change writes `ROOM_TYPE_HISTORY`; `DELETE` removes without history, deactivates otherwise (`outcome`); duplicate number 409 (translate `P2002`). Price periods (`room-price-period-service.js`) belong to a room, inclusive `DATE` bounds, overlap refused in the transaction under the hotel lock; a period that started (before today in `America/Sao_Paulo`, `src/utils/calendar-date.js`) is immutable.
- Units: overbooking 0-10 (Zod) and `MAX_OVERBOOKING_PERCENT` can only lower it; lat/lng nullable, only geocoding sets them; times `HH:mm` (`src/utils/time-of-day.js`); unit routes reuse the `[id]` slug.
- Media: no binary through the API. `POST /api/media/sign-upload` signs `public_id` `{hotels|units|room-types}/{targetId}/{uuid}` (JPG only for galleries); Cloudinary secret only in `cloudinary-gateway.js` (inject a fake in tests).
- Galleries: `createImageGalleryService({ gallery: { scope, ownerField, loadOwner, maxImages, hasCover, assertOwnerIsWritable, create*Error }, imageRepository, ... })` in `src/modules/media/image-gallery.js` and `createImageRepository({ model, ownerField, hasCover })`. Register by `assetId` only; real metadata via `cloudinaryGateway.getResource`, invalid asset destroyed; writes lock the hotel row (`hotelRepository.lockForUpdate`) and recheck access, status, limit, duplicate asset (409 `MEDIA_IN_USE`), cover; positions contiguous 0..n-1; asset destroyed after commit. Hotel: max 10, cover. Unit: no cap, cover. Room type: no cap, no cover, writes refused on inactive type (409 `ROOM_TYPE_INACTIVE`). Responses never carry `cloudinaryPublicId`.
- Amenities: `PUT` replaces the set; usable amenity = active and global or created by the owner/additional manager; globals seed-only (`GLOBAL_AMENITY_NAMES`). Acceptances `PUT` replaces the set (RN113 in Zod). Policies from the API never `is_system`, deactivated not deleted.
- Audit: `auditLogger.recordAdminAction(entry, client)` inside `transactionRunner.run`; `AUDIT_LOG` append-only.
- Rate limit: `createRateLimiter` (Redis fixed window, fail-open). Login: 5 failures / 15 min per IP + hashed e-mail, only inside credentials `authorize`; 429 `RATE_LIMITED` with `Retry-After`.
- Password reset: forgot always 200; token hashed (SHA-256), 1 h, single use via `markUsedIfActive` in the password transaction; raw token only in the event.
- Logging: `logger.{level}(message, context)`, redacted; `serializeError`. Request id from `src/proxy.js`; read with `getCurrentRequestId()`; never generate another.
- Health: `/api/health` and `/api/health/ready` (MySQL + Redis probes in `readinessProbes`).
- UI: `src/components/ui/` and `globals.css` tokens only (no raw colors), `lucide-react`, `sonner`. Relative imports (no `@/`). Forms: `useApiForm` + `apiFetch` + `resolveErrorMessage`; controls in `FormField` with `isInvalid`; `FormError`; `ConfirmDialog` for admin actions; `Pagination`. Client calls `/api` routes, not Server Actions.
- Pages: customer `src/app/(customer)/`, manager `src/app/(manager)/manager/`, admin `src/app/(admin)/admin/` (layouts authorize). New top-level screen → `navigation-links.js` and doc 18 route map. Redirect targets via `resolveCallbackUrl`.

## Domain invariants

- Customer picks a specific physical room; a reservation holds one or more rooms. Types belong to the hotel, rooms to a unit (RN009).
- No two confirmed reservations overlap on a room (`newIn < existingOut AND newOut > existingIn`; back-to-back ok). Overbooking 0-10% per unit never shares a room (DT006).
- Revalidate availability on the backend in a transaction before confirming. Redis only for cache, 15-min holds, locks. Declined payment does not restart the hold.
- Money: round down to 2 places (DT020); per `ReservationRoom`, totals are sums (RN111). Price priority: period > room > type, then one best promotion; commission and fee 10% of gross (doc 12).
- Cancellation: customer full refund until 24h before check-in, none after; manager up to 48h. No credit. Change = refund + new payment.
- Never physically delete history; audit append-only; admin actions require a reason.
- CPF/CNPJ validated by check digits, stored normalized; CNPJ numeric or alphanumeric, not unique (RN119).

## Conventions

- 4 spaces; no inline comments (DT012); early returns; booleans `is/has/can/should`; functions start with a verb.
- Validate all input with Zod on the server; never expose stacks, secrets or hashes.
- New dependency only with a clear need (doc 02).

## Workflow

1. Read only the issue's **Ler antes**, the docs-map row, and excerpts (`grep -n`, `sed -n a,b`), never whole files when a section is enough.
2. Non-mechanical tasks: short plan, wait for approval. Mechanical tasks (repeat an existing pattern, no open rule): implement directly. Docs ambiguous or conflicting: ask.
3. Stay in scope; report out-of-scope problems.
4. Write new files with the Write tool, not big heredocs.
5. A new decision, rule or table change: update the spec doc (terse) and add one line to `docs/progresso.md`; update this file only where a rule changed.

## Git

- One issue per task. Branch `<type>/<issue>-<short-desc>`. Conventional commits, `Closes #N`. PR reviewed by a teammate; `Protect Main` requires 1 approval, `ci` green, branch up to date, no force-push.
- Never commit `.env`; keep `.env.example` without secrets.
- Issue protocol (idempotent): resolve the issue (never duplicate), stop if closed or a **Depende de** is open, reuse an existing branch/PR, continue from existing commits, update existing doc entries instead of adding, check migration names before generating.

## code-review-graph MCP

Narrow scope with `semantic_search_nodes_tool`, `query_graph_tool` (`callers_of`, `tests_for`, ...), `get_impact_radius_tool`, `detect_changes_tool`; verify in the source. Hooks keep the graph updated.
