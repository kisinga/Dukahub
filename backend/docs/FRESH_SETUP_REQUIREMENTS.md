# Fresh Setup Requirements

This document outlines the required database state for a fresh Dukarun installation to support user registration and core functionality.

## 1. Zones & Countries

Registration requires a specific zone for setting default shipping and tax configurations for new channels.

- **Country**: Kenya (`KE`)
- **Zone**: "Kenya"
- **Zone Members**: Kenya (`KE`) must be a member of the "Kenya" zone.

## 2. Tax Configuration

A default tax structure is required for accurate pricing and tax calculations.

- **Tax Category**: "Standard Tax"
- **Tax Rate**: "Kenya VAT" (16%)
  - **Category**: Standard Tax
  - **Zone**: Kenya
  - **Value**: 16%

## 3. Default Channel

The default channel serves as the template for creating new channels during registration.

- **Default Shipping Zone**: Must be set to "Kenya".
- **Default Tax Zone**: Must be set to "Kenya".
- **Default Currency**: Must be set to `KES` (Kenya Shilling).
- **Currency Code**: Must be set to `KES`.

## Automatic Seeding

These requirements are automatically provisioned during bootstrap by the Kenya seeding utility
(`ensureKenyaContext`) which reuses Vendure's official `Populator` flow.

> **Bootstrap safeguard:** `initializeVendureBootstrap()` verifies Vendure core tables before
> running migrations. Once migrations finish, `ensureKenyaContext` bootstraps a lightweight
> Vendure instance, seeds the Kenya country/zone/tax configuration via Vendure services, and
> updates the default channel currency to `KES`.

If seeding needs to be skipped (e.g., for alternative regions), set `AUTO_SEED_KENYA=false` in the
environment and create the required entities manually.

## Validation

The `RegistrationValidatorService` checks for these requirements before allowing a new user to register:

- `getKenyaZone()` ensures the "Kenya" zone exists.
- `validateDefaultZones()` ensures the default channel has shipping and tax zones configured.
