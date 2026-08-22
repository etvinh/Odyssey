# Odyssey

Restaurant operations for a single independent restaurant: the orders it takes, the menu it sells from, the customers who return, and the service settings that govern them.

## Language

Avoided words govern **domain naming** — field names, endpoint paths, enum values, and UI copy. They do not govern the names of technical artifacts (`apps/dashboard`, a transition table, an HTTP client) or discussion of the software itself.


### Orders

**Order**:
What a customer asked for, priced and recorded when it was placed, and never edited afterwards.
_Avoid_: ticket, transaction

**Order Number**:
The human-facing identifier for an order, such as 1042. Distinct from its internal id.
_Avoid_: order id

**Order Item**:
One line on an order: a menu item, a quantity, and the name and price as they were when the order was placed.
_Avoid_: line item, cart item

**Snapshot**:
Copying a menu item's name and price onto an order item when the order is placed, so later menu changes never rewrite past orders.
_Avoid_: freeze

**Status**:
Where an order sits in its lifecycle: pending, confirmed, preparing, ready, completed, or cancelled.
_Avoid_: stage

**Action**:
A named request to move an order to its next status. Clients ask for actions; only the server decides whether one is legal, and which are available right now.
_Avoid_: transition, status update

**Terminal**:
A status an order can never leave. Completed and cancelled are terminal; there is no reopening.
_Avoid_: final, archived

**Order Event**:
A record that an order changed status, and when.
_Avoid_: history entry, audit trail

**Timeline**:
The ordered sequence of order events shown on an order.
_Avoid_: activity feed

**Kitchen Note**:
Free text attached to an order for whoever is cooking it — allergies, substitutions, timing.
_Avoid_: comment, special instructions, remarks

**Channel**:
How an order reached the restaurant: dine in, takeaway, or delivery.
_Avoid_: order type

**Walk-in**:
An order with no customer attached. An ordinary case, not missing data.
_Avoid_: anonymous order, guest order

### Menu

**Menu Category**:
A named grouping of menu items. Removed only when it holds no items.
_Avoid_: menu section

**Menu Item**:
Something a customer can order: a name, an optional description, a price, and a category. Removing one hides it everywhere while leaving past orders intact.
_Avoid_: dish, food item

**Availability**:
Whether a menu item can be ordered right now. Temporary and reversible, unlike removal.
_Avoid_: in stock, sold out

### Customers

**Customer**:
A person who has ordered. Named, optionally contactable, and never required for an order to exist.
_Avoid_: guest, patron, diner

**Preferences**:
Free-text notes a restaurant keeps about a customer, such as a favourite table or an allergy. Deliberately unstructured.
_Avoid_: tags, traits

**Derived Totals**:
A customer's order count, total spend, and last visit. Recomputed on every read, never stored, so they cannot fall out of step with the orders themselves.
_Avoid_: aggregate, rollup, stats

### Service

**Accepting Orders**:
The manual switch for whether the restaurant is taking orders at all, independent of opening hours.
_Avoid_: online, open toggle

**Auto-accept**:
When on, new orders arrive already confirmed rather than waiting for the manager to accept them.
_Avoid_: auto-confirm, instant accept

**Prep Time**:
How many minutes the restaurant expects to need between confirming an order and having it ready.
_Avoid_: lead time, ETA, cook time

**Opening Hours**:
When the restaurant is open, as one interval per day. A day with no interval is closed.
_Avoid_: schedule, trading hours

**Service Status**:
Whether the restaurant is open right now, worked out from accepting orders and the current time against opening hours. Never stored.
_Avoid_: open state, store status

### Home

**Summary**:
The state of the day at a glance: how many orders, how much taken, what is selling.
_Avoid_: overview, daily stats

**Needs Attention**:
Orders that are waiting on the manager rather than on the kitchen — those not yet accepted.
_Avoid_: queue, inbox, action items

**Popular Items**:
The menu items ordered most often over the past week, with each one's share of orders.
_Avoid_: top sellers, bestsellers, trending
