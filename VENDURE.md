# Vendure Setup & Configuration Guide

This comprehensive guide covers Vendure setup, asset management, migrations, and company provisioning.

## Table of Contents

1. [System Setup & Company Provisioning](#system-setup--company-provisioning)
2. [Asset Management & Migration](#asset-management--migration)
3. [Asset Selector Configuration](#asset-selector-configuration)
4. [Channel Asset Fields Refactoring](#channel-asset-fields-refactoring)
5. [Known Limitations](#known-limitations)
6. [Product Creation Workflow](#product-creation-workflow)

## System Setup & Company Provisioning

### Phase 1: Initial System Setup (One-Time)

**Prerequisites:**

- PostgreSQL running
- Backend started
- Migrations auto-run on startup (`migrationsRun: true` in config)

**Steps (via Vendure Admin UI - http://localhost:3002/admin):**

1. **Tax Configuration** (Required - all prices tax-inclusive)

   - Navigate: Settings → Zones
   - Create: Zone for your country/region
   - Navigate: Settings → Tax Categories
   - Create: "Standard Tax" category
   - Navigate: Settings → Tax Rates
   - Create: Tax rate (e.g., "VAT 0%" or appropriate rate)
   - Set: "Tax included in price" = YES
   - Assign: Tax rate to zone
   - **Note:** Complex tax systems NOT yet supported. All prices are tax-inclusive.

### Phase 2: Company Provisioning (Per Customer/Tenant)

**Complete ALL steps for each new company. Missing any step will break order creation.**

#### Step 1: Create Channel

- Navigate: Settings → Channels
- Click: "Create new channel"
- Fill:
  - **Name:** Company name (e.g., "Downtown Groceries")
  - **Code/Token:** Lowercase, no spaces (e.g., "downtown-groceries")
  - **Currency:** Default currency
- Save channel
- **Note:** Copy channel ID for reference

#### Step 2: Create Stock Location

- Navigate: Settings → Stock Locations
- Click: "Create new stock location"
- Fill:
  - **Name:** "{Company Name} - Main Store" (e.g., "Downtown Groceries - Main Store")
  - **Description:** Optional
- Assign: Channel from Step 1
- Save location

**Why this matters:** Orders CANNOT be created without a stock location. Vendure uses it for inventory allocation. The system will automatically use the first stock location assigned to the channel.

#### Step 3: Create Payment Methods

- Navigate: Settings → Payment Methods
- Create **Cash Payment:**
  - Name: "Cash Payment"
  - Code: Auto-generated
  - Handler: Select `cash-payment` from dropdown
  - Enabled: YES
  - Channels: Assign the channel from Step 1
  - Save
- Create **M-Pesa Payment:**
  - Name: "M-Pesa Payment"
  - Code: Auto-generated
  - Handler: Select `mpesa-payment` from dropdown
  - Enabled: YES
  - Channels: Assign the channel from Step 1
  - Save

**Why this matters:** No payment methods = no checkout options in POS.

#### Step 4: Create Admin Role

- Navigate: Settings → Roles
- Click: "Create new role"
- Fill:
  - **Name:** "{Company Name} Admin" (e.g., "Downtown Groceries Admin")
  - **Description:** "Full admin access for {Company Name}"
  - **Channels:** Select the channel from Step 1
- Permissions: Select ALL for these entities:
  - **Asset:** CreateAsset, ReadAsset, UpdateAsset, DeleteAsset
  - **Catalog:** CreateCatalog, ReadCatalog, UpdateCatalog, DeleteCatalog
  - **Customer:** CreateCustomer, ReadCustomer, UpdateCustomer, DeleteCustomer
  - **Order:** CreateOrder, ReadOrder, UpdateOrder, DeleteOrder
  - **Product:** CreateProduct, ReadProduct, UpdateProduct, DeleteProduct
  - **ProductVariant:** CreateProductVariant, ReadProductVariant, UpdateProductVariant, DeleteProductVariant
  - **StockLocation:** CreateStockLocation, ReadStockLocation, UpdateStockLocation
  - **Payment:** CreatePayment, ReadPayment, UpdatePayment, SettlePayment
  - **Fulfillment:** CreateFulfillment, ReadFulfillment, UpdateFulfillment
- Save role

**Permission Notes:**

- Asset permissions REQUIRED for product photo uploads (CreateAsset, UpdateAsset)
- Payment permissions REQUIRED for checkout flow (CreatePayment, SettlePayment)
- Missing permissions = 403 errors in frontend

#### Step 5: Create Admin User

- Navigate: Settings → Administrators
- Click: "Create new administrator"
- Fill:
  - **Email:** admin@{company-domain}.com
  - **First name:** Admin first name
  - **Last name:** Admin last name
  - **Password:** Generate strong password
- Assign: Role from Step 4
- Save user
- **IMPORTANT:** Send credentials to company admin securely (do NOT send via email unencrypted)

#### Step 6: Verification Checklist

Before handing off to customer, verify:

- [ ] Channel exists and is active
- [ ] Stock location created and assigned to channel (first location will be used for orders)
- [ ] Payment methods (Cash + M-Pesa) created and assigned to channel
- [ ] Admin role created with all required permissions
- [ ] Admin user created and assigned to role
- [ ] Test login: Admin can access frontend with their credentials
- [ ] Test visibility: Admin sees ONLY their channel's data

### Common Setup Issues

**Product photos fail (403 Forbidden):**

- **Cause:** Missing Asset permissions on role
- **Solution:** Edit role → Add CreateAsset, ReadAsset, UpdateAsset permissions → Save

**Orders fail to create:**

- **Cause:** No stock location assigned to channel
- **Solution:** Complete Step 2, ensure at least one stock location is assigned to the channel

**No payment methods at checkout:**

- **Cause:** Payment methods not assigned to channel
- **Solution:** Edit payment methods → Ensure channel is selected in "Channels" field

**Admin sees all companies (not just theirs):**

- **Cause:** Role not scoped to channel
- **Solution:** Edit role → Ensure channel is selected in "Channels" field

**User cannot login to frontend:**

- **Cause:** User not assigned to any role, or role not assigned to channel
- **Solution:** Edit user → Assign role → Ensure role is channel-scoped

## Asset Management & Migration

### Asset Relationship Custom Fields Migration

This migration completely replaces string-based asset ID custom fields with proper Asset entity relationships. It works for both fresh installations and existing setups.

#### Migration Strategy

**For Fresh Installations:**

- Creates clean Asset relationship columns
- No data migration needed
- Ready for immediate use

**For Existing Installations:**

- Safely drops all existing asset-related columns
- Removes all foreign key constraints
- Creates clean Asset relationship columns
- **Note**: Existing asset ID data will be lost (by design)

#### What Gets Migrated

**Channel Custom Fields:**

- `mlModelJsonAsset` → Asset relationship
- `mlModelBinAsset` → Asset relationship
- `mlMetadataAsset` → Asset relationship
- `companyLogoAsset` → Asset relationship

**PaymentMethod Custom Fields:**

- `imageAsset` → Asset relationship

#### Database Changes

**Columns Created:**

```sql
-- Channel table
ALTER TABLE "channel" ADD COLUMN "customFieldsMlmodeljsonassetid" integer;
ALTER TABLE "channel" ADD COLUMN "customFieldsMlmodelbinassetid" integer;
ALTER TABLE "channel" ADD COLUMN "customFieldsMlmetadataassetid" integer;
ALTER TABLE "channel" ADD COLUMN "customFieldsCompanylogoassetid" integer;

-- PaymentMethod table
ALTER TABLE "payment_method" ADD COLUMN "customFieldsImageassetid" integer;
```

**Foreign Key Constraints:**

```sql
-- Channel constraints
FK_209b14074b96d505fce431f7841: customFieldsMlmodeljsonassetid → asset(id)
FK_30369133482d7e7f8759cb833e5: customFieldsMlmodelbinassetid → asset(id)
FK_8e0c8b4ebd7bbc9eee0aeb1db25: customFieldsMlmetadataassetid → asset(id)
FK_33e2e4ec9896bb0edf7bdab0cbc: customFieldsCompanylogoassetid → asset(id)

-- PaymentMethod constraint
FK_d8b49b563010113ffef086b8809: customFieldsImageassetid → asset(id)
```

#### How to Use

**1. Run Migration:**

```bash
cd backend
npm run build
npm run migration:run
```

**2. Start Backend:**

```bash
npm run dev:server
```

**3. Access Admin UI:**

- URL: http://localhost:3000/admin
- Navigate to Settings → Channels
- Edit any channel to see the new Asset relationship fields

**4. Manage Assets:**

- **ML Model tab**: Select assets for JSON, weights, and metadata files
- **Branding tab**: Select company logo asset
- **Payment Methods**: Go to Settings → Payment Methods to manage payment method images

#### Benefits

**For Developers:**

- **Type Safety**: Full TypeScript support with Asset entities
- **Performance**: Single query with nested Asset objects
- **Data Integrity**: Foreign key constraints ensure referential integrity

**For Users:**

- **User-Friendly**: Built-in Vendure Admin UI asset selectors
- **Visual Management**: See asset previews and metadata
- **Easy Upload**: Direct asset upload through Admin UI

#### GraphQL Schema Changes

**Before (String IDs):**

```graphql
type ChannelCustomFields {
  mlModelJsonId: String
  mlModelBinId: String
  mlMetadataId: String
  companyLogoId: String
}
```

**After (Asset Relationships):**

```graphql
type ChannelCustomFields {
  mlModelJsonAsset: Asset
  mlModelBinAsset: Asset
  mlMetadataAsset: Asset
  companyLogoAsset: Asset
}
```

#### Frontend Integration

The frontend needs to be updated to work with Asset objects instead of string IDs:

```typescript
// Before
const logoId = channel.customFields.companyLogoId;
const logoUrl = `/assets/${logoId}`;

// After
const logoAsset = channel.customFields.companyLogoAsset;
const logoUrl = logoAsset?.source ? `/assets/${logoAsset.source}` : null;
```

#### Rollback

**⚠️ WARNING**: This migration is NOT reversible. Once applied, you cannot rollback to string-based custom fields.

#### Troubleshooting

**Schema Mismatch Errors:**
If you see schema mismatch errors, ensure all previous migrations have been applied:

```bash
npm run migration:run
```

**Port Already in Use:**
If port 3000 is already in use:

```bash
pkill -f "ts-node.*index"
npm run dev:server
```

**Admin UI Not Loading:**
Ensure the backend is running and accessible at http://localhost:3000/admin

## Asset Selector Configuration

### Problem Solved

The default Vendure Admin UI asset selector only shows images by default, which prevents users from selecting ML model files (.bin, .json) for the ML model custom fields.

### Solution

Configured custom asset selectors with specific file type restrictions for each ML model field:

#### ML Model JSON Asset

- **File Types**: `.json` files
- **MIME Types**: `application/json`, `text/json`
- **Use Case**: TensorFlow.js model.json files

#### ML Model Weights Asset

- **File Types**: `.bin` files
- **MIME Types**: `application/octet-stream`, `application/binary`
- **Use Case**: TensorFlow.js weights.bin files

#### ML Metadata Asset

- **File Types**: `.json` files
- **MIME Types**: `application/json`, `text/json`
- **Use Case**: Custom metadata.json files

#### Company Logo Asset

- **File Types**: Image files
- **MIME Types**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`
- **Use Case**: Company branding images

#### Payment Method Image Asset

- **File Types**: Image files
- **MIME Types**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`
- **Use Case**: Payment method logos/icons

### Configuration Details

**Custom Field UI Configuration:**

```typescript
ui: {
    tab: 'ML Model',
    component: 'asset-selector',
    props: {
        acceptedFileTypes: ['application/json', 'text/json', '.json'],
        multiple: false
    }
}
```

**Key Properties:**

- **`component: 'asset-selector'`**: Uses Vendure's built-in asset selector
- **`acceptedFileTypes`**: Array of MIME types and file extensions
- **`multiple: false`**: Single file selection only
- **`tab`**: Groups fields in Admin UI tabs

### How It Works

1. **Admin UI Integration**: The asset selector appears in the Vendure Admin UI
2. **File Type Filtering**: Only files matching the specified MIME types are shown
3. **Upload Support**: Users can upload new files directly through the selector
4. **Existing Assets**: Users can select from previously uploaded assets
5. **Preview Support**: File previews are shown where applicable

### User Experience

**For ML Model Files:**

- Navigate to Settings → Channels
- Edit any channel
- Go to "ML Model" tab
- Each field shows only relevant file types:
  - **ML Model JSON Asset**: Shows only .json files
  - **ML Model Weights Asset**: Shows only .bin files
  - **ML Metadata Asset**: Shows only .json files

**For Image Assets:**

- **Company Logo**: Shows only image files in "Branding" tab
- **Payment Method Images**: Shows only image files in "Display" tab

### Technical Benefits

1. **Type Safety**: Prevents wrong file types from being selected
2. **User Experience**: Clear file type restrictions reduce confusion
3. **Data Integrity**: Ensures ML models have correct file types
4. **Performance**: Faster asset loading with filtered results
5. **Maintainability**: Clear configuration makes it easy to modify

### File Upload Process

1. **Upload New File**: Click "Upload" in asset selector
2. **File Type Validation**: Only accepted file types can be uploaded
3. **Asset Creation**: File is processed and stored as Vendure Asset
4. **Relationship Creation**: Asset is linked to the custom field
5. **Immediate Availability**: Asset is immediately available for selection

### Troubleshooting

**Asset Selector Not Showing Files:**

- Check file MIME type matches configuration
- Ensure file was uploaded through Vendure (not directly to filesystem)
- Verify asset is not deleted or corrupted

**Wrong File Types Showing:**

- Verify `acceptedFileTypes` configuration
- Check file MIME type detection
- Restart backend after configuration changes

**Upload Failures:**

- Check file size limits in Vendure configuration
- Verify file permissions
- Check disk space availability

## Channel Asset Fields Refactoring

### Overview

This document outlines the **immediate, breaking change** refactoring of Vendure channel custom fields from string-based asset IDs to proper Asset entity relationships. This change eliminates the need for secondary URL resolution queries and improves performance, data integrity, and maintainability.

**⚠️ IMPORTANT: This is a breaking change with no backward compatibility.**

### Architecture Changes

#### Before (String-based Asset IDs)

```typescript
// Channel custom fields
customFields: {
  mlModelJsonId: string | null;     // Asset ID string
  mlModelBinId: string | null;      // Asset ID string
  mlMetadataId: string | null;       // Asset ID string
  companyLogoId: string | null;     // Asset ID string
}

// Frontend usage (required secondary query)
const assetIds = companyService.mlModelAssetIds();
const assets = await apollo.query({
  query: GET_ML_MODEL_ASSETS,
  variables: { ids: [assetIds.mlModelJsonId, ...] }
});
const modelUrl = `/assets/${assets[0].source}`;
```

#### After (Direct Asset Relationships)

```typescript
// Channel custom fields
customFields: {
  mlModelJsonAsset: Asset | null; // Direct Asset entity
  mlModelBinAsset: Asset | null; // Direct Asset entity
  mlMetadataAsset: Asset | null; // Direct Asset entity
  companyLogoAsset: Asset | null; // Direct Asset entity
}

// Frontend usage (no secondary query needed)
const mlModelAssets = companyService.mlModelAssets();
const modelUrl = `/assets/${mlModelAssets.mlModelJsonAsset.source}`;
```

### Benefits

#### 1. Performance Improvements

- **Eliminates secondary queries**: No more `GET_ML_MODEL_ASSETS` query needed
- **Single query efficiency**: All asset data fetched with channel data
- **Reduced network requests**: From 2 queries to 1 query per channel load

#### 2. Data Integrity

- **Foreign key constraints**: Database-level relationship integrity
- **Cascade deletion**: Assets properly cleaned up when channels are deleted
- **Type safety**: GraphQL schema enforces Asset entity structure

#### 3. Developer Experience

- **Simplified code**: Direct access to Asset objects with source URLs
- **Better error handling**: Clear relationship failures vs. missing assets
- **Proxy compatibility**: Built-in URL handling for development/production environments

#### 4. Maintainability

- **Single source of truth**: Asset relationships managed by Vendure
- **Consistent patterns**: All asset references follow same relationship pattern
- **Future-proof**: Easy to add new asset relationships

### Implementation Details

#### 1. Database Migration (IMMEDIATE - NO ROLLBACK)

**File**: `backend/src/migrations/1760580000000-ConvertChannelAssetFieldsToRelationships.ts`

- **IMMEDIATE DROP**: Removes old string asset ID columns immediately
- Converts existing string asset ID columns to Asset relationship columns
- Migrates data by finding Asset entities by their string IDs
- Adds foreign key constraints for data integrity
- **NO ROLLBACK SUPPORT**: This is a breaking change

#### 2. Vendure Configuration

**File**: `backend/src/vendure-config.ts`

```typescript
// OLD: String-based custom fields
{
  name: 'mlModelJsonId',
  type: 'string',
  // ...
}

// NEW: Asset relationship custom fields
{
  name: 'mlModelJsonAsset',
  type: 'relation',
  entity: 'Asset',
  // ...
}
```

#### 3. GraphQL Schema Updates

**File**: `frontend/src/app/core/graphql/operations.graphql.ts`

```graphql
# OLD: String IDs requiring secondary queries
customFields {
  mlModelJsonId
  mlModelBinId
  mlMetadataId
  companyLogoId
}

# NEW: Direct Asset objects with source URLs
customFields {
  mlModelJsonAsset {
    id
    source
    name
  }
  mlModelBinAsset {
    id
    source
    name
  }
  mlMetadataAsset {
    id
    source
    name
  }
  companyLogoAsset {
    id
    source
    name
    preview
  }
}
```

#### 4. Frontend Service Updates

**CompanyService:**

```typescript
// OLD: String asset IDs
readonly mlModelAssetIds = computed(() => {
  const customFields = channelData?.customFields;
  return {
    mlModelJsonId: customFields?.mlModelJsonId,
    mlModelBinId: customFields?.mlModelBinId,
    mlMetadataId: customFields?.mlMetadataId,
  };
});

// NEW: Direct Asset objects
readonly mlModelAssets = computed(() => {
  const customFields = channelData?.customFields;
  return {
    mlModelJsonAsset: customFields?.mlModelJsonAsset,
    mlModelBinAsset: customFields?.mlModelBinAsset,
    mlMetadataAsset: customFields?.mlMetadataAsset,
  };
});
```

**ML Model Service:**

```typescript
// OLD: Secondary query required
const assetIds = this.companyService.mlModelAssetIds();
const assets = await client.query({ query: GET_ML_MODEL_ASSETS, variables: { ids: [...] } });
const modelUrl = `/assets/${assets[0].source}`;

// NEW: Direct access to Asset objects
const mlModelAssets = this.companyService.mlModelAssets();
const modelUrl = `/assets/${mlModelAssets.mlModelJsonAsset.source}`;
```

#### 5. Proxy URL Handling

The refactoring maintains compatibility with the existing proxy setup:

```typescript
// Helper function for proxy-compatible URLs
const toProxyUrl = (source: string): string => {
  if (source.startsWith("http://") || source.startsWith("https://")) {
    const url = new URL(source);
    return url.pathname; // Extract path for proxy compatibility
  }
  return `/assets/${source}`;
};
```

### Testing Strategy

#### 1. Backend Testing

```bash
# Run the migration
npm run migration:run

# Verify database schema
psql -d dukahub -c "\d channel"

# Test Asset relationships
npm run test:integration
```

#### 2. Frontend Testing

```bash
# Regenerate GraphQL types
npm run codegen

# Test channel data loading
npm run test:e2e -- --spec="channel-assets.spec.ts"

# Verify ML model loading
npm run test:e2e -- --spec="ml-model.spec.ts"
```

#### 3. Integration Testing

- **Channel switching**: Verify assets load correctly when switching channels
- **Asset updates**: Test updating channel assets through admin UI
- **Error handling**: Test behavior when assets are deleted
- **Performance**: Measure query performance improvements

### Deployment Steps

#### 1. Backend Deployment

```bash
# 1. Deploy backend with new migration
docker-compose up -d backend

# 2. Verify migration completed successfully
docker-compose logs backend | grep "ConvertChannelAssetFieldsToRelationships"

# 3. Test API endpoints
curl -X POST http://localhost:3000/admin-api \
  -H "Content-Type: application/json" \
  -d '{"query": "{ activeChannel { customFields { mlModelJsonAsset { id source } } } }"}'
```

#### 2. Frontend Deployment

```bash
# 1. Regenerate GraphQL types
npm run codegen

# 2. Build and deploy frontend
npm run build
docker-compose up -d frontend

# 3. Verify asset loading
curl http://localhost:4200/api/health
```

#### 3. Data Verification

```sql
-- Verify Asset relationships are properly set
SELECT
  c.id,
  c.code,
  c."customFieldsMlModelJsonAssetId",
  a1.source as model_source,
  c."customFieldsCompanyLogoAssetId",
  a2.source as logo_source
FROM channel c
LEFT JOIN asset a1 ON c."customFieldsMlModelJsonAssetId" = a1.id
LEFT JOIN asset a2 ON c."customFieldsCompanyLogoAssetId" = a2.id;
```

### ⚠️ NO ROLLBACK SUPPORT

**This is a breaking change migration with no rollback capability.**

If issues arise after deployment:

1. **Database backup required**: Ensure full database backup before migration
2. **Manual recovery**: Restore from backup if needed
3. **No automatic rollback**: Migration will throw error if rollback attempted

### Monitoring

#### Key Metrics to Monitor

- **Query performance**: Measure channel data loading times
- **Error rates**: Monitor Asset relationship failures
- **Cache hit rates**: Verify asset source caching works
- **User experience**: Check ML model loading success rates

#### Alerts to Set Up

- Asset relationship constraint violations
- Channel data loading failures
- ML model asset resolution errors
- Proxy URL construction failures

### Future Enhancements

#### 1. Asset Caching

```typescript
// Implement asset source caching
private assetCache = new Map<string, Asset>();

readonly getCachedAsset = (assetId: string): Asset | null => {
  return this.assetCache.get(assetId) || null;
};
```

#### 2. Asset Validation

```typescript
// Add asset validation
private validateAsset(asset: Asset, expectedType: string): boolean {
  return asset.mimeType?.startsWith(expectedType) ?? false;
}
```

#### 3. Bulk Asset Operations

```typescript
// Support bulk asset updates
async updateChannelAssets(channelId: string, assets: Partial<ChannelAssets>): Promise<void> {
  // Implementation for bulk asset updates
}
```

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

## Product Creation Workflow

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

---

## Support

For issues or questions:

1. Check the Vendure documentation: https://docs.vendure.io
2. Review the migration logs for specific error messages
3. Ensure all dependencies are up to date
