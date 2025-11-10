# Refactor Channel Settings Architecture

## Overview

Simplify settings flow by using `GET_ACTIVE_CHANNEL` as the single source of truth for reading custom fields, while backend provides focused mutations for updates with partial field support, validation, and side effects.

## Architecture Changes

### Frontend Changes

**1. Remove Redundant GraphQL Operations**

- Remove `GET_CHANNEL_SETTINGS` query from `operations.graphql.ts`
- Remove `GET_CHANNEL_ADMINISTRATORS` query (use standard Vendure admin queries)
- Remove `GET_CHANNEL_PAYMENT_METHODS` query (use standard Vendure queries)
- Keep only mutation operations: `UPDATE_CHANNEL_SETTINGS`, `INVITE_CHANNEL_ADMINISTRATOR`, `CREATE_CHANNEL_PAYMENT_METHOD`, `UPDATE_CHANNEL_PAYMENT_METHOD`

**2. Refactor SettingsService** (`frontend/src/app/core/services/settings.service.ts`)

- Remove `getChannelSettings()` - use `CompanyService.activeChannelDataSignal` instead
- Remove `getChannelAdministrators()` - fetch directly via standard admin queries
- Remove `getChannelPaymentMethods()` - fetch directly via standard admin queries
- Keep mutation methods: `updateChannelSettings()`, `inviteAdministrator()`, `createPaymentMethod()`, `updatePaymentMethod()`
- Add computed signals that derive from `CompanyService`:
  - `channelSettings = computed(() => companyService.activeChannelData()?.customFields)`
  - `cashierFlowEnabled = computed(() => companyService.cashierFlowEnabled())`
  - `cashierOpen = computed(() => companyService.cashierOpen())`
  - `companyLogoAsset = computed(() => companyService.companyLogoAsset())`

**3. Update Settings Components**

- Update any components using `settingsService.channelSettings()` to use computed values
- Update components to fetch administrators/payment methods via Apollo directly with standard queries
- Ensure all mutations trigger `companyService.fetchActiveChannel()` to refresh data

### Backend Changes

**4. Simplify ChannelSettingsService** (`backend/src/plugins/channel-settings.service.ts`)

- **REMOVE** `getChannelSettings()` method entirely - frontend uses `GET_ACTIVE_CHANNEL` instead
- **KEEP** `updateChannelSettings()` but enhance it:
  - Accept partial updates (null/undefined fields are ignored)
  - Add validation logic (e.g., business rules)
  - Add side effects (e.g., logging, notifications, webhooks)
  - Return updated settings after mutation
- **KEEP** administrator and payment method operations (these have side effects)
- Add proper TypeScript interfaces for input validation

**5. Update ChannelSettingsResolver** (`backend/src/plugins/channel-settings.resolver.ts`)

- **REMOVE** `getChannelSettings` query - no longer needed
- **REMOVE** `getChannelAdministrators` query - use standard Vendure admin API
- **REMOVE** `getChannelPaymentMethods` query - use standard Vendure admin API
- **KEEP** all mutation resolvers
- Update GraphQL schema to remove unused queries
- Ensure mutations handle partial updates properly

**6. Enhance updateChannelSettings Mutation**

- Support partial updates (only update provided fields)
- Add input validation
- Add business logic:
  - Validate `cashierFlowEnabled` and `cashierOpen` combinations
  - Validate logo asset exists before assignment
  - Log setting changes for audit trail
- Trigger any necessary side effects:
  - Broadcast cashier status changes to connected clients (future: WebSocket)
  - Update related entities if needed
- Return complete updated settings

### Data Flow (New)

**Read Flow:**

```
Frontend Component
  → CompanyService.activeChannelDataSignal (computed)
  → GET_ACTIVE_CHANNEL query (already cached)
  → All custom fields available instantly
```

**Write Flow:**

```
Frontend Component
  → SettingsService.updateChannelSettings(partialInput)
  → UPDATE_CHANNEL_SETTINGS mutation
  → Backend validates + applies updates + handles side effects
  → Backend returns updated settings
  → Frontend calls companyService.fetchActiveChannel()
  → GET_ACTIVE_CHANNEL refreshes cache
  → All components react to updated data
```

## Files to Modify

### Frontend

- `frontend/src/app/core/graphql/operations.graphql.ts` - Remove redundant queries
- `frontend/src/app/core/services/settings.service.ts` - Refactor to use CompanyService data
- Settings UI components (if any exist) - Update to use new flow

### Backend

- `backend/src/plugins/channel-settings.service.ts` - Remove getChannelSettings, enhance update logic
- `backend/src/plugins/channel-settings.resolver.ts` - Remove query resolvers, keep mutations
- `backend/src/plugins/channel-settings.resolver.ts` - Update GraphQL schema

## Benefits

1. **Single Source of Truth**: All reads come from `GET_ACTIVE_CHANNEL`
2. **No Duplicate Logic**: Backend doesn't re-fetch what's already in channel custom fields
3. **Cleaner API**: Fewer GraphQL operations to maintain
4. **Better UX**: Instant data from cached `GET_ACTIVE_CHANNEL`
5. **Proper Separation**: Backend focuses on mutations with business logic, not data retrieval
6. **Partial Updates**: Only send changed fields (standard GraphQL pattern)
7. **Extensibility**: Easy to add validation and side effects in backend mutations
