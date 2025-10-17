# Vendure Implementation Gaps & Workarounds

This document tracks known limitations and required manual steps when working with Vendure.

## Channel Provisioning Checklist

When creating a new Channel (customer company), manually provision:

1. ✅ **Stock Location** - At least one required for inventory
2. ✅ **Payment Method** - Required for sales
3. ✅ **Roles** - Required for user access
4. ✅ **Assign Users** - Link users to roles
5. ✅ **Permissions** - Ensure roles have necessary permissions

**See [Frontend Architecture](./frontend/ARCHITECTURE.md) for detailed multi-tenancy model.**

### Common Permission Issues

**Product Creation with Photos:**

- Requires: `CreateProduct`, `CreateProductVariant`, `CreateAsset`, `UpdateProduct`
- Symptom: Product created but photos fail with 403 error
- Solution: Assign `CreateAsset` and `UpdateProduct` permissions to user role

**Asset Management:**

- Requires: `CreateAsset`, `UpdateAsset`, `DeleteAsset`, `ReadAsset`
- Used for: Product photos, company logos, any uploaded files

**Debugging Permissions:**

1. Check user's assigned role(s) in Admin UI
2. Verify role has required permissions
3. Test with SuperAdmin account to confirm it's a permission issue
4. Enable verbose logging in browser console

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

## Product Creation - Current vs Future

### Current State (Frontend Direct Upload)

**What Works:**

- ✅ Product and variants created transactionally
- ✅ Photos uploaded directly from browser to admin-api
- ✅ Uses cookie-based authentication (no tokens needed)
- ✅ Simple implementation, no backend code required

**Points of Failure:**

1. **Network Issues**: Large photo uploads can fail on slow/unreliable connections
2. **Browser Timeouts**: Long uploads may timeout in browser
3. **No Retry Logic**: Failed uploads require manual retry
4. **Progress Tracking**: Limited feedback during upload

**Mitigation:**

- Product/variants are saved FIRST (Phase 1 - blocking)
- Photos uploaded AFTER (Phase 2 - non-blocking)
- If photos fail, product still exists (can add photos later)

### Future State (Backend Batch Processor)

**Architecture Plan:**

```
Frontend → Temp Storage → Backend Queue → Worker Process
                              ↓
                         Progress Updates
                              ↓
                         Retry Logic (3x)
                              ↓
                         Asset Creation
```

**Benefits:**

- Resilient to network failures
- Real-time progress updates via websocket
- Automatic retry on failure (3 attempts)
- No browser timeout limits
- Cleaner error recovery

**Implementation TODO:**

1. Add temp file storage endpoint (S3/local)
2. Implement Redis/BullMQ job queue
3. Create worker process for asset creation
4. Add websocket for progress updates
5. Update frontend to use new flow

**Priority:** Medium (current solution works, but not robust)
