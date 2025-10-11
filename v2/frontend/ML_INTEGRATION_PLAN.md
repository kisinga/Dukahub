# ML Model Integration Plan

## Current Architecture (v1)

### Photo Recognition

- **Level**: Product-level
- **Purpose**: Identify the product from pricing posters, symbols, or product packaging
- **Flow**:
  1. ML detects product from photo
  2. Returns product name or ID
  3. User selects specific variant/SKU
  4. Transaction recorded

### Barcode Recognition

- **Level**: SKU-level (variant-specific)
- **Purpose**: Direct SKU identification
- **Flow**:
  1. Scan barcode
  2. Instant SKU match
  3. Transaction recorded

### Rationale

**Product-level photos work best for:**

- ✅ Informal sector (identical packaging, different weights)
- ✅ Pricing posters (one poster = one product + all variants)
- ✅ Symbol-based businesses (logo/icon identifies product)
- ✅ Service businesses (haircut poster = haircut service)
- ✅ Simpler setup (one photo session per product)

**Barcodes stay SKU-specific because:**

- ✅ Each SKU has unique barcode
- ✅ Direct identification = fastest checkout
- ✅ Industry standard (every package has different barcode)

---

## Model Output Format

### Model v1 Output

```json
{
  "version": "1.0",
  "detected": {
    "type": "product",
    "productId": "product-123",
    "productName": "Rice",
    "confidence": 0.95
  }
}
```

**Flow:**

1. ML returns `productId` or `productName`
2. System looks up product
3. Shows variant selection UI
4. User picks SKU

---

## Future Enhancement (v2) - SKU-Specific Photos

### Toggle Feature

Add custom field: `useSkuSpecificPhotos: boolean`

When enabled:

- Each variant can have its own photos
- Useful for:
  - Clothing (different colors/sizes look different)
  - Different packaging designs
  - Visually distinct variants

### Model v2 Output

```json
{
  "version": "2.0",
  "detected": {
    "type": "sku",
    "productId": "product-123",
    "skuId": "sku-456",
    "sku": "RICE-1KG",
    "variantName": "One Kilogram",
    "confidence": 0.98
  }
}
```

**Flow:**

1. ML returns direct SKU
2. No variant selection needed
3. Instant transaction

---

## Backwards Compatibility Strategy

### Version Detection

Check `version` field in model output:

```typescript
interface MLModelOutput {
  version: string; // "1.0" or "2.0"
  detected: ProductDetection | SkuDetection;
}

// Handler
function handleDetection(output: MLModelOutput) {
  if (output.version === '1.0' || !output.version) {
    // Product-level detection (legacy)
    return handleProductDetection(output.detected);
  } else if (output.version === '2.0') {
    // SKU-level detection (new)
    return handleSkuDetection(output.detected);
  }
}
```

### Fallback Mapping

If model returns only `productName` (no ID):

```typescript
// Legacy models might only return product name
function resolveProduct(detection: any) {
  if (detection.productId) {
    return lookupById(detection.productId);
  } else if (detection.productName) {
    return lookupByName(detection.productName);
  } else if (detection.sku) {
    // v2 model - direct SKU
    return lookupBySku(detection.sku);
  }
}
```

### Database Schema

```typescript
interface Product {
  id: string;
  name: string;
  photos: string[]; // Product-level (default)
  useSkuSpecificPhotos?: boolean; // Future toggle
  variants: Variant[];
}

interface Variant {
  id: string;
  name: string;
  sku: string;
  photos?: string[]; // Optional (future)
}
```

---

## Model Training Data Structure

### Current (v1): Product-Level

```
dataset/
├── rice/
│   ├── poster_1.jpg  ← Pricing poster
│   ├── poster_2.jpg
│   ├── symbol.jpg    ← Product symbol/logo
│   └── metadata.json
│       {
│         "productId": "rice-001",
│         "productName": "Rice",
│         "variants": ["1kg", "2kg", "5kg"]
│       }
```

### Future (v2): SKU-Level

```
dataset/
├── rice-1kg/
│   ├── package_1.jpg  ← Specific 1kg bag
│   ├── package_2.jpg
│   └── metadata.json
│       {
│         "productId": "rice-001",
│         "skuId": "sku-rice-1kg",
│         "sku": "RICE-1KG",
│         "variantName": "One Kilogram"
│       }
```

---

## Migration Path

### Phase 1 (Current): Product-Level Only

- ✅ Photos at product level
- ✅ Barcodes at SKU level
- ✅ ML detects product → User selects variant

### Phase 2: Hybrid Support

- Add `useSkuSpecificPhotos` toggle in product settings
- If enabled, show photo upload per variant
- Model supports both v1 and v2 output

### Phase 3: Automatic Mode Detection

- System auto-detects if product needs SKU-specific photos
- Criteria:
  - Variants have visual differences (clothing, colors)
  - User uploads photos to multiple variants
  - Auto-enable SKU-specific mode

---

## Use Case Matrix

| Product Type                | Visual Variance | Best Approach      | Example                            |
| --------------------------- | --------------- | ------------------ | ---------------------------------- |
| Bulk goods (same packaging) | None            | Product-level      | Rice, Sugar (weight only differs)  |
| Pricing posters             | None            | Product-level      | Any product with price list poster |
| Services                    | None            | Product-level      | Haircut, Car wash                  |
| Clothing                    | High            | SKU-level (future) | T-shirts (colors/sizes)            |
| Different packages          | High            | SKU-level (future) | Gift boxes, bundles                |

---

## Notes

- Current implementation: **Product-level photos** (KISS)
- Barcode scanning: **SKU-specific** (already implemented)
- Future enhancement: **Optional SKU-specific photos** with toggle
- Model versioning: **Backwards compatible** via version field
