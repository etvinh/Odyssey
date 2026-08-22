# ESLint with type-aware rules, not oxlint

The repo briefly linted with oxlint, which is fast and needs no configuration. It was replaced with ESLint 10 and `typescript-eslint` because this project's whole claim is type and contract discipline, and the rules that enforce that claim need a TypeScript program. `no-floating-promises` is the one that matters: an unawaited mutation in an order-action handler fails silently, passes review, and looks exactly like working code. oxlint 1.79 does ship type-aware rules behind `--type-aware`, so this is a difference of maturity and ecosystem rather than a difference of kind.

Two plugins decided it. `eslint-plugin-drizzle` rejects a `.delete()` or `.update()` with no `.where()` — on a backend that owns order state, a table-wide write is the worst bug available and there is no oxlint equivalent. `eslint-plugin-react-hooks` v7 brings the React Compiler rule set, which covers the hook-dependency and purity mistakes that a dashboard built on generated React Query hooks actually makes.

The boundary rules in `STRUCTURE.md` are enforced here as `no-restricted-imports` overrides rather than left as prose: `packages/ui` may not import `@odyssey/api-client`, the Worker may not import frontend packages, and nothing outside `packages/api-client/src/index.ts` may reach into `generated/`. A boundary no tool checks is a boundary that erodes on the first deadline.

## Consequences

Linting is slower — seconds against oxlint's milliseconds, because `projectService` builds a program. At this repo's size that is not felt, and it would be at ten times the size.

Type-aware rules make lint depend on typecheck being possible. A tsconfig that does not include a file means ESLint cannot lint it, which is why `**/*.{js,mjs,cjs}` opts out through `disableTypeChecked`.

One rule is relaxed in tests. Vitest's `expect.any()` returns `any`, so asserting a row shape trips `no-unsafe-assignment` on library typings rather than on anything written here; the rule is off under `tests/`, and every other rule including `no-floating-promises` still applies.
