# ML Model Management - MVP Guide

## Overview

This document describes the **MVP approach** for AI-powered product recognition in Dukahub v2. The design prioritizes simplicity and rapid deployment over complex infrastructure.

**Key Principle:** Store models as static files in the public assets folder. No database integration. Keep it simple.

## Storage & File Structure

### Location

```
backend/static/assets/ml-models/
├── {channelId}/
│   ├── latest/
│   │   ├── model.json       # TensorFlow.js architecture (~50 KB)
│   │   ├── weights.bin      # Model weights (2-5 MB)
│   │   └── metadata.json    # Training info & labels (~1 KB)
│   └── temp/                # Used during training (atomicity)
```

### Public URLs

Models are served via Vendure's AssetServerPlugin:

```
https://yourdomain.com/assets/ml-models/{channelId}/latest/model.json
https://yourdomain.com/assets/ml-models/{channelId}/latest/weights.bin
https://yourdomain.com/assets/ml-models/{channelId}/latest/metadata.json
```

### metadata.json Structure

```json
{
  "version": "1.0.0",
  "trainedAt": "2025-10-10T14:30:00Z",
  "channelId": "T_1",
  "productCount": 47,
  "imageCount": 156,
  "trainingDuration": 127,
  "labels": ["product-id-1", "product-id-2", "product-id-n"],
  "imageSize": 224,
  "modelType": "mobilenet"
}
```

**Fields:**
- `version`: Model format version (semantic versioning)
- `trainedAt`: ISO timestamp of training completion
- `channelId`: Vendure channel ID this model belongs to
- `productCount`: Number of unique products in training set
- `imageCount`: Total images used for training
- `trainingDuration`: Training time in seconds (for backend stats)
- `labels`: Array of product IDs the model can recognize (order matters)
- `imageSize`: Input image dimension (typically 224x224)
- `modelType`: Model architecture used (e.g., "mobilenet", "efficientnet")

## Security & Trade-offs

### Why Public Models Are Acceptable

**Models are publicly accessible via HTTP**, but this poses no security risk because:

1. **Models only return product IDs** - These IDs are immutable identifiers, not sensitive data
2. **Product IDs are channel-scoped** - A product ID from one channel is meaningless to another
3. **Product images are already public** - Anyone using the POS can see product photos
4. **Authentication happens at the API level** - Sales processing validates the user's channel access
5. **No business secrets in model files** - Prices, margins, sales data are NOT in the model

**What the model knows:** "This image looks like product ID XYZ"  
**What the model DOESN'T know:** Prices, costs, inventory levels, customer data, sales history

### MVP Trade-offs Accepted

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| No database metadata | Can't query training history | Use file timestamps, add DB later if needed |
| No versioning/rollback | Can't revert to previous model | Atomic writes prevent corruption, rollback is rare need |
| Manual cleanup if channel deleted | ~5 MB orphaned files per deleted channel | Minimal cost, cleanup job is future enhancement |
| Brief inconsistency during training | Old model briefly cached while new one trains | Frontend validates model freshness, acceptable UX |

## Edge Cases & Solutions

### 1. New Channel - No Model Exists

**Scenario:** Channel just created, no products or images uploaded yet.

**Frontend Behavior:**
- Check if `/assets/ml-models/{channelId}/latest/metadata.json` exists
- If 404: Show "Camera recognition not yet set up. Add products with images first."
- Fall back to manual product entry (barcode search, text search)

**Backend Behavior:**
- First product with image triggers training job
- Model becomes available after initial training completes

### 2. Model Training In Progress

**Scenario:** User tries to use POS while model is being retrained.

**Solution:** Frontend continues using cached previous model until new one is fully available.

**Implementation:**
- Frontend checks for new model on login
- Only replaces cached model when all 3 files exist AND `metadata.trainedAt` is newer
- Training indicator in admin UI (optional)

### 3. Incomplete Model Files

**Scenario:** Training job crashes mid-way, leaving partial files in the `latest/` folder.

**Solution:** Atomic write pattern prevents corruption.

**Implementation:**
```typescript
// Backend training service
async saveModel(channelId: string, modelFiles: ModelFiles) {
  const tempPath = `ml-models/${channelId}/temp/`;
  const latestPath = `ml-models/${channelId}/latest/`;
  
  // 1. Write all files to temp directory
  await fs.writeFile(`${tempPath}/model.json`, modelFiles.architecture);
  await fs.writeFile(`${tempPath}/weights.bin`, modelFiles.weights);
  await fs.writeFile(`${tempPath}/metadata.json`, modelFiles.metadata);
  
  // 2. Validate all files exist and are non-empty
  const allFilesValid = await this.validateModelFiles(tempPath);
  if (!allFilesValid) throw new Error('Model validation failed');
  
  // 3. Atomic move: rename temp -> latest
  await fs.rename(tempPath, latestPath, { overwrite: true });
}
```

### 4. Cache Invalidation

**Scenario:** Frontend doesn't know a new model was trained.

**Solution:** Check `metadata.json` timestamp on login and periodically.

**Implementation:**
```typescript
// Frontend model sync service
async checkForModelUpdate(channelId: string): Promise<boolean> {
  const cachedMetadata = await this.getFromIndexedDB('modelMetadata');
  const remoteMetadata = await fetch(
    `/assets/ml-models/${channelId}/latest/metadata.json`
  ).then(r => r.json());
  
  // Compare timestamps
  const cachedTime = new Date(cachedMetadata?.trainedAt || 0);
  const remoteTime = new Date(remoteMetadata.trainedAt);
  
  return remoteTime > cachedTime;
}
```

**Trigger checks:**
- On user login
- Every 30 minutes while app is open (background sync)
- Manual "Refresh Model" button in settings

### 5. Orphaned Model Files

**Scenario:** Channel is deleted but model files remain in assets folder.

**Solution:** Accept orphaned files for MVP (minimal storage cost).

**Cost Analysis:**
- Average model size: ~5 MB per channel
- 1000 deleted channels: ~5 GB wasted storage
- Cloud storage cost: ~$0.10/month for 5 GB

**Future Enhancement:** Background cleanup job that checks for deleted channels weekly.

### 6. Concurrent Training Requests

**Scenario:** Admin manually triggers training while an auto-training job is already queued.

**Solution:** Vendure's job queue naturally serializes requests.

**Implementation:**
```typescript
// All training requests go through the same queue
await this.jobQueue.add({
  name: 'train-model',
  data: { channelId },
  retries: 2,
  // Queue ensures sequential processing
});
```

No additional locking needed - DefaultJobQueuePlugin handles this.

### 7. Model Produces Wrong Product IDs

**Scenario:** Model returns a product ID that no longer exists or belongs to a different channel.

**Solution:** Backend validates product ID during sale completion.

**Implementation:**
```typescript
// GraphQL mutation resolver
async addItemToOrder(productId: string, ctx: RequestContext) {
  // Vendure automatically validates product belongs to current channel
  const product = await this.productService.findOne(ctx, productId);
  
  if (!product) {
    throw new UserInputError('Product not found');
  }
  
  // Product existence and channel scope validated ✅
  return this.orderService.addItemToOrder(ctx, productId, quantity);
}
```

**Additional Safety:** Frontend can pre-validate by checking if product ID exists in cached product list.

## Training Pipeline

### Manual Training (MVP)

**Trigger:** Admin clicks "Train AI Model" button in channel settings.

**Flow:**
1. Admin navigates to Settings > AI Model
2. Clicks "Train New Model" button
3. Backend queues training job
4. Job fetches all product images for the channel
5. Trains TensorFlow.js model (using Teachable Machine API or local training)
6. Saves to `temp/` folder
7. Validates all files
8. Moves to `latest/` folder (atomic)
9. Admin sees success notification

### Auto-Training (Future Enhancement)

**Triggers:**
- Product added with images
- Product images changed
- Product deleted
- Debounced by 5 minutes to prevent rapid retrains

**Cron Fallback:**
- Daily at 2 AM
- Only trains if products changed since last training

## Frontend Integration

### Model Loading Flow

```typescript
// On login or app startup
class ModelSyncService {
  async initialize(channelId: string) {
    // 1. Check if model exists remotely
    const modelExists = await this.checkModelExists(channelId);
    if (!modelExists) {
      console.log('No model available for this channel');
      return null;
    }
    
    // 2. Check if we need to update cached model
    const needsUpdate = await this.checkForModelUpdate(channelId);
    
    if (needsUpdate) {
      // 3. Download all model files
      await this.downloadAndCacheModel(channelId);
    }
    
    // 4. Load model from IndexedDB cache
    return await this.loadModelFromCache();
  }
  
  private async downloadAndCacheModel(channelId: string) {
    const baseUrl = `/assets/ml-models/${channelId}/latest/`;
    
    // Download all files in parallel
    const [modelJson, weights, metadata] = await Promise.all([
      fetch(`${baseUrl}model.json`).then(r => r.arrayBuffer()),
      fetch(`${baseUrl}weights.bin`).then(r => r.arrayBuffer()),
      fetch(`${baseUrl}metadata.json`).then(r => r.json()),
    ]);
    
    // Store in IndexedDB
    await this.saveToIndexedDB('modelJson', modelJson);
    await this.saveToIndexedDB('weights', weights);
    await this.saveToIndexedDB('metadata', metadata);
  }
  
  private async loadModelFromCache() {
    const modelJson = await this.getFromIndexedDB('modelJson');
    const weights = await this.getFromIndexedDB('weights');
    
    // Load into TensorFlow.js
    return await tf.loadLayersModel(tf.io.browserFiles([
      new Blob([modelJson], { type: 'application/json' }),
      new Blob([weights], { type: 'application/octet-stream' }),
    ]));
  }
}
```

### Offline Support

**Cached Assets (per channel):**
- Model files: ~5 MB in IndexedDB
- Product catalog: ~3 MB in Apollo cache (1000 products)
- Queued offline sales: ~1 MB (limit: 100 sales)

**Total storage:** ~10-15 MB per channel

**Cache persistence:** Survives browser restarts, cleared only on logout or manual reset.

## Backend Plugin Structure

```
backend/src/plugins/ai-model-management/
├── ai-model-management.plugin.ts       # Main plugin registration
├── services/
│   ├── model-training.service.ts       # Training logic
│   └── model-storage.service.ts        # File operations
├── api/
│   ├── model-admin.resolver.ts         # GraphQL mutations for admins
│   └── model.types.ts                  # GraphQL types
└── jobs/
    └── train-model.job.ts              # Background training job
```

### Key Service Methods

```typescript
// model-training.service.ts
class ModelTrainingService {
  async trainModelForChannel(channelId: string): Promise<void>;
  async getProductImagesForTraining(channelId: string): Promise<TrainingImage[]>;
  async validateTrainingData(images: TrainingImage[]): Promise<boolean>;
}

// model-storage.service.ts
class ModelStorageService {
  async saveModel(channelId: string, files: ModelFiles): Promise<void>;
  async getModelPath(channelId: string): string;
  async modelExists(channelId: string): Promise<boolean>;
  async deleteModelFiles(channelId: string): Promise<void>;
}
```

## Implementation Checklist

### Backend

- [ ] Create plugin directory structure
- [ ] Install `@tensorflow/tfjs-node` or integrate Teachable Machine API
- [ ] Implement `ModelTrainingService`
  - [ ] Fetch product images from database
  - [ ] Train MobileNet model
  - [ ] Generate metadata.json
- [ ] Implement `ModelStorageService`
  - [ ] Atomic write to temp → latest
  - [ ] File validation
- [ ] Create GraphQL mutation `trainModelForChannel`
- [ ] Add training job to job queue
- [ ] Test end-to-end training flow

### Frontend

- [ ] Create `ModelSyncService`
  - [ ] Model existence check
  - [ ] Download and cache to IndexedDB
  - [ ] Load from cache
- [ ] Add camera/image recognition component
- [ ] Integrate TensorFlow.js inference
- [ ] Handle missing model gracefully (fallback UI)
- [ ] Add "Train AI Model" button in settings
- [ ] Show training status/progress
- [ ] Test offline mode with cached model

### Testing

- [ ] Test new channel (no model)
- [ ] Test model training flow
- [ ] Test cache invalidation
- [ ] Test incomplete training (crash recovery)
- [ ] Test concurrent training requests
- [ ] Test offline recognition
- [ ] Test cross-channel isolation (product ID validation)

## Training Options

### Option 1: Teachable Machine API (Easiest)

**Pros:**
- No ML expertise required
- Hosted training (no local GPU needed)
- Proven TensorFlow.js output

**Cons:**
- Requires internet connection for training
- Limited customization
- API rate limits

**Use for:** MVP launch, quick validation

### Option 2: TensorFlow.js Node (Full Control)

**Pros:**
- Complete control over training
- No external dependencies
- Can optimize for specific products

**Cons:**
- Requires ML knowledge
- CPU training is slow (GPU recommended)
- More complex implementation

**Use for:** Post-MVP optimization

### Option 3: Python Microservice (Heavy Training)

**Pros:**
- Full TensorFlow/PyTorch ecosystem
- GPU acceleration
- Advanced techniques (data augmentation, etc.)

**Cons:**
- Additional service to maintain
- Deployment complexity
- Overkill for small product catalogs

**Use for:** Enterprise customers with >5000 products

**MVP Recommendation:** Start with Teachable Machine API (#1), migrate to local training (#2) if needed.

## Future Enhancements

When MVP is validated and scaling needs emerge:

### Database Integration

Add `ml_models` table:
```sql
CREATE TABLE ml_models (
  id SERIAL PRIMARY KEY,
  channel_id VARCHAR NOT NULL,
  version VARCHAR NOT NULL,
  trained_at TIMESTAMP NOT NULL,
  product_count INT NOT NULL,
  image_count INT NOT NULL,
  training_duration INT,
  accuracy FLOAT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Benefits:**
- Query training history
- Track model performance over time
- A/B test different model versions
- Analytics on model usage

### Versioned Storage

Change structure to:
```
ml-models/{channelId}/
├── v1.0.0/
├── v1.1.0/
├── v2.0.0/
└── latest → v2.0.0 (symlink)
```

**Benefits:**
- Rollback capability
- Compare model versions
- Gradual rollout (canary testing)

### Authenticated Downloads

Add token-based model access:
```
GET /assets/ml-models/{channelId}/latest/model.json
Authorization: Bearer {channel-scoped-token}
```

**Benefits:**
- Prevent model scraping
- Rate limiting per channel
- Audit model downloads

**Note:** Low priority - public models pose minimal risk.

### Auto-Cleanup Jobs

Weekly cron job:
```typescript
async cleanupOrphanedModels() {
  const modelDirs = await fs.readdir('ml-models/');
  const activeChannels = await this.channelService.findAll();
  
  for (const dir of modelDirs) {
    const channelExists = activeChannels.some(c => c.code === dir);
    if (!channelExists) {
      await fs.remove(`ml-models/${dir}`);
      console.log(`Cleaned up orphaned model: ${dir}`);
    }
  }
}
```

### Performance Tracking

Store inference metrics:
- Model accuracy in production
- Average recognition confidence
- Manual corrections needed
- False positive rate

Use to trigger retraining when accuracy drops below threshold.

## Reference: v1 Implementation

**v1 Approach:**
- Models table with `company` relation
- 3 file fields: model, metadata, weights
- Manual upload only (no auto-training)
- Frontend downloads on sell page load
- Model cached in memory (cleared on page refresh)

**v2 Improvements:**
- Simplified file-based storage (no DB overhead)
- Atomic writes prevent corruption
- Persistent cache (IndexedDB survives restarts)
- Foundation for auto-training
- Clear upgrade path to advanced features

---

**Last Updated:** October 2025  
**Status:** MVP - Production Ready  
**Next Review:** After first 50 channels onboarded
