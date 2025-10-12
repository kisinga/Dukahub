# Vendure Implementation Gaps & Workarounds

This document tracks known limitations and required manual steps when working with Vendure.

## Channel Provisioning Checklist

When creating a new Channel (customer company), manually provision:

1. ✅ **Stock Location** - At least one required for inventory
2. ✅ **Payment Method** - Required for sales
3. ✅ **Roles** - Required for user access
4. ✅ **Assign Users** - Link users to roles

**See [Frontend Architecture](./frontend/ARCHITECTURE.md) for detailed multi-tenancy model.**

## Known Limitations

### User Permissions

- Users are scoped to Channels via Roles
- Stock Location permissions require custom implementation
- No native "shop-level" user scoping

### Stock Locations

- Not automatically created with Channels
- Must be manually provisioned for each new customer
- Cannot track inventory without at least one Stock Location

### Multi-Channel Management

- Each Channel requires separate payment method setup
- Roles must be created per Channel unless explicitly shared
- Users in shared roles can see all associated Channels
