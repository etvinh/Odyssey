# Database Schema

Every table in Odyssey, and the rules that live in the schema rather than in application code.

This is the **source of truth for the whole contract**: Drizzle schema → drizzle-zod → Hono/OpenAPI → Orval. A shape that isn't here doesn't exist in the API. See `API.md` for how these become endpoints, and `../CONTEXT.md` for what the terms mean.

Postgres. All ids are `uuid` with `gen_random_uuid()` defaults. All money is `integer` cents. All timestamps are `timestamptz`.

---

## Enums

Three Drizzle `pgEnum`s. These are the single source for both sides — re-exported through `packages/types`, never re-declared in the frontend.

```sql
order_status  = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
order_channel = 'dine_in' | 'takeaway' | 'delivery'
day_of_week   = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
```

---

## `menu_categories`

A named grouping of menu items.

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `name` | `text` | not null, unique |
| `sort_order` | `integer` | not null, default 0 |
| `created_at` | `timestamptz` | not null, default `now()` |
| `updated_at` | `timestamptz` | not null, default `now()` |

**Indexes:** `(sort_order, name)` for the ordered read.

**Notes.** Hard-deleted, unlike menu items — the `menu_items.category_id` foreign key is `RESTRICT`, which is what produces `409 CATEGORY_NOT_EMPTY`. That restriction counts **soft-deleted items too**: a category whose items were all soft-deleted still cannot be dropped, because those rows still hold the foreign key. That is deliberate, and it is the one place the soft-delete design is visible to a user.

`item_count` is **not a column** — it is counted per read.

---

## `menu_items`

Something a customer can order.

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `category_id` | `uuid` | not null, FK → `menu_categories.id` `ON DELETE RESTRICT` |
| `name` | `text` | not null |
| `description` | `text` | nullable |
| `price_cents` | `integer` | not null, `CHECK (price_cents >= 0)` |
| `is_available` | `boolean` | not null, default `true` |
| `deleted_at` | `timestamptz` | nullable — **soft delete** |
| `created_at` | `timestamptz` | not null, default `now()` |
| `updated_at` | `timestamptz` | not null, default `now()` |

**Indexes:** `(category_id)`; partial index `WHERE deleted_at IS NULL` for every list read.

**Notes.** Soft-deleted because `order_items.menu_item_id` references this table with `RESTRICT` — a hard delete would either fail or orphan history. Every list read filters `deleted_at IS NULL`; deleted items vanish from the API entirely but their rows survive so past orders stay intact.

`is_available` and `deleted_at` are different things: unavailable is temporary and reversible, deleted is neither.

---

## `customers`

A person who has ordered.

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `name` | `text` | not null |
| `phone` | `text` | nullable |
| `email` | `text` | nullable |
| `preferences` | `text[]` | not null, default `'{}'` |
| `created_at` | `timestamptz` | not null, default `now()` |
| `updated_at` | `timestamptz` | not null, default `now()` |

**Indexes:** trigram or `lower(name)` index for search.

**Notes.** No unique constraint on phone or email — a restaurant genuinely has two customers called the same thing with no contact details, and rejecting that at the database is worse than allowing it.

`preferences` is `text[]` rather than a join table on purpose: it is free text, not a taxonomy. There is no `PATCH /customers/{id}` in this build, so preferences are write-once at creation.

Rows are only ever inserted **inside the order-creation transaction** — there is no standalone customer-create endpoint — so a customer with zero orders is not a state this table can reach through the API.

**Derived totals are not columns here.** `order_count`, `total_spend_cents`, and `last_order_at` are computed per read from `orders`. Storing them would create counters that drift.

---

## `orders`

What a customer asked for, priced at the moment it was placed. Immutable after creation apart from `status`.

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `order_number` | `integer` | not null, unique, default `nextval('order_number_seq')` |
| `customer_id` | `uuid` | **nullable** — null is a walk-in. FK → `customers.id` `ON DELETE RESTRICT` |
| `channel` | `order_channel` | not null |
| `status` | `order_status` | not null, default `'pending'` |
| `kitchen_note` | `text` | nullable |
| `total_cents` | `integer` | not null, `CHECK (total_cents >= 0)` |
| `placed_at` | `timestamptz` | not null, default `now()` |
| `updated_at` | `timestamptz` | not null, default `now()` |

**Sequence:** `order_number_seq` starting at 1000, so the first order is `#1000`. Stored as `integer`, serialised to string at the API edge because it is a display identifier, not a number to do arithmetic on.

**Indexes:** unique `(order_number)`; `(status)`; `(placed_at DESC)` for the default sort; `(customer_id)` for the history read; a search index over `order_number` and the joined customer name.

**Notes.** `placed_at` is the domain timestamp and doubles as the creation timestamp — there is no separate `created_at`, because two columns holding the same instant is a lie waiting to diverge.

`status` is the only mutable column, and it is only ever written by the action handler, never by a generic update. See `ADR-0003`.

`customer_id` is `RESTRICT` rather than `SET NULL`: there is no customer delete endpoint, and silently converting a named order into a walk-in would falsify history.

**One money column, not two.** There is no `subtotal_cents`. With no tax, tip, discount, or delivery fee in scope, a subtotal would equal the total on every row — and two columns holding the same amount is the same lie as two columns holding the same instant. Adding tax later needs a migration whether or not the column exists today, so carrying it now buys nothing.

---

## `order_items`

One line on an order, with the menu item's name and price **snapshotted** at the moment of ordering.

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `order_id` | `uuid` | not null, FK → `orders.id` `ON DELETE CASCADE` |
| `menu_item_id` | `uuid` | not null, FK → `menu_items.id` `ON DELETE RESTRICT` |
| `name` | `text` | not null — snapshot |
| `unit_price_cents` | `integer` | not null, `CHECK (unit_price_cents >= 0)` — snapshot |
| `quantity` | `integer` | not null, `CHECK (quantity >= 1)` |
| `line_total_cents` | `integer` | not null |

**Indexes:** `(order_id)`; `(menu_item_id)` for the popular-items query.

**Notes.** `name` and `unit_price_cents` are copies, not joins. This is the entire reason menu items soft-delete rather than hard-delete, and the reason renaming a menu item next month does not rewrite last week's receipts.

`line_total_cents` is stored rather than computed so a historical line can never be re-derived from changed inputs. It equals `unit_price_cents * quantity` at write time and is never recalculated.

---

## `order_events`

Append-only record that an order changed status.

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `order_id` | `uuid` | not null, FK → `orders.id` `ON DELETE CASCADE` |
| `status` | `order_status` | not null — the status moved *into* |
| `changed_at` | `timestamptz` | not null, default `now()` |

**Indexes:** `(order_id, changed_at)`.

**Notes.** Append-only: no updates, no deletes. Creating an order writes the first row (`pending`, or `confirmed` when auto-accept is on). Every accepted action writes one more. This is what the order detail timeline reads.

Records only *that* a status changed, not who changed it — there are no user accounts in this build.

---

## `settings`

Singleton. Exactly one row, forever.

| Column | Type | Constraints |
|---|---|---|
| `id` | `integer` | PK, default 1, `CHECK (id = 1)` |
| `is_accepting_orders` | `boolean` | not null, default `true` |
| `is_auto_accepting` | `boolean` | not null, default `false` |
| `prep_time_minutes` | `integer` | not null, default 20, `CHECK (prep_time_minutes BETWEEN 5 AND 120)` |
| `updated_at` | `timestamptz` | not null, default `now()` |

**Notes.** The `CHECK (id = 1)` is what makes it a singleton at the database level rather than by convention. Seeded with `is_auto_accepting = false`, so orders arrive as `pending` and Home's pending KPI and needs-attention list are populated.

The `5..120` range is enforced here as well as in the request schema, so the constraint survives anything that writes directly.

**Service status is not a column.** Open or closed is derived from `is_accepting_orders` plus the current time against `opening_hours`, in a shared util. Storing it would guarantee it goes stale.

---

## `opening_hours`

One row per day of the week. Seven rows, forever.

| Column | Type | Constraints |
|---|---|---|
| `day` | `day_of_week` | PK |
| `opens_at` | `time` | nullable |
| `closes_at` | `time` | nullable |

**Constraints:**

```sql
CHECK ((opens_at IS NULL) = (closes_at IS NULL))   -- both set, or both null
CHECK (opens_at IS NULL OR opens_at < closes_at)   -- no cross-midnight
```

**Notes.** A null pair means closed that day; the paired check stops half-set rows existing at all.

The `opens_at < closes_at` check is the scope cut made visible: a restaurant open 18:00–01:00 cannot be represented, and neither can split lunch/dinner service, because there is one row per day rather than one row per interval. Both are recorded in the tradeoffs note. Lifting the first means dropping the check and handling wraparound in the derivation util; lifting the second means making this table `(day, opens_at, closes_at)` with a composite key and no `day` uniqueness.

A separate table rather than JSONB on `settings` so drizzle-zod derives real per-field validation, which is what lets `422` errors key to a specific day.

---

## What is deliberately *not* stored

Every one of these is computed per read. Storing any of them creates a value that can disagree with the rows it summarises.

| Value | Derived from |
|---|---|
| `allowedActions` | `orders.status` against the transition table |
| Service status (open/closed) | `settings` + `opening_hours` + current time |
| Customer `orderCount`, `totalSpendCents`, `lastOrderAt` | `orders` grouped by `customer_id` |
| Order `itemCount` | `count(order_items)` |
| Category `itemCount` | `count(menu_items WHERE deleted_at IS NULL)` |
| `meta.statusCounts` | `orders` grouped by `status` |
| Summary today / yesterday figures | `orders` filtered by `placed_at` |
| `popularItems`, `shareOfOrders` | `order_items` joined to `orders` over a 7-day window |

---

## Relationships

```text
menu_categories 1──n menu_items
menu_items      1──n order_items        (RESTRICT — the reason for soft delete)
customers       0/1──n orders           (null customer_id = walk-in)
orders          1──n order_items        (CASCADE)
orders          1──n order_events       (CASCADE, append-only)
settings        ── singleton, unrelated to opening_hours by FK
opening_hours   ── seven fixed rows
```

---

## Seed

`pnpm seed` truncates and repopulates; `pnpm seed:reset` drops and re-migrates first. Synthetic data, generated deterministically from a fixed random seed so two reviewers see the same numbers.

- ~6 categories, ~40 menu items, a handful marked unavailable, **at least one empty category** so the per-category empty state is reachable
- ~25 customers, most with preferences, some with no phone or email
- ~150 orders backdated across 14 days with a realistic status spread, including **at least one cancelled order** and **at least one walk-in** with a null `customer_id`
- `order_events` written for every status an order actually passed through, not just its current one, so timelines have depth
- settings at defaults, `is_auto_accepting = false`, opening hours set with **one closed day**
