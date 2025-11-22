<!-- f5828716-9a83-457f-b58e-a52a4eafa526 2aa4dd22-140b-4eac-a5c9-6304dedf4b15 -->
# Vendure Native Kenya Seed Plan

## Goal

Ensure the Kenya defaults (country, zone, tax config, default channel currency) are created using Vendure services rather than raw SQL so the logic stays aligned with official sample-data tooling.

## Steps

1. **Study Vendure populate helper**  

- Inspect `@vendure/core/cli/populate` and `@vendure/create/assets/initial-data.json` to understand how Vendure seeds countries/zones/taxes.  
- Identify which services (e.g., `TaxCategoryService`, `ChannelService`, `TransactionalConnection`) are used so we can call them directly.

2. **Add seeding utility** (`backend/src/utils/kenya-context.seed.ts`)  

- Bootstrap a lightweight Nest container (reuse existing config) and obtain required services via `requestContext`/`Injector`.  
- Implement idempotent logic: ensure Kenya country/region exists, create Kenya zone, ensure tax category/rate, update default channel currency/zone.  
- Follow the patterns seen in Vendure’s populate script (use services rather than raw SQL, wrap in a transaction or use `TransactionalConnection` with a `RequestContext`).

3. **Invoke seeder during bootstrap**  

- After `runMigrations` succeeds in `initializeVendureBootstrap`, call the new seeder (guarded by an env flag, e.g., `AUTO_SEED_KENYA=true`, and skip once `Kenya` exists).  
- Log outcomes so operators know the seeding ran (or skipped).

4. **Remove/disable old SQL migration**  

- Delete or mark `9000000000001-SeedKenyaContext.ts` as deprecated to avoid conflicts, since seeding now happens via Vendure APIs.  
- Update documentation (e.g., `docs/FRESH_SETUP_REQUIREMENTS.md`) explaining the new mechanism and any env flag required.

5. **Test end-to-end**  

- On a fresh database, run the bootstrap flow to confirm Kenya context is created.  
- Spot-check critical tables (`region`, `zone`, `tax_rate`, `channel`) to ensure expected values exist.  
- Document verification commands in troubleshooting docs.