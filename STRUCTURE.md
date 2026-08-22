# Repository Structure

The target layout for Odyssey, derived from the stack fixed in `INSTRUCTIONS.md` and the decisions already recorded in `PRODUCT.md`, `API.md`, `COMPONENTS.md`, `DATABASE.md`, and `docs/adr/`.

**Status:** this is the blueprint, not a description. The repository currently contains documentation only — no `apps/`, `services/`, or `packages/` directory exists yet. Build against this file; when reality and this file disagree, reality wins and this file gets amended.

Two conventions the whole tree obeys:

- **One direction of truth.** Drizzle schema → drizzle-zod → Hono/OpenAPI → Orval → generated hooks. Nothing flows backwards, and nothing is hand-copied across a boundary.
- **One home per concern.** Tokens live in exactly one module, the order state machine in exactly one file, money formatting in exactly one function.

---

## Top level

```text
odyssey/
├── apps/
│   └── dashboard/            Expo + React Native + Web (the only app)
├── services/
│   └── backend/              Hono on Cloudflare Workers (the only service)
├── packages/
│   ├── types/                Drizzle schema + drizzle-zod domain types  ← source of truth
│   ├── api-client/           Orval output, committed, never hand-edited
│   ├── ui/                   Design tokens + RN primitives (the design system)
│   └── shared/               Cross-cutting utilities used by both sides
├── docs/
│   ├── adr/                  0001–0004, architecture decision records
│   └── agents/               Agent workflow conventions (issue tracker, triage, domain)
├── .scratch/                 Feature specs and issues (see docs/agents/issue-tracker.md)
├── docker-compose.yml        Postgres 16 for local development
├── turbo.json                Task graph and caching
├── pnpm-workspace.yaml       apps/*, services/*, packages/*
├── tsconfig.base.json        Strict TS, path aliases for @odyssey/*
├── package.json              Root scripts (dev:*, gen:contract, lint, typecheck, test, seed)
├── .env.example              DATABASE_URL and the dashboard's API base URL
└── README.md                 Run locally, seed, architecture notes, tradeoffs
```

Existing root documents keep their place: `INSTRUCTIONS.md` (the brief), `PRODUCT.md`, `API.md`, `COMPONENTS.md`, `DATABASE.md`, `CONTEXT.md` (domain glossary), `CLAUDE.md`, and this file.

`.scratch/` is **committed**, not ignored. The brief evaluates how the build was steered with AI, and the specs and tickets are the evidence of that.

---

## `apps/dashboard`

Expo Router owns routing. Route files stay thin; every page delegates to a feature composition.

```text
apps/dashboard/
├── app/                              Expo Router — file-based routes only
│   ├── _layout.tsx                   AppShell: 240px sidebar ≥ breakpoint,
│   │                                 top bar + overlay drawer below; ServiceStatusPill;
│   │                                 QueryClientProvider, ToastProvider, expo-font loading
│   ├── index.tsx                     Home
│   ├── orders/
│   │   ├── _layout.tsx               list renders children so [id] overlays it
│   │   ├── index.tsx                 Orders
│   │   └── [id].tsx                  OrderDetailDrawer over the list
│   ├── menu/index.tsx                Menu
│   ├── crm/
│   │   ├── _layout.tsx
│   │   ├── index.tsx                 CRM
│   │   └── [id].tsx                  CustomerDetailDrawer over the list
│   ├── settings/index.tsx            Settings
│   ├── ui-library/index.tsx          The design system route
│   └── +not-found.tsx
├── src/
│   ├── features/                     Page compositions — these own the data
│   │   ├── home/                     HomeKpiRow, NeedsAttentionTable, PopularItemsList
│   │   ├── orders/                   OrdersFilterBar, OrdersTable, OrderDetailDrawer,
│   │   │                             OrderCreateModal, use-order-actions.ts
│   │   ├── menu/                     MenuCategorySection, MenuItemModal
│   │   ├── crm/                      CustomersTable, CustomerDetailDrawer
│   │   └── settings/                 ServiceSettingsCard, OpeningHoursCard, ServiceStatusPill
│   ├── ui-library/                   TokenGrid, TypeScaleTable, SpacingRamp, RadiusSamples,
│   │                                 ElevationSamples, SurfaceSamples, GridStrip, ComponentGallery
│   └── lib/
│       ├── query-client.ts           defaults + the invalidation keys from API.md §6
│       └── api-config.ts             base URL from env
├── assets/fonts/                     one UI face + one monospace (data/kpi styles)
├── app.json  ·  babel.config.js  ·  metro.config.js  ·  tsconfig.json  ·  package.json
```

**Why `features/` and not `components/`.** The split is by ownership, not by shape. Anything in `src/features/` may call generated hooks and hold query, mutation, and invalidation logic. Anything in `packages/ui` may not. A folder called `components/` invites the two to mix.

**Detail views are routes, create/edit modals are not.** `/orders/[id]` and `/crm/[id]` are linkable and close with the back button; a URL representing a half-filled form is worse than no URL. This is already stated in `COMPONENTS.md` and the tree enforces it.

---

## `services/backend`

```text
services/backend/
├── src/
│   ├── index.ts                      Worker entry: Hono app, CORS, error handler,
│   │                                 /api/v1 mount, /openapi.json, /docs
│   ├── env.ts                        typed Bindings (DATABASE_URL)
│   ├── db/
│   │   └── client.ts                 drizzle(postgres-js) over cloudflare:sockets  ← ADR-0001
│   ├── routes/                       thin: parse, call a service, shape the response
│   │   ├── summary.ts                GET /summary
│   │   ├── orders.ts                 list / get / create / actions
│   │   ├── menu.ts                   categories + items
│   │   ├── customers.ts              list / get
│   │   └── settings.ts               get / patch
│   ├── services/                     business logic lives here, never in a handler
│   │   ├── order-transitions.ts      the transition table + allowedActions  ← ADR-0003
│   │   ├── order-creation.ts         snapshotting, server-side totals, customer union,
│   │   │                             auto-accept, first order_events row — one transaction
│   │   ├── order-queries.ts          list + statusCounts in one query
│   │   ├── customer-queries.ts       derived totals in SQL, not N+1
│   │   └── summary.ts                today/yesterday/popular items
│   ├── schemas/                      request/response zod built on packages/types,
│   │   │                             registered with @hono/zod-openapi
│   │   └── (one file per resource)
│   └── lib/
│       ├── errors.ts                 { error: { code, message, fields? } } + the stable codes
│       └── list-envelope.ts          ListEnvelope<T, M> — widened, never replaced
├── scripts/
│   ├── emit-openapi.ts               boots the app, writes openapi.json  (Node)
│   └── seed.ts                       deterministic synthetic data        (Node)
├── test/
│   ├── order-transitions.test.ts     every cell of the table, legal and illegal
│   ├── order-creation.test.ts        unavailable item → 409, totals, snapshotting, auto-accept
│   ├── order-queries.test.ts         statusCounts ignores the status filter
│   └── settings.test.ts              prep-time range, opensAt < closesAt
├── openapi.json                      generated, committed — Orval's input
├── drizzle.config.ts                 points at packages/types/src/schema
├── wrangler.toml                     nodejs_compat, DATABASE_URL binding
└── package.json
```

**Routes are thin on purpose.** `INSTRUCTIONS.md` calls out business logic sitting in large handlers as an anti-pattern on the frontend; the same rule applies here. A route file parses input, calls one service function, and maps the result. The transition table lives in `order-transitions.ts` and is imported by both the action endpoint and the `allowedActions` computation on list rows, so the two can never disagree.

---

## `packages/`

### `packages/types` — the source of truth

```text
packages/types/
├── src/
│   ├── schema/                       Drizzle tables — the origin of every type
│   │   ├── enums.ts                  orderStatus, orderChannel, dayOfWeek (pgEnum)
│   │   ├── menu.ts                   menu_categories, menu_items
│   │   ├── customers.ts
│   │   ├── orders.ts                 orders, order_items, order_events
│   │   ├── settings.ts               settings, opening_hours
│   │   └── index.ts
│   ├── zod/                          drizzle-zod select/insert schemas per table
│   ├── domain.ts                     OrderAction and other non-table domain unions
│   └── index.ts
├── migrations/                       drizzle-kit output, committed
└── package.json
```

**The Drizzle schema lives here, not in the backend.** This is a decision this document makes, and the existing docs left it open. ADR-0004 says both the Worker and the dashboard import `packages/types`; if the schema sat in `services/backend` then `types` would have to import from the service that imports it, which is a cycle. Putting the schema in `packages/types` makes the graph acyclic and the package honest about what it is: the schema and everything derived from it. It is worth a line appended to ADR-0004.

`OrderAction` is the one domain type with no table behind it — it names the transitions, not a column — so it sits in `domain.ts` rather than under `zod/`.

### `packages/api-client` — generated, committed, untouched

```text
packages/api-client/
├── src/
│   ├── generated/                    ⚠ Orval output. Never hand-edit. Regenerate.
│   │   ├── odyssey.ts                React Query hooks (useListOrders, useApplyOrderAction, …)
│   │   └── odyssey.schemas.ts        request/response types
│   └── mutator.ts                    fetch instance: base URL, JSON, unwraps the error envelope
│                                     so React Query's `error` is already { code, message, fields }
├── orval.config.ts                   input: services/backend/openapi.json
└── package.json
```

### `packages/ui` — the design system

```text
packages/ui/
├── src/
│   ├── tokens.ts                     THE token module: color, type, spacing, radius,
│   │                                 border, shadow/elevation, layout
│   ├── primitives/                   Button, IconButton, Text, TextInput, TextArea, Select,
│   │                                 Switch, Stepper, SegmentedControl, SearchField, Surface
│   ├── data/                         DataTable, StatusBadge, Avatar, KpiStat, ProgressBar
│   ├── overlay/                      Dialog, ConfirmDialog, DetailDrawer, Toast
│   ├── feedback/                     InlineAlert, Skeleton, EmptyState, ErrorState
│   ├── form/                         FormRow, SaveBar
│   ├── nav/                          NavList, NavItem
│   └── index.ts
└── package.json
```

`COMPONENTS.md` refers to the token module as `packages/ui/tokens.ts`; this tree puts it at `packages/ui/src/tokens.ts` for consistency with the other packages. Pick one and make both documents say it.

### `packages/shared`

```text
packages/shared/
├── src/
│   ├── money.ts                      formatMoney — cents → "$12.50"
│   ├── service-status.ts             open/closed from isAcceptingOrders + hours;
│   │                                 imported by the backend AND ServiceStatusPill
│   ├── datetime.ts                   relative "last visit", timeline stamps
│   └── index.ts
└── package.json
```

`service-status.ts` is shared precisely so the two consumers cannot drift. It has unit tests, because it is the one piece of derived logic both sides depend on.

---

## Dependency direction

```text
        packages/types  ←──────────────┐
          ↑        ↑                   │
          │        │                   │
services/backend  packages/shared      │
          │        ↑                   │
          │        │                   │
          └──→ openapi.json            │
                    │                  │
                    ↓                  │
           packages/api-client ────────┘
                    ↑
                    │
            apps/dashboard ──→ packages/ui ──→ packages/types (types only)
```

Enforced rules, all mechanically checkable:

| Rule | Why |
|---|---|
| `packages/ui` never imports `packages/api-client` | A design system that fetches is not a design system. `COMPONENTS.md` states this; keep it lintable. |
| Nothing imports from `generated/` except through `packages/api-client`'s entry | Regeneration must be wholesale and blameless. |
| No enum, status string, or DTO is declared outside `packages/types` | The single-source rule from `INSTRUCTIONS.md`. A duplicated `orderStatus` is a defect. |
| `services/backend` never imports `apps/dashboard` or `packages/ui` | Obvious, but worth a lint rule. |
| Route files under `app/` hold no data logic | Keeps pages thin; logic sits in `src/features/`. |

---

## Generated vs. authored

| Path | Generated by | Committed | Editable |
|---|---|---|---|
| `services/backend/openapi.json` | `emit-openapi.ts` | yes | no |
| `packages/api-client/src/generated/` | Orval | yes | **no** |
| `packages/types/migrations/` | drizzle-kit | yes | only for a deliberate hand-written migration |
| everything else | a person | yes | yes |

Both generated artifacts are committed so a reviewer can clone and read the contract without running anything. `typecheck` depends on `gen:contract` in `turbo.json`, so a stale client fails the check rather than rotting quietly.

---

## Scripts

```bash
pnpm db:up            # docker compose up -d postgres
pnpm db:migrate       # drizzle-kit migrate
pnpm seed             # truncate + repopulate, deterministic
pnpm seed:reset       # drop, re-migrate, re-seed
pnpm dev:backend      # wrangler dev
pnpm dev:dashboard    # expo start --web
pnpm gen:contract     # emit-openapi.ts → orval → packages/api-client/src/generated
pnpm lint  ·  pnpm typecheck  ·  pnpm test
```

`gen:contract` is one command doing two steps because splitting them invites running half of it. Cold start for a reviewer is `pnpm install && pnpm db:up && pnpm db:migrate && pnpm seed`, then the two dev commands — and that sequence belongs verbatim in the README.

---

## Conventions

**Naming.** Components are `PascalCase.tsx`. Everything else is `kebab-case.ts`. Route files follow Expo Router's lowercase and bracket rules. Directories are lowercase.

**Tests.** Backend flow tests in `services/backend/test/` against a real Postgres, because the things worth testing here — transitions, transactional creation, SQL-derived totals — are exactly the things a mocked database would fake. Pure functions in `packages/shared` and `packages/ui` are tested beside their source as `*.test.ts`. Frontend tests cover the states that are easy to get wrong and invisible in a screenshot: `allowedActions` rendering, the dirty/clean `SaveBar`, empty vs. error vs. loading.

**Barrels.** One `index.ts` per package, none inside a package. Deep barrels break Metro's tree shaking and hide cycles.

**Where does a new thing go?**

| Adding | Goes in |
|---|---|
| A new column or table | `packages/types/src/schema/`, then a migration, then regenerate |
| A new endpoint | `services/backend/src/routes/` + a service function + `schemas/`, then `gen:contract` |
| Business logic | `services/backend/src/services/` — never a route handler |
| A component used twice, or shown in `/ui-library` | `packages/ui/src/` |
| A component used once, that knows about a page | `apps/dashboard/src/features/<page>/` |
| Logic both sides need | `packages/shared/src/` |
| A cross-cutting decision | `docs/adr/000N-<slug>.md` |
| A domain term | `CONTEXT.md` |
| A feature spec or ticket | `.scratch/<feature-slug>/` |
