# Channel Registration Setup

## Overview

This document describes the automatic channel setup that occurs during business registration, including seller creation, zone configuration, and stock location linking.

## Registration Flow

When a new business is registered, the following entities are automatically created in order:

1. **Seller** - One seller per channel for isolation and future-proofing
2. **Channel** - Company workspace with proper configuration
3. **Stock Location** - Physical store location
4. **Payment Methods** - Cash and M-Pesa payment handlers
5. **Role** - Admin role with full permissions
6. **Administrator** - User account with role assignment

## Channel Configuration

### Seller Assignment

- **One seller per channel** - Each business gets its own isolated seller entity
- Seller name format: `"{companyName} Seller"`
- Provides proper separation of concerns and future-proofs for features that rely on seller-channel relationships

### Zone Configuration

- **Default Shipping Zone**: Africa zone (looked up by name "Africa")
- **Default Tax Zone**: Africa zone (same zone for both shipping and tax)

**Prerequisites:**
- An "Africa" zone must exist in the system before registration
- Zone can be created in Vendure admin: Settings → Zones

### Tax Settings

- **pricesIncludeTax**: `true` - All prices displayed include tax

### Stock Location Linking

- Stock location is automatically created during registration
- Location is automatically assigned to the channel via many-to-many relationship
- Assignment is verified after save to ensure proper linking

## Implementation Details

### Services

- **SellerProvisionerService** - Creates seller per channel
- **ChannelProvisionerService** - Creates channel with seller, zones, and tax settings
- **StoreProvisionerService** - Creates stock location and assigns to channel
- **ChannelAssignmentService** - Handles stock location to channel assignment

### Files Modified

- `backend/src/services/auth/provisioning/seller-provisioner.service.ts` - Seller creation
- `backend/src/services/auth/provisioning/channel-provisioner.service.ts` - Channel creation with all settings
- `backend/src/services/auth/provisioning/registration-validator.service.ts` - Africa zone lookup
- `backend/src/services/auth/provisioning/channel-assignment.service.ts` - Stock location assignment
- `backend/src/services/auth/registration.service.ts` - Orchestrates the flow
- `backend/src/plugins/auth/phone-auth.plugin.ts` - Service registration

## Known Issues

### Channel Visibility in Admin UI

**Issue**: When attempting to link a stock location to a channel in the Vendure admin UI, only one channel ("001 test") appears in the dropdown, despite multiple channels existing.

**Investigation Needed:**
- Check GraphQL queries that fetch channels for dropdowns
- Verify permissions/scoping that might filter channels
- Check if seller assignment affects channel visibility
- Review channel filtering logic in admin UI

**Possible Causes:**
- Channel filtering based on seller
- Permission-based filtering
- Query not including all channels
- Admin UI bug with channel listing

## Testing

See test suite in `backend/spec/services/auth/registration.service.spec.ts` (to be created) for:
- Seller creation per channel
- Africa zone assignment
- pricesIncludeTax = true
- Stock location linking
- Complete registration flow validation

