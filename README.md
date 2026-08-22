# Odyssey

Restaurant operations for a single independent restaurant: orders, menu, customers, and the service settings that govern them.

---

## Run locally

### Prerequisites

- **Node** ≥ 20
- **pnpm** 11.22.0 (`corepack enable` picks this up from `packageManager`)
- **Docker** — for Postgres database.

NOTE: No Cloudflare account is needed. `wrangler dev` runs the Workers runtime locally.

### Setup

```bash
pnpm install
docker compose up -d          # Postgres 17 on :5432
pnpm db:migrate               # apply drizzle migrations
pnpm seed                     # synthetic data — see below
```

### Running

Two terminals:

```bash
pnpm dev:backend              # Hono on workerd  → http://localhost:8787
pnpm dev:dashboard            # Expo web         → http://localhost:8081
```

The dashboard is on **8081**. The API serves JSON only; browse and exercise it at
**http://localhost:8787/docs**, generated from the same OpenAPI document Orval consumes.

### Other commands

| Command | Does |
|---|---|
| `pnpm gen:contract` | schema → OpenAPI → regenerate `packages/api-client` |
| `pnpm typecheck` | all packages (depends on `gen:contract`, so a stale client fails) |
| `pnpm lint` | ESLint with type-aware rules |
| `pnpm test` | backend suite (Vitest, needs Postgres up) |
| `pnpm db:generate` | new migration from a `schema.ts` change |

---

## Seed data

```bash
pnpm seed          # truncate the seeded tables, repopulate
pnpm seed:reset    # drop the schema, re-migrate, then repopulate
```

- **Deterministic.** Fixed PRNG seed, no wall-clock reads outside one fixed reference point — two reviewers see identical data, so a failing test means a real change.
- **What you get.** Categories, menu items, customers, and orders spread across every status, including cancelled orders and walk-ins. The script prints the exact counts on completion.
- **Which switch matters.** `isAutoAccepting` seeds *off*, so orders land as `pending` and Home's needs-attention slice and pending KPI are populated rather than empty.
- **When to use `--reset`.** After a schema change, or any time the database is in an unknown state.

---

## Architecture Decisions

| Decision | Why | ADR |
|---|---|---|
| Postgres over `cloudflare:sockets` | `workerd` has no Node `net`; keeps a good local-run story | [0001](docs/adr/0001-workers-postgres-connectivity.md) |
| Hand-built design system on RN primitives | Was originally going to use MUI but that sort of defeats the purpose of making my own UI library. | [0002](docs/adr/0002-react-native-primitives.md) |
| Server owns order transitions | It wouldn't make sense to set an order as completed if it isn't even confirmed yet. For this reason, there is server side validation so even if someone somehow manages to skip a stage, backend will throw an error. | [0003](docs/adr/0003-server-owned-order-transitions.md) |
| `types` and `api-client` as separate packages | generated output stays regenerable; shared enums have a home | [0004](docs/adr/0004-types-and-api-client-packages.md) |

### Layout

```text
apps/dashboard      Expo + React Native + Web, Expo Router
services/backend    Hono on Cloudflare Workers
packages/types      domain enum values and shared type aliases
packages/api-client Orval output (generated, committed)
packages/shared     formatters and the service-status rule
packages/ui         design tokens + RN primitives
```

---

## Tradeoffs

- **Server-side Client-side rendering.** I made some significant decisions on what gets rendered server-side and what gets rendered client-side in terms of filters:

  - Orders get rendered client-side: I made this choice to speed up filtering in the UI. Realistically, when orders are being processed and looked through in a busy kitchen, speed is of utmost importance. Now, fetching a large amount of orders will significantly slow things down, which is why I decided to only render orders from the past 24 hours, the older orders are archived. On average, restaurants complete 50-600 orders per day so server-side rendering shouldn't be an issue. NOTE THAT IF YOU SEED AN UNREALISTIC AMOUNT OF SAME DAY ORDERS THIS APP WILL BE SLOW AS MOLASSES. <-- PLEASE NOTE THIS JUSTIFICATION BEFORE EVALUATING.

  - CRM gets rendered server-side: I decided that this page is more relevant for fetching historical data and therefore is paginated and designed to fetch from a very large table. filters are applied server-side.

  - Menu is rendered client-side: Menu, is small, no need to make a server call to filter through the menu.

  - Home is rendered client-side and server-side: needs attention rendered from the orders fetch (client-side), and popular this week computed server-side.

- **Orders are immutable.** No `PATCH /orders`. Completed and cancelled are terminal. May pose some problems in the future if an order needs to be changed, which happens frequently. Genuinely important next step.
- **No auth, no roles.** Fine for a demo but would be real problematic if this were deployed...

### Next Steps

- **Create an endpoint to change orders.** See tradeoffs.
- **Deploy.** Deploy on an EC2 instance. Would need to write the docker compose files for the application, only the DB is dockerized.
- **Archived orders** create a page for orders that are older than 24 hours. filters would have to be done server-side.
