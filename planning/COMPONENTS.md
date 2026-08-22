# Component Inventory

The design system is hand-built on React Native primitives — `View`, `Text`, `Pressable`, `TextInput`, `Modal`, `FlatList`, `ScrollView`, `Switch` — styled with `StyleSheet.create` over a typed token module. No third-party component library. See `../docs/adr/0002-react-native-primitives.md`.

Rendered to web through React Native Web, which is what turns `accessibilityRole` into real ARIA semantics and `Pressable`'s interaction state into hover/focus/active styling.

**Living documentation is the `/ui-library` route**, which renders every token, type style, surface, and component state below from the real components. This file is the inventory and intent; the route is the truth.

---

## Tokens — `packages/ui/tokens.ts`

One module, semantically named so a second theme is a swap rather than a rewrite. Light theme only.

| Group | Contents |
|---|---|
| Color | `surface` / `surfaceRaised` / `surfaceSunken`, `foreground` / `foregroundMuted` / `foregroundSubtle`, `border` / `borderStrong`, `accent` + `accentForeground`, and semantic `success` / `warning` / `danger` / `info`, each with a `-Surface` and `-Foreground` pair for badges and alerts |
| Typography | `display`, `heading`, `subheading`, `body`, `bodyStrong`, `caption`, `overline`, plus `data` and `kpi` — the two tabular-figure styles used for money, counts, and order numbers |
| Spacing | 4-based ramp: `0.5, 1, 2, 3, 4, 6, 8, 12, 16` → 2–64px |
| Radius | `sm`, `md`, `lg`, `pill` |
| Border | width scale + the `border` colors above |
| Shadow / elevation | `flat`, `raised`, `overlay` — RN `shadow*` on native, `boxShadow` via RNW on web |
| Layout | content max-width, sidebar width, one breakpoint, grid gutters |

Fonts load via `expo-font` in the root layout: one UI face, and a monospace used by the `data` and `kpi` styles.

---

## Shared primitives — `packages/ui`

A component belongs here when it is used on two or more surfaces, **or** when it is a general pattern the `/ui-library` route presents as part of the system. `KpiStat` and `ProgressBar` are the second kind — Home is their only consumer today, but neither knows anything about Home. The "Used by" column documents actual usage; it is not the inclusion test on its own.

| Component | Built on | Variants / states | Used by |
|---|---|---|---|
| `Button` | `Pressable` + `Text` | primary / secondary / ghost / danger; 32 & 40px; hover, focus, active, disabled, loading | every page |
| `IconButton` | `Pressable` | drawer close, dialog close, row actions | drawers, dialogs |
| `TextInput` | RN `TextInput` | default, focus, error, disabled, prefix/suffix adornment (`$`) | Menu, CRM, Orders, Settings |
| `TextArea` | RN `TextInput` multiline | kitchen notes, item descriptions | OrderCreateModal, MenuItemModal |
| `Select` | `Pressable` + `Modal` sheet | category, customer, day; empty, disabled, error | MenuItemModal, OrderCreateModal, Settings |
| `Switch` | RN `Switch` | availability, accepting orders, auto-accept | Menu, Settings |
| `Stepper` | `Pressable` ×2 + `Text` | value, min/max clamp, disabled at bounds | OrderCreateModal (quantity), Settings (prep time) |
| `SegmentedControl` | `Pressable` row | order status filter, menu category tabs, order channel; with and without counts | Orders, Menu, OrderCreateModal |
| `SearchField` | `TextInput` + icon | idle, typing, clearable | Orders, CRM, Menu |
| `Surface` | `View` | header / body / footer slots; `flat` and `raised` | every page |
| `DataTable` | `FlatList` + column defs | right-aligned numerics, hover row, selected row, sortable header, loading and empty slots; `accessibilityRole` on table/row/cell | Orders, CRM |
| `StatusBadge` | `View` + `Text` | one per `orderStatus`, plus availability and a `neutral` variant for customer preferences; reads by text, never color alone | Orders, Home, Menu, CRM |
| `Avatar` | `View` + `Text` | customer initials, sizes sm/md | CRM list and detail |
| `NavList` / `NavItem` | `Pressable` | default, hover, active, badge count | AppShell |
| `Dialog` | RN `Modal` | 480 form / 640 detail, footer actions, focus trap, escape to close | MenuItemModal, OrderCreateModal |
| `ConfirmDialog` | `Dialog` | destructive confirm with named consequence | delete item, delete category, cancel order |
| `DetailDrawer` | `Modal` + slide-in `View` | 420–460px right panel, route-driven, escape and backdrop close | OrderDetailDrawer, CustomerDetailDrawer |
| `Toast` | overlay portal + `Animated` | success, error; auto-dismiss; announced to assistive tech | every mutation |
| `InlineAlert` | `View` | success, warning, error, info | OpeningHoursCard (closed day), OrderDetailDrawer (terminal order), form-level errors |
| `Skeleton` | `Animated.View` | bar, KPI card, table row | Home, Orders, CRM, Menu |
| `EmptyState` | composition | title, body, one action | every list and table |
| `ErrorState` | composition | title, cause from `error.message`, retry | every query boundary |
| `KpiStat` | `Surface` + `Text` | label, value (`kpi` style), delta context line, up/down/flat | Home |
| `ProgressBar` | `View` | share-of-orders fill; always paired with its number | PopularItemsList |
| `FormRow` | `View` + label | label above, helper text, error text from `fields`, required marker | every form |
| `SaveBar` | `View` | clean / dirty, disabled save, saving | both settings cards |
| `AppShell` | Expo Router `_layout` | 240px sidebar ≥ breakpoint; top bar + overlay drawer below | all pages |
| `Text` | RN `Text` | the token type styles, including `data` and `kpi` tabular figures | everywhere |

`Slider` is deliberately **not** in this list. Prep time uses `Stepper`, which gives an exact minute value, is reachable by keyboard, and is a primitive two surfaces already need. A hand-built slider would be a third input pattern serving one field.

---

## Page compositions — `apps/dashboard`

One page each, assembled from the above.

| Composition | Page | Contents |
|---|---|---|
| `HomeKpiRow` | Home | three `KpiStat` — orders, revenue, pending — with yesterday deltas |
| `NeedsAttentionTable` | Home | `DataTable` + inline next-action `Button` rendered from the row's `allowedActions` |
| `PopularItemsList` | Home | rows with `ProgressBar` from `shareOfOrders` |
| `OrdersFilterBar` | Orders | `SegmentedControl` with live counts from `meta.statusCounts` + `SearchField` |
| `OrdersTable` | Orders | `DataTable` column defs; row press opens the detail route |
| `OrderDetailDrawer` | Orders (`/orders/[id]`) | items, mono totals, `kitchenNote`, timeline, action buttons from `allowedActions` |
| `OrderCreateModal` | Orders | customer `Select` with inline "+ New customer", channel `SegmentedControl`, item picker, `Stepper` cart, note |
| `MenuCategorySection` | Menu | item rows with availability `Switch` and edit; per-category `EmptyState` |
| `MenuItemModal` | Menu | validated create/edit form, delete → `ConfirmDialog` |
| `CustomersTable` | CRM | `DataTable` column defs with `Avatar` and mono spend |
| `CustomerDetailDrawer` | CRM (`/crm/[id]`) | stat trio, preferences as neutral `StatusBadge`s (**display only** — no customer edit endpoint exists), order history opening the order route |
| `ServiceSettingsCard` | Settings | accepting orders + auto-accept `Switch`es, prep-time `Stepper`, `SaveBar` |
| `OpeningHoursCard` | Settings | `FormRow` per day, closed-day `InlineAlert`, `SaveBar` |
| `ServiceStatusPill` | AppShell header | `StatusBadge` variant; derives open/closed from settings via the `packages/shared` util |
| UI library sections | `/ui-library` | `TokenGrid`, `TypeScaleTable`, `SpacingRamp`, `RadiusSamples`, `ElevationSamples`, `SurfaceSamples`, `GridStrip`, `ComponentGallery` |

---

## Conventions

**Routes vs. state.** Detail views are routes — `/orders/[id]` and `/crm/[id]` render a `DetailDrawer` over the list, so they are linkable and the back button closes them. Create and edit modals are local component state; a URL representing a half-filled form is worse than no URL.

**Data access.** `packages/ui` is pure presentation: its components take props and may never import `packages/api-client` or a generated hook. Page compositions call the generated hooks and own the query, mutation, and invalidation logic. Route files stay thin and delegate to compositions. The boundary is mechanically checkable — a `packages/ui` that imports nothing from `api-client` is a design system; one that does is just part of the app.

**Forms.** React Hook Form with `zodResolver`, fed by the drizzle-zod-derived schemas from the generated client — the same schemas the server validates against. Server `422` responses still populate `FormRow` errors through `error.fields`, because availability and cross-field hour rules are things the client cannot know.

**Interaction states.** `Pressable`'s render-prop state supplies pressed and hovered; focus comes from RNW's focus events. Every interactive primitive implements all four of hover, focus, active, and disabled.

**Accessibility.** `accessibilityRole` on tables, rows, cells, dialogs, and drawers. Labels bound through `FormRow`. Status never carried by color alone. Target is WCAG 2.1 AA, implemented structurally and not audited — see `PRODUCT.md`.

**One judgement call.** `ServiceStatusPill` is really a `StatusBadge` variant rather than its own component; it stays separate only because it derives its own state rather than receiving it.
