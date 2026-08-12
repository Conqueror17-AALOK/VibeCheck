# VibeCheck setup notes

npm workspaces monorepo, TypeScript everywhere. `npm install` at the repo
root resolves and links all four packages under `src/*`.

## Structure

- **`src/shared`** (`@vibecheck/shared`) — the schema.json contract compiled
  once: `types.ts` (hand-mirrored TS types) + `validate.ts` (ajv validator,
  reads `schema.json` from disk at runtime, works against both `src/` and
  compiled `dist/` since they're the same depth under `src/shared/`).
  Deps: `ajv`, `ajv-formats`. Has a passing vitest suite exercising the
  validator against schema.json for real.
- **`src/person-a`** (`@vibecheck/person-a`) — extraction. Deps: `playwright`
  (Chromium binary installed via `npx playwright install chromium`),
  `@vibecheck/shared`.
- **`src/person-b`** (`@vibecheck/person-b`) — checklist generation + diff.
  Deps: `@anthropic-ai/sdk`, `@vibecheck/shared`.
- **`src/person-c`** (`@vibecheck/person-c`) — Next.js 14 (App Router) +
  Tailwind web app. `@dnd-kit/*` included for the Kanban board's
  drag-and-drop. Confirmed `next build` succeeds cleanly.

Root `package.json` holds the npm workspaces config and repo-wide devDeps
(`typescript`, `vitest`, `prettier`) plus orchestration scripts
(`build`/`test`/`typecheck`/`validate`, run across all workspaces).

## Verified

- `npm install` — 195 packages, clean.
- `npm ls @vibecheck/shared --workspace=src/person-a` / `person-b` — both
  resolve to the local workspace package.
- `npm run build --workspace=src/shared` then `npm run typecheck` on
  person-a and person-b — pass with no errors (needed `composite: true` on
  shared's tsconfig for TS project references to work).
- `npx next build` in `src/person-c` — compiles, type-checks, and
  prerenders the placeholder page successfully.
- `npx playwright install chromium` — Chromium + ffmpeg + headless-shell
  binaries downloaded.
- `npm run test --workspace=src/shared` — 2/2 passing (validates a real
  minimal doc against schema.json, and rejects an invalid one).

## Known gaps / decisions still open

- **npm audit**: 7 vulnerabilities reported (moderate/high/critical),
  concentrated in `esbuild` (via vitest's vite dependency) and `next`/`postcss`.
  The suggested fixes are major-version bumps (vitest 2→4, next 14→16) —
  didn't apply them blind since that's a breaking change across every
  package; worth a deliberate upgrade pass before shipping, not urgent for
  local dev.
- **Kanban board persistence** (person-c): scaffolded with `@dnd-kit` but no
  backend chosen yet — whoever builds it needs to decide file-based /
  API-route-in-memory / real DB depending on how "live" it needs to be
  across viewers.
- **No actual pipeline code yet** — person-a/b/c each just have a `TODO`
  stub `src/index.ts` (or the default Next.js page). This only scaffolds
  packages + installs deps; implementation is next.
- `@anthropic-ai/sdk` version pinned to `^0.30.1` at scaffold time — bump if
  a newer major is out when person-b starts implementing.
