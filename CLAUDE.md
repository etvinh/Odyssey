# Odyssey

Restaurant ops app built to a fixed brief: pnpm + Turborepo, Expo/React Native Web in
`apps/dashboard`, Hono on Cloudflare Workers in `services/backend`, Postgres + Drizzle, and a
generated contract (drizzle-zod → OpenAPI → Orval). The stack is not open for substitution.
`planning/PRODUCT.md` holds product truth and the explicit scope cuts.
`CONTEXT.md` is the domain glossary and `docs/adr/` holds the architecture decisions.
Planning artifacts — the schema sketch, REST contract and component inventory — live in
`planning/`; they are design input, not the source of truth. The Drizzle schema, the
generated OpenAPI document and the `/ui-library` route are.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
