# Odyssey

Restaurant ops app built to a fixed brief: pnpm + Turborepo, Expo/React Native Web in
`apps/dashboard`, Hono on Cloudflare Workers in `services/backend`, Postgres + Drizzle, and a
generated contract (drizzle-zod → OpenAPI → Orval). The stack is not open for substitution.
`planning/PRODUCT.md` holds product truth and the explicit scope cuts.
`CONTEXT.md` is the domain glossary and `docs/adr/` holds the architecture decisions.
Planning artifacts — the schema sketch, REST contract and component inventory — live in
`planning/`; they are design input, not the source of truth. The Drizzle schema, the
generated OpenAPI document and the `/ui-library` route are.

## Conventions

- **Issues and specs** live as local markdown under `.scratch/<feature-slug>/`, one directory per
  feature, with the spec at `spec.md` and numbered tickets under `issues/`. Not committed.
- **Domain docs** are single-context: one `CONTEXT.md` glossary at the root, ADRs in `docs/adr/`.
  Use the glossary's vocabulary; flag anything that contradicts an existing ADR rather than
  silently overriding it.
- **Triage labels**: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`.
