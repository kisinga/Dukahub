# Product Photo Strategy

## Current Implementation (v1)

### Photo Architecture

- **Photos**: Product-level
- **Barcodes**: SKU-level (variant-specific)

### Decision Rationale

#### Why Product-Level Photos?

**Target Users: Informal Sector Businesses**

1. **Identical Packaging**: Products often look the same (e.g., Rice 1kg vs 2kg - same bag, different weight sticker)
2. **Pricing Posters**: One poster shows product + all variants
3. **Symbol-Based**: Logo/icon represents the entire product
4. **Service Businesses**: Services have no visual variance (e.g., Haircut poster)
5. **Setup Simplicity**: One photo session per product (not per SKU)

#### Why SKU-Level Barcodes?

**Industry Standard:**

1. Each package has unique barcode
2. Direct SKU identification
3. Fastest checkout method
4. Critical for inventory accuracy

### User Flow

#### POS Flow (Product Photos + SKU Barcodes):

**Scenario 1: Barcode Available (Fastest)**

```
1. Scan barcode → Direct SKU match
2. "Rice 1kg - $5" appears
3. Add to cart ✓
```

**Scenario 2: Photo Recognition (When No Barcode)**

```
1. Take photo of pricing poster
2. ML detects "Rice"
3. System shows variants: [1kg $5] [2kg $9] [5kg $20]
4. User taps "1kg"
5. Add to cart ✓
```

**Scenario 3: Manual Entry (Fallback)**

```
1. Type/search "Rice"
2. Select variant
3. Add to cart ✓
```

### Pricing Poster Workflow

**Recommended Setup:**
Every product should have pricing poster photo showing:

```
┌─────────────────────────┐
│  🌾 RICE               │  ← Product symbol
│  ─────────────────────  │
│  500g  - $2.50         │  ← Variants visible
│  1kg   - $5.00         │
│  2kg   - $9.00         │
│  5kg   - $20.00        │
│  ─────────────────────  │
│  [Product Logo/Photo]  │  ← Visual identifier
└─────────────────────────┘
```

**Benefits:**

- One photo contains all information
- Easy product browsing in app
- Customer-facing poster = training data
- Multi-variant detection possible (future)

---

## Future Enhancement (v2) - SKU-Specific Photos

### When to Enable

**Add Toggle**: `useSkuSpecificPhotos: boolean`

**Use SKU-specific photos when:**

- ✅ Visually distinct variants (clothing colors/sizes)
- ✅ Different packaging designs per variant
- ✅ Formal retail with professional product photography
- ✅ High-value items needing precise visual matching

**Keep product-level photos when:**

- ✅ Identical packaging (bulk goods)
- ✅ Weight-only differences
- ✅ Pricing posters
- ✅ Services
- ✅ Informal sector businesses

### Implementation Plan

```typescript
interface Product {
  id: string;
  name: string;
  photos: string[]; // Always product-level
  useSkuSpecificPhotos?: boolean; // Future toggle
  variants: Variant[];
}

interface Variant {
  id: string;
  name: string;
  sku: string;
  photos?: string[]; // Only if useSkuSpecificPhotos = true
}
```

### UI Changes (When Toggle Enabled)

```
Product Form:
  ├─ Product Info
  ├─ Product Photos ← General product images
  └─ Variants
      ├─ Variant 1
      │   ├─ Name, SKU, Price, Stock
      │   └─ Photos ← Specific to this variant (if toggle on)
      └─ Variant 2
          └─ Photos ← Specific to this variant (if toggle on)
```

---

## Model Integration

### Current Model Output (v1)

```json
{
  "version": "1.0",
  "detected": {
    "type": "product",
    "productId": "rice-001",
    "productName": "Rice",
    "confidence": 0.95
  }
}
```

**System Response:**

1. Look up product by `productId` or `productName`
2. Load variants
3. Show variant selection UI
4. User selects SKU

### Future Model Output (v2) - With SKU Detection

```json
{
  "version": "2.0",
  "detected": {
    "type": "sku",
    "productId": "rice-001",
    "skuId": "variant-rice-1kg",
    "sku": "RICE-1KG",
    "variantName": "One Kilogram",
    "confidence": 0.98
  }
}
```

**System Response:**

1. Direct SKU match
2. No variant selection needed
3. Instant add to cart

### Backwards Compatibility

```typescript
/**
 * Handle ML model output with version detection
 */
function handleMLDetection(output: MLOutput) {
  const version = output.version || '1.0'; // Default to v1 for legacy

  switch (version) {
    case '1.0':
      // Product-level detection
      if (output.detected.productId) {
        return loadProductById(output.detected.productId);
      } else if (output.detected.productName) {
        return loadProductByName(output.detected.productName);
      }
      break;

    case '2.0':
      // SKU-level detection
      if (output.detected.sku) {
        return loadBySku(output.detected.sku);
      } else if (output.detected.skuId) {
        return loadBySkuId(output.detected.skuId);
      }
      // Fallback to product-level
      return loadProductById(output.detected.productId);
      break;

    default:
      console.warn(`Unknown model version: ${version}`);
      // Attempt product-level detection as safest fallback
      return loadProductById(output.detected.productId);
  }
}
```

---

## Storage Strategy

### Product Photos

- **Purpose**: ML training data for product recognition
- **Format**: Base64 or URL
- **Recommended**: JPEG/WebP, max 1MB each
- **Ideal Count**: 2-5 photos per product
  - Pricing poster (front-facing)
  - Product packaging (if applicable)
  - Symbol/logo close-up
  - Alternative angles

### SKU Barcodes

- **Storage**: String (SKU field)
- **Scanning**: Real-time via camera
- **Validation**: Check for duplicates

---

## Key Insights

### For Informal Sector

1. **Pricing posters are gold** - One photo = complete product info
2. **Products are unique** - Each business has custom pricing
3. **Simplicity wins** - Minimize setup burden
4. **Symbols work** - Logo/icon recognition is sufficient

### For Service Businesses

1. **No physical products** - Logo/poster is the "product"
2. **Variant selection is fine** - Services are chosen, not scanned
3. **Photo once, use forever** - Service offerings rarely change visually

### Barcode Supremacy

- Barcode scanning remains the **fastest, most accurate** method
- Photos are **convenience/backup** when barcodes unavailable
- Manual entry is **final fallback**

---

## Migration Notes

**Current State:**

- ✅ Photos: Product-level
- ✅ Barcodes: SKU-level
- ✅ Clean separation of concerns

**Future Toggle:**

- Will add `useSkuSpecificPhotos` boolean to Product model
- When enabled, show photo upload per variant
- Default: OFF (keeps current behavior)

**No Breaking Changes:**

- Existing products continue with product-level photos
- New products can opt-in to SKU-specific photos
- Model versioning ensures compatibility
