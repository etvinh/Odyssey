# Postgres over cloudflare:sockets against local Docker

Cloudflare Workers run in `workerd`, which has no Node `net` module, so the conventional Postgres driver path does not work. We connect through `postgres.js` behind `drizzle-orm/postgres-js` over `cloudflare:sockets` with `nodejs_compat`, against a Postgres the reviewer runs in Docker Compose. The alternatives — Neon's HTTP driver, or Hyperdrive in front of a hosted database — both trade a good local-run story for a deploy story nobody asked for; the deliverables want a repository that runs locally, not a live URL.

## Consequences

There are two connection paths to one database. The Worker reaches Postgres over `cloudflare:sockets`; drizzle-kit migrations and the seed script reach it as ordinary Node processes over TCP. One `DATABASE_URL`, two transports. This looks like an inconsistency and is not one — `workerd` and Node genuinely need different drivers.

Deploying is therefore not free. A deployed Worker cannot reach a database on someone's localhost, so shipping this would mean Hyperdrive or a switch to Neon's HTTP client. Both are contained changes at one module boundary, but neither is nothing.
