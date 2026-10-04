# Progress and decisions

Working notes for Claude Code and the team. The spec in `hotel-booking-github-docs/` stays the source of truth; this file only tracks status. Delete items once done.

## Tooling gaps (fix, then remove from this list)

- [ ] `next`, `react` and `react-dom` are not in `package.json`, so `npm run dev|build|start` do not work. Add them (plus Tailwind and Prettier with 4 spaces per `03-coding-standards.md`).
- [ ] No ESLint config file exists, so `npm run lint` does not work. Create one that matches the conventions (4 spaces, no inline comments where possible).
- [ ] `.github/workflows/ci.yml` runs `npx tsc --noEmit`, which contradicts DT002 (no TypeScript). Replace it with `npm run lint` and `npm test`.
- [ ] There is no `tests/` directory yet. Create it with the first availability tests (`16-testing-quality.md`).
- [ ] Obsolete root `README.md` (old "resort" scope). Rewrite it or mark it obsolete and point to `hotel-booking-github-docs/`.
- [ ] Legacy entities in `src/domain/` use Portuguese names and 2-space indentation. Migrate into `src/modules/` when touched.

## Done

- Spec reviewed and made consistent (docs 01-25).

## Next

- Create the Prisma schema from `25-database-model.md`.

## Decisions log

Add one line per decision made during implementation: date, decision, doc updated.
