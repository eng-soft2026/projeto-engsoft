# Progress and decisions

Working notes for Claude Code and the team. The spec in `hotel-booking-github-docs/` stays the source of truth; this file only tracks status. Delete items once done.

## Tooling gaps (fix, then remove from this list)

- [ ] Vitest still runs with `passWithNoTests`. Remove it once the availability tests from `16-testing-quality.md` cover the main flows.
- [ ] Obsolete root `README.md` (old "resort" scope). Rewrite it or mark it obsolete and point to `hotel-booking-github-docs/`.
- [ ] Legacy entities in `src/domain/` use Portuguese names and 2-space indentation. Migrate into `src/modules/` when touched.

## Done

- Spec reviewed and made consistent (docs 01-25).
- Issue #1 tooling: Next 16, React 19, Tailwind 4 (PostCSS), Prettier (4 spaces), ESLint flat config, Vitest config, CI without `tsc`.
- Issue #24 (base structure): Target structure folders, App Router layout with Tailwind, placeholder home, `lib/api-response.js` and `lib/errors.js` (doc 10 codes) with tests, `npm run build` back in CI.

- Issue #26 (DB/Redis connection): Prisma 7 with the MariaDB adapter, empty `schema.prisma` (MySQL datasource), `lib/prisma.js` and `lib/redis.js` singletons with tests, `.env.example`, `docker-compose.yml` (MySQL 8.4 + Redis 7), `prisma:*` and `db:*` scripts. The compose stack and a real connection were not run (Docker daemon was off).

## Next

- Create the Prisma models from `25-database-model.md` and the first migration.

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
