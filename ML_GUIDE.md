# AI Product Recognition - Implementation Guide

## Overview

AI-powered product recognition for point-of-sale. The system identifies products from photos and returns product IDs for quick checkout.

**Key Principles:**

- Store models as static files (no database overhead)
- Product-level detection (not SKU-level)
- Public model files are safe (only product IDs, no pricing/business data)
- IndexedDB caching for offline support

## Architecture

### Storage Structure

```
backend/static/assets/ml-models/
├── {channelId}/
│   ├── latest/
│   │   ├── model.json       # TensorFlow.js architecture (~50 KB)
│   │   ├── weights.bin      # Model weights (2-5 MB)
│   │   └── metadata.json    # Training info & labels (~1 KB)
│   └── temp/                # Atomic write staging
```

### Public URLs

Models served via Vendure's AssetServerPlugin:

```
https://yourdomain.com/assets/ml-models/{channelId}/latest/model.json
https://yourdomain.com/assets/ml-models/{channelId}/latest/weights.bin
https://yourdomain.com/assets/ml-models/{channelId}/latest/metadata.json
```

### metadata.json Format

```json
{
  "version": "1.0.0",
  "trainedAt": "2025-10-10T14:30:00Z",
  "channelId": "T_1",
  "productCount": 47,
  "imageCount": 156,
  "trainingDuration": 127,
  "labels": ["product-id-1", "product-id-2", "..."],
  "imageSize": 224,
  "modelType": "mobilenet"
}
```

## Detection Flow

### Product-Level Recognition

**Why product-level?**

- Works for informal sector (identical packaging, different weights)
- Pricing posters (one poster = one product + all variants)
- Symbol-based businesses (logo identifies product)
- Simpler setup (one photo session per product)

**Flow:**

1. User takes photo (poster, packaging, symbol)
2. ML detects product → returns `productId`
3. Frontend shows variant selection UI
4. User picks specific SKU (e.g., 1kg vs 2kg)
5. Transaction recorded

### Barcode Scanning

**Why SKU-level for barcodes?**

- Each SKU has unique barcode
- Direct identification = fastest checkout
- Industry standard

**Flow:**

1. Scan barcode
2. Instant SKU match (no variant selection)
3. Transaction recorded

### Model Output Format

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

## Frontend Integration

### Model Sync Service

```typescript
class ModelSyncService {
  async initialize(channelId: string) {
    // 1. Check if model exists
    const modelExists = await this.checkModelExists(channelId);
    if (!modelExists) {
      console.log("No model available - show manual entry UI");
      return null;
    }

    // 2. Check if cached model is outdated
    const needsUpdate = await this.checkForModelUpdate(channelId);

    if (needsUpdate) {
      // 3. Download and cache new model
      await this.downloadAndCacheModel(channelId);
    }

    // 4. Load from IndexedDB
    return await this.loadModelFromCache();
  }

  private async downloadAndCacheModel(channelId: string) {
    const baseUrl = `/assets/ml-models/${channelId}/latest/`;

    // Download in parallel
    const [modelJson, weights, metadata] = await Promise.all([
      fetch(`${baseUrl}model.json`).then((r) => r.arrayBuffer()),
      fetch(`${baseUrl}weights.bin`).then((r) => r.arrayBuffer()),
      fetch(`${baseUrl}metadata.json`).then((r) => r.json()),
    ]);

    // Store in IndexedDB
    await this.saveToIndexedDB("modelJson", modelJson);
    await this.saveToIndexedDB("weights", weights);
    await this.saveToIndexedDB("metadata", metadata);
  }
}
```

### Cache Update Triggers

- On user login
- Every 30 minutes (background sync)
- Manual "Refresh Model" button in settings

### Offline Support

**Cached per channel:**

- Model files: ~5 MB (IndexedDB)
- Product catalog: ~3 MB (Apollo cache)
- Queued sales: ~1 MB (max 100 sales)

**Total:** ~10-15 MB per channel, persists across restarts.

## Backend Implementation

### Plugin Structure

```
backend/src/plugins/ai-model-management/
├── ai-model-management.plugin.ts
├── services/
│   ├── model-training.service.ts    # Training logic
│   └── model-storage.service.ts     # File operations
├── api/
│   ├── model-admin.resolver.ts      # GraphQL mutations
│   └── model.types.ts
└── jobs/
    └── train-model.job.ts           # Background training
```

### Atomic Write Pattern

Prevents corruption if training crashes:

```typescript
async saveModel(channelId: string, modelFiles: ModelFiles) {
  const tempPath = `ml-models/${channelId}/temp/`;
  const latestPath = `ml-models/${channelId}/latest/`;

  // 1. Write to temp directory
  await fs.writeFile(`${tempPath}/model.json`, modelFiles.architecture);
  await fs.writeFile(`${tempPath}/weights.bin`, modelFiles.weights);
  await fs.writeFile(`${tempPath}/metadata.json`, modelFiles.metadata);

  // 2. Validate all files
  const valid = await this.validateModelFiles(tempPath);
  if (!valid) throw new Error('Model validation failed');

  // 3. Atomic move (overwrites previous version)
  await fs.rename(tempPath, latestPath, { overwrite: true });
}
```

### Training Trigger (MVP)

**Manual only:**

1. Admin clicks "Train AI Model" in channel settings
2. Backend queues training job
3. Job fetches all product images for channel
4. Trains TensorFlow.js model
5. Saves to temp → validates → moves to latest
6. Admin sees success notification

## Training Options

### Option 1: Teachable Machine API (Recommended for MVP)

**Pros:**

- No ML expertise needed
- Hosted training (no GPU)
- Proven TensorFlow.js output

**Cons:**

- Requires internet
- Limited customization

**Use for:** MVP launch

### Option 2: TensorFlow.js Node

**Pros:**

- Full control
- No external dependencies

**Cons:**

- Requires ML knowledge
- Slow on CPU

**Use for:** Post-MVP optimization

### Option 3: Python Microservice

**Pros:**

- Full ecosystem
- GPU acceleration

**Cons:**

- Additional service
- Deployment complexity

**Use for:** Enterprise (>5000 products)

## Edge Cases

### No Model Exists (New Channel)

**Frontend:** Check if metadata.json returns 404

- Show: "Camera recognition not set up. Add products with images first."
- Fallback: Manual product entry (barcode/search)

### Training In Progress

**Frontend:** Continue using cached previous model until new one fully available

- Only replace when all 3 files exist AND `metadata.trainedAt` is newer

### Invalid Product ID Returned

**Backend:** Validates product exists and belongs to channel during sale completion

```typescript
async addItemToOrder(productId: string, ctx: RequestContext) {
  // Vendure auto-validates channel scope
  const product = await this.productService.findOne(ctx, productId);
  if (!product) throw new UserInputError('Product not found');
  return this.orderService.addItemToOrder(ctx, productId, quantity);
}
```

### Concurrent Training Requests

**Solution:** Vendure's job queue serializes requests automatically (no extra locking needed)

### Orphaned Model Files (Channel Deleted)

**Accepted for MVP:**

- ~5 MB per deleted channel
- 1000 deleted channels = ~5 GB = $0.10/month storage cost
- Future: Weekly cleanup job

## Implementation Checklist

### Backend

- [ ] Install `@tensorflow/tfjs-node` or Teachable Machine API client
- [ ] Create plugin directory structure
- [ ] Implement `ModelTrainingService`
  - [ ] Fetch product images from database
  - [ ] Train MobileNet model
  - [ ] Generate metadata.json
- [ ] Implement `ModelStorageService`
  - [ ] Atomic write (temp → latest)
  - [ ] File validation
- [ ] Create GraphQL mutation `trainModelForChannel`
- [ ] Add training job to Vendure job queue
- [ ] Test end-to-end training flow

### Frontend

- [ ] Create `ModelSyncService`
  - [ ] Model existence check (metadata.json 404 handling)
  - [ ] Download and cache to IndexedDB
  - [ ] Load from cache
  - [ ] Timestamp-based update check
- [ ] Add camera/image recognition component in POS
- [ ] Integrate TensorFlow.js inference
- [ ] Handle missing model gracefully (show manual entry UI)
- [ ] Add "Train AI Model" button in channel settings
- [ ] Show training status indicator
- [ ] Test offline mode with cached model

### Testing

- [ ] New channel (no model exists)
- [ ] Model training flow (manual trigger)
- [ ] Cache invalidation (timestamp check)
- [ ] Incomplete training (crash recovery via atomic writes)
- [ ] Concurrent training requests (queue serialization)
- [ ] Offline recognition (IndexedDB cache)
- [ ] Cross-channel isolation (product ID validation)

## Training Data Structure

### Current: Product-Level

```
dataset/
├── rice/
│   ├── poster_1.jpg      # Pricing poster
│   ├── poster_2.jpg
│   ├── symbol.jpg        # Product logo
│   └── metadata.json
│       {
│         "productId": "rice-001",
│         "productName": "Rice",
│         "variants": ["1kg", "2kg", "5kg"]
│       }
```

### Use Case Matrix

| Product Type                | Best Approach | Example                      |
| --------------------------- | ------------- | ---------------------------- |
| Bulk goods (same packaging) | Product-level | Rice, Sugar (weight differs) |
| Pricing posters             | Product-level | Any price list poster        |
| Services                    | Product-level | Haircut, Car wash            |
| Clothing                    | Future        | T-shirts (colors/sizes)      |
| Gift boxes/bundles          | Future        | Visually distinct variants   |

## Security Notes

**Why public models are safe:**

- Models only return product IDs (immutable, not sensitive)
- Product IDs are channel-scoped (meaningless across channels)
- Product images already public (visible in POS)
- Authentication at API level (sales validate channel access)
- No business secrets (prices, margins, inventory NOT in model)

**What model knows:** "This image looks like product ID XYZ"  
**What model DOESN'T know:** Prices, costs, inventory, customer data, sales history

## Future Enhancements

### Database Integration

Add `ml_models` table for:

- Training history queries
- Performance tracking over time
- A/B testing model versions

### Versioned Storage

```
ml-models/{channelId}/
├── v1.0.0/
├── v1.1.0/
└── latest → v1.1.0 (symlink)
```

Benefits: Rollback capability, version comparison

### Auto-Training

Triggers:

- Product added with images
- Product images changed
- Product deleted
- Debounced by 5 minutes
- Daily fallback at 2 AM

### SKU-Specific Photos (Phase 2)

For products with visual variance (clothing, colors):

- Add `useSkuSpecificPhotos: boolean` toggle
- Each variant can have own photos
- Model returns `skuId` directly (no variant selection needed)

### Performance Tracking

Store metrics:

- Model accuracy in production
- Average confidence scores
- Manual corrections needed
- Auto-retrain when accuracy drops

---

**Status:** MVP - Ready for Implementation  
**Last Updated:** October 2025  
**Next Review:** After first 50 channels onboarded
