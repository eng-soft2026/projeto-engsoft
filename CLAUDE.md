# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

UNIFESP Software Engineering project: a hotel booking platform restricted to Brazil, with fictional hotels registered by managers. Three roles: customer, hotel manager, global admin.

- The repo is at an early stage. The only code is three plain entities in `src/domain/` (`acomodacao.js`, `hospede.js`, `reserva.js`). Everything else is specification.
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
npx vitest run -t "test name"          # single test by name
npm run lint                           # eslint (flat config in eslint.config.js)
npm run format                         # prettier --write
npm run format:check                   # prettier --check (runs in CI)
npm run dev | build | start            # next (no src/app yet, see docs/progresso.md)
```

ESM package (`"type": "module"`). CI runs on Node 22 for pushes and PRs to `main`: lint, format check, tests. Tests live in `tests/**/*.test.js`.

## Docs map: task → documents

Numbers refer to files in `hotel-booking-github-docs/` (e.g. `25` = `25-database-model.md`). Read only the rows for the current task. Never read the whole folder. In big files (05, 07, 25) grep by ID (`RF038`, `RN077`) or section instead of reading everything.

| Task | Read |
|---|---|
| Setup, dependencies, folder structure | 02, 04 |
| Auth, users, roles | 05 (RF001-006), 15, 25 §3-4 |
| Hotel: registration, approval, blocking, managers, acceptance rules, policies | 07 (RN001-006, RN105-114), 14 (hotel review), 25 §4-6 |
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
| Admin, analytics, audit | 14, 07 (RN069-071, RN107-108), 25 §24-25 |
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
prisma/             schema.prisma, migrations, seeds
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
5. Prefer small, verifiable steps. Run `npm test` and `npm run lint` before finishing and report the result; if something cannot run, say why.
6. When a task creates a new decision, rule or table change, update the relevant spec doc and this file in the same PR, and add a short note to `docs/progresso.md`.

### Git

- Every task is a GitHub issue. Branch: `<type>/<ticket-id>-<short-description>`, where `<ticket-id>` is the issue number (e.g. `feat/12-hotel-search`).
- Conventional commits (`feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `test:`, `chore:`). Reference the issue (`Closes #N`).
- Changes reach `main` through a PR reviewed by another team member.
- Never commit `.env`. Keep `.env.example` updated without real secrets.
