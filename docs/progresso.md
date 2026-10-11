# Progress and decisions

Working notes for Claude Code and the team. The spec in `hotel-booking-github-docs/` stays the source of truth; this file only tracks status. Delete items once done.

## Tooling gaps (fix, then remove from this list)

- [ ] Vitest still runs with `passWithNoTests`. Remove it once the availability tests from `16-testing-quality.md` cover the main flows.
- [ ] Obsolete root `README.md` (old "resort" scope). Rewrite it or mark it obsolete and point to `hotel-booking-github-docs/`.
- [ ] Legacy entities in `src/domain/` use Portuguese names and 2-space indentation. Migrate into `src/modules/` when touched.
- [ ] The first migration and the seed were never applied to a real MySQL (Docker daemon was off). With Docker on: `npm run db:up`, `npm run prisma:migrate:deploy`, `npm run db:seed` twice (no duplicates), insert a unit with `overbooking_percentage = 11` (must fail) and `npx prisma migrate dev --create-only` (must report no changes, proving Prisma keeps the hand-written CHECK).

## Done

- Spec reviewed and made consistent (docs 01-25).
- Issue #1 tooling: Next 16, React 19, Tailwind 4 (PostCSS), Prettier (4 spaces), ESLint flat config, Vitest config, CI without `tsc`.
- Issue #24 (base structure): Target structure folders, App Router layout with Tailwind, placeholder home, `lib/api-response.js` and `lib/errors.js` (doc 10 codes) with tests, `npm run build` back in CI.

- Issue #26 (DB/Redis connection): Prisma 7 with the MariaDB adapter, empty `schema.prisma` (MySQL datasource), `lib/prisma.js` and `lib/redis.js` singletons with tests, `.env.example`, `docker-compose.yml` (MySQL 8.4 + Redis 7), `prisma:*` and `db:*` scripts. The compose stack and a real connection were not run (Docker daemon was off).
- Issue #28 (Prisma schema part 1): models for doc 25 §3-7 and §26 (User, Hotel, HotelManager, HotelReviewNote, AcceptanceType, HotelAcceptance, HotelPolicy, HotelUnit, Address, UnitPhone, SystemSetting), first migration `prisma/migrations/<ts>_init` with the overbooking CHECK, idempotent seed (6 system acceptance types, 7 default settings) via `npm run db:seed`, constants in `src/constants/`, tests. Not applied to a real MySQL (see Tooling gaps).

## Next

- Prisma schema part 2: doc 25 §8 onwards (room types, rooms, prices, amenities, images, blocks, reservations...).
- Hotel and unit services must enforce what the database cannot: owner and additional managers have the MANAGER role and the owner is not duplicated in `hotel_manager` (RN109-110); one acceptance rule per standard type and `custom_label` only for `OTHER` (RN113); unit overbooking at most `MAX_OVERBOOKING_PERCENT`.

## Decisions log

Add one line per decision made during implementation: date, decision, doc updated.

- 2026-10-04: Prettier enforces formatting (4 spaces); ESLint only checks code rules (`js` recommended, Next core-web-vitals, `no-inline-comments`). No stylistic ESLint plugin, to avoid conflicts with Prettier. Doc: none.
- 2026-10-04: Using `@next/eslint-plugin-next` directly instead of `eslint-config-next`, which pulls `typescript` as a peer (DT002). Doc: none.
- 2026-10-04: Prettier ignores `*.md`, `package.json` and `src/domain/` (legacy). Doc: none.
- 2026-10-04: `npm run build` removed from CI until `src/app/` exists. Doc: none.
- 2026-10-11: Adopted the code-review-graph MCP for code navigation and review. Its local index (`.code-review-graph/`) and the machine-specific `.mcp.json` are git-ignored. Doc: `CLAUDE.md`.
- 2026-10-11: `.gitattributes` forces LF line endings (`* text=auto eol=lf`), so Prettier checks pass on Windows with `core.autocrlf=true`. Doc: none.
- 2026-10-11: `DomainError(code, message)` has no default message and no HTTP status mapping; status mapping belongs to the Route Handlers. Subclasses: `NotFoundError`, `UnauthorizedError`, `ForbiddenError`. Doc: none.
- 2026-10-11: API helpers return plain objects (no `NextResponse`) to stay testable. Doc: none.
- 2026-10-11: Prisma 7.10 (stable; `latest` on npm is the 8.0 RC) with `@prisma/adapter-mariadb`, which is the MySQL adapter required by Prisma 7. `mysql2` is not installed by us. Doc: `CLAUDE.md`.
- 2026-10-11: `prisma.config.mjs` (no TypeScript, DT002) loads `.env` with `process.loadEnvFile`, so no `dotenv` dependency. Doc: none.
- 2026-10-11: Prisma client is generated into `src/generated/prisma` (git-ignored, ESLint/Prettier ignored) by `postinstall`. The generator emits `.ts` files, which Next, Vitest and Node 22.18+ import from `.js` without a `typescript` dependency. Doc: none.
- 2026-10-11: `getPrisma()` and `getRedis()` create the clients lazily, so importing them never needs `DATABASE_URL` or `REDIS_URL` (builds and tests keep working without services). Doc: none.
- 2026-10-11: `npm audit` reports high advisories on `mariadb@3.4.5` (pinned by the adapter; fixed in 3.5.4) and on `mysql2` pulled by the `prisma` CLI (dev only). Pending team decision. Doc: none.
- 2026-10-11: Prisma models use PascalCase/camelCase mapped to singular snake_case tables and columns (`@@map`/`@map`); IDs are `CHAR(36)` UUIDs; every FK is `ON DELETE RESTRICT` (deactivation over deletion). Doc: 25 §2.
- 2026-10-11: Prisma has no CHECK support, so `CHECK (overbooking_percentage BETWEEN 0 AND 10)` is hand-written at the end of the init `migration.sql`, and a test guards it. Future CHECKs go in the migration the same way. Doc: 25 §2 and §7, 09.
- 2026-10-11: MySQL has no partial indexes. RN113 uses a unique index on `(hotel_id, acceptance_type_id, custom_label)`, which enforces unique `OTHER` labels; since MySQL allows many NULLs in a unique index, "one rule per standard type" and "label only for OTHER" stay in the service. Doc: 25 §5, 09.
- 2026-10-11: `overbooking_percentage` is an integer (`TINYINT UNSIGNED`, default 0). The CHECK is the platform ceiling (RN047); `MAX_OVERBOOKING_PERCENT` can only lower it. Doc: 25 §7 and §26.
- 2026-10-11: `SYSTEM_SETTING.value` is `VARCHAR(255)` typed by `value_type` (`INTEGER | DECIMAL | BOOLEAN | STRING`); `updated_by_user_id` is nullable because seeded defaults have no author. Doc: 25 §26.
- 2026-10-11: `HOTEL.category` is free text (`VARCHAR(50)`) until the values are defined. Doc: 25 §4.
- 2026-10-11: The seed (`prisma db seed`, configured in `prisma.config.mjs`; Prisma 7 no longer seeds on `migrate dev`) upserts acceptance types by `code` and only creates missing settings, so admin changes survive re-seeding. Doc: none.
- 2026-10-11: The first migration was generated offline with `prisma migrate diff --from-empty --to-schema` because Docker was off. Doc: none.
- 2026-10-11: `schema.prisma` keeps 4-space indentation; do not run `prisma format`, which rewrites it with 2 spaces. Doc: `CLAUDE.md`.
