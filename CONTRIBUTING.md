# Contributing

## Prerequisites

- Node.js **22 LTS** (pinned in `.node-version`; see `.nvmrc`-style tools like `nodenv` / `fnm` / `nvm`).
- npm 10+ (ships with Node 22).

## Setup

```bash
git clone git@github.com:theinventor/oopsie_exceptions_javascript.git
cd oopsie_exceptions_javascript
npm install
```

Monorepo: four workspaces under `packages/`. Inter-package deps resolve via npm workspaces — no bootstrapping step.

## Development loop

```bash
npm run typecheck     # all four packages
npm run test          # vitest, unit + integration
npm run test:watch
npm run test:coverage # per-package coverage gates
npm run lint          # biome
npm run format        # biome --write
npm run build         # dual ESM + CJS for each package
```

## Repo layout

```
packages/
  core/      # runtime-agnostic; zero runtime deps
  node/      # Node runtime: fetch, ALS context, process handlers
  browser/   # Browser runtime: keepalive fetch, window handlers
  nextjs/    # Next.js App Router bindings (depends on node + browser)
reference/
  ruby-payload.json   # canonical parity fixture from the Ruby gem
scripts/
  fixup-cjs.mjs       # drops {"type":"commonjs"} into dist/cjs
```

## Parity with the Ruby gem

The JSON webhook payload shape is **frozen** across Ruby and JS. When changing the payload builder (`packages/core/src/payload.ts`), cross-check against:

- `/path/to/oopsie_exceptions/lib/oopsie_exceptions/payload.rb`
- `packages/core/src/__tests__/fixtures/ruby-payload.json`

Shared top-level keys must match one-for-one. JS-specific additions go inside `server` (e.g. `node_version`, `user_agent`).

## Testing rules

- **Every source file has a companion test.** Only `types.ts` and `index.ts` re-exports are exempt (they're covered by the type-level test file, `types.test-d.ts`).
- **Unit tests** mock boundaries (fetch, window events, HTTP listeners).
- **Integration tests** (`*.int.test.ts`) stand up real Node HTTP servers and hit the full `client → payload → transport` pipeline. They live alongside unit tests.
- **Coverage gates** (enforced in `vitest.config.ts`): `core ≥ 90%`, others `≥ 80%` on lines + branches + functions + statements.

## Commit style

- Focused, conversational subject line (no hard 50-char limit but prefer ≤72).
- Body explains **why**, not just what — the diff shows what.
- Every commit includes `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` since this codebase was built with Claude Code.

## Release flow (when we get there)

1. Bump version in each package's `package.json` and the root `CHANGELOG.md`.
2. `npm run build && npm run test && npm run lint`.
3. `npm pack --dry-run` in each package — sanity check tarball contents.
4. `npm publish` from each package directory. Packages have `publishConfig.access: "public"` so the default scope registry works.
5. Tag: `git tag v0.1.0 && git push --tags`.

**Don't publish** without explicit sign-off from the maintainer.
