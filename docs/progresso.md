# Progress and decisions

Agent notes, terse. History of what was done lives in git, issues and PRs; rules live in `CLAUDE.md` and the spec. Keep here only open items and decisions not written anywhere else. Delete items once done.

## Tooling gaps

- Vitest runs with `passWithNoTests`; remove once availability tests exist (doc 16).
- `src/domain/` is legacy (Portuguese names, 2 spaces); migrate into `src/modules/` when touched.

## Open items

- Media: BE-61 rechecks real `bytes`/`duration` of review media (as `validateStoredImage` does) and adds the `REVIEW` scope and videos. Orphans (signed never registered, failed destroy) → BE-88. No photo cap on unit/room type galleries; add abuse cap if Cloudinary quota suffers. Public room page shows room type photos via BE-15 (#76).
- Schema part 3: doc 25 §13 onwards.
- Rooms: extend `roomRepository.hasHistory` and `roomTypeRepository.hasRoomReferences` with blocks and reservations (price periods already count in `hasHistory`); warn on future reservations when blocking/deactivating (RN012, RN134); block type change with future reservations; deactivating a unit or type does not touch its rooms.
- Public reads (hotel, unit, room, amenities, acceptances) need their own `select`: no `administrativeNotes`, no CNPJ (`PUBLIC_HOTEL_FIELDS` has it).
- `hotelEvents.publish` and `passwordResetService` publisher are no-ops until RabbitMQ/e-mail (BE-80, BE-83).
- `HotelService.submitForReview`: require an active unit with coordinates (after geocoding) and at least one hotel photo.
- Geocoding (RN088) fills `address.latitude/longitude` via `geocodingService.geocodeAddress` (BE-21); until then search and maps skip units without them. Deploy must set `NOMINATIM_USER_AGENT` (contact per Nominatim policy), else geocoding answers 503.
- Units: deactivated unit is still editable in the API (the manager screen shows it read-only; decide the API rule); block overbooking change and deactivation with active reservations.
- Audit log: query API and screen (doc 14, route not in doc 10), `result = FAILURE` for denied attempts, DB-level immutability (GRANT, triggers).
- Prisma 8 drops `prisma.$transaction`; only `src/lib/transaction.js` and the seed use it.
- Health: QA-16 lists `/api/health*` as `public` in `route-access.table.js`; BE-80 adds the RabbitMQ probe. Redis client has no `reconnectStrategy` (logs every retry).
- Pagination for `GET /api/admin/hotels` (capped 100) and `GET /api/hotels`.
- Hotel `is_active`: no route changes it, queries ignore it.
- Login rate limit trusts `x-forwarded-for` (proxy must overwrite it); no atomic check-and-increment; Auth.js form callback returns redirect `code=rate_limited`, not 429.
- Password reset does not revoke open JWTs (`password_changed_at` would); expired tokens never deleted.
- Auth.js `pages.signIn` → `/login`; guards redirect without `callbackUrl`.
- Add `global-error.jsx`.
- Product questions: RN120 blocks any edit of a published hotel (also amenities, acceptances, policies); can a MANAGER book as customer (unique CPF, one role); require `currentPassword` for e-mail change; admin moderation of manager amenities.
- Admin user management: use `auditLogger.recordAdminAction`, add `USER` to `AUDIT_ENTITY_TYPES`.

## Decisions log

One line per decision not recorded in the spec or `CLAUDE.md`: date, decision, why.

- 2026-10-04: Prettier owns formatting, ESLint only code rules; `@next/eslint-plugin-next` directly (`eslint-config-next` pulls `typescript`, DT002). Prettier ignores `*.md`, `package.json`, `src/domain/`.
- 2026-10-11: `.gitattributes` forces LF so Prettier passes on Windows.
- 2026-10-11: code-review-graph MCP adopted; `.code-review-graph/` and `.mcp.json` git-ignored.
- 2026-10-11: Prisma 7.10 with `@prisma/adapter-mariadb`; `prisma.config.mjs` loads `.env` via `process.loadEnvFile` (no dotenv); client generated to `src/generated/prisma` by `postinstall`.
- 2026-10-11: Auth.js v5 beta pinned exact; custom login/logout routes skip Auth.js CSRF, mitigated by JSON-only bodies and `SameSite=Lax`; route rejects `X-Auth-Return-Redirect`.
- 2026-10-11: Unexpected errors log only `name`/`code` (Prisma messages can echo query args).
- 2026-10-11: `next build` needs no `AUTH_SECRET`, so CI has no secret.
- 2026-10-12: Request IP/User-Agent from headers are informative only (forgeable).
- 2026-10-13: Room price lives in `ROOM_PRICE_HISTORY` (`valid_until` null = current), no price column on `ROOM`; a room has history with any price row or more than one type-history row.
- 2026-10-14: MySQL checks are scripts (`db:check`, `smoke`), not Vitest.
- 2026-10-14: Component tests use a separate Vitest project by folder (DT012 forbids the per-file environment comment).
- 2026-10-14: Integration Redis isolated by logical DB index, not key prefix; `resetDatabase` uses `DELETE` in FK order, not `TRUNCATE`.
- 2026-10-14: QA-24 audit allowlist: `deepmerge-ts` and `mysql2` advisories come only from the `prisma` CLI.
- 2026-10-15: pino without `pino-pretty`/worker; redaction done by the wrapper (pino paths allow one wildcard level).
- 2026-10-15: `integration` job keeps an explicit `migrate deploy` step and stays out of the ruleset (team decision).
- 2026-11-09: Coverage thresholds = baseline minus 2, only go up.
- 2026-11-09: `ConfirmDialog` is a custom `role="dialog"` (jsdom has no `showModal`).
- 2026-11-09: e2e users are fixed fake low-entropy accounts, port 3100.
- 2026-11-11: Demo seed writes through Prisma (services cannot create `PUBLISHED` hotels); reruns only create what is missing.
- 2026-11-11: Gallery core shared by hotel, unit and room type. Unit and room type have no photo cap; room type gallery has no cover and refuses writes on an inactive type (`ROOM_TYPE_INACTIVE`), unlike the unit (team decision, BE-13).
- 2026-11-11: Agent docs (`CLAUDE.md`, this file, the issue-cycle skill) are written only for the agent: terse, essentials only. Tests run only in CI on the PR.
- 2026-11-11: BE-14 has no `/api/room-types/:id/price-periods` despite the issue: doc 25 says a period always targets a room.
- 2026-11-11: Acceptances/policies screen (FE-13): UI only toggles `is_system` policies (no text edit), though `PATCH /api/policies/:id` still allows it; server `VALIDATION_ERROR` has no field path, so the screens show it as a form error.
